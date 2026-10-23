const assert = require('node:assert/strict');
const { test } = require('node:test');

const { scopeToNamespace, rawFirestore, relativePath } = require('../config/tenantFirestore');
const { migrate } = require('../scripts/migrateToNamespace');

// Minimal in-memory Firestore: just the surface the wrapper and the migration use.
function fakeFirestore() {
  const docs = new Map(); // full path -> data

  const colRef = (path) => ({
    path,
    id: path.split('/').pop(),
    doc: (id) => docRef(`${path}/${id}`),
    async listDocuments() {
      const ids = new Set();
      for (const p of docs.keys()) {
        if (p.startsWith(`${path}/`)) ids.add(p.slice(path.length + 1).split('/')[0]);
      }
      return [...ids].map((id) => docRef(`${path}/${id}`));
    },
  });

  const docRef = (path) => ({
    path,
    id: path.split('/').pop(),
    collection: (name) => colRef(`${path}/${name}`),
    async get() {
      return { exists: docs.has(path), id: this.id, ref: this, data: () => (docs.has(path) ? { ...docs.get(path) } : undefined) };
    },
    async set(data) { docs.set(path, { ...data }); },
    async update(patch) { docs.set(path, { ...docs.get(path), ...patch }); },
    async delete() { docs.delete(path); },
    async listCollections() {
      const names = new Set();
      for (const p of docs.keys()) {
        if (p.startsWith(`${path}/`)) names.add(p.slice(path.length + 1).split('/')[0]);
      }
      return [...names].map((n) => colRef(`${path}/${n}`));
    },
  });

  return { docs, collection: (name) => colRef(name), doc: (path) => docRef(path), runTransaction: async (fn) => fn() };
}

test('db.collection and db.doc land under <namespace>/main', async () => {
  const raw = fakeFirestore();
  const db = scopeToNamespace(raw, 'billing');

  await db.collection('owner').doc('o1').set({ name: 'Shop' });
  await db.collection('owner').doc('o1').collection('products').doc('p1').set({ sku: 'x' });
  await db.doc('plans/free').set({ price: 0 });

  assert.deepEqual([...raw.docs.keys()].sort(), [
    'billing/main/owner/o1',
    'billing/main/owner/o1/products/p1',
    'billing/main/plans/free',
  ]);
  assert.equal(db.namespaceRoot.path, 'billing/main');
  assert.equal(rawFirestore(db), raw);
});

test('collectionGroup is refused on the scoped db', () => {
  const db = scopeToNamespace(fakeFirestore(), 'billing');
  assert.throws(() => db.collectionGroup('subuser'), /not namespace-scoped/);
});

test('relativePath accepts new, legacy and already-relative paths', () => {
  assert.equal(relativePath('billing/main/owner/o1/credit_customers/c1', 'billing'), 'owner/o1/credit_customers/c1');
  assert.equal(relativePath('SwordNexBillingSoftware/t1/owner/o1/credit_customers/c1', 'billing'), 'owner/o1/credit_customers/c1');
  assert.equal(relativePath('owner/o1/credit_customers/c1', 'billing'), 'owner/o1/credit_customers/c1');
});

function seedLegacy(raw) {
  const L = 'SwordNexBillingSoftware/t1';
  raw.docs.set(`${L}/owner/o1`, { email: 'a@b.c' });
  raw.docs.set(`${L}/owner/o1/subuser/s1`, { email: 's@b.c' });
  raw.docs.set(`${L}/owner/o1/subuser/s1/subusercredit/c9`, { balance: 5 });
  raw.docs.set(`${L}/owner/o1/products/p1`, { name: 'Pen' });
  raw.docs.set(`${L}/owner/ghost/products/p2`, { name: 'No parent doc' }); // parent doc never written
  raw.docs.set(`${L}/plans/free`, { price: 0 });
  raw.docs.set(`${L}/payments/ord1`, { creditPath: `${L}/owner/o1/credit_customers/c1`, amount: 10 });
}

test('migration dry run writes nothing but counts', async () => {
  const raw = fakeFirestore();
  seedLegacy(raw);
  const before = raw.docs.size;
  const { tenantId, collections } = await migrate(raw, { namespace: 'billing' });
  assert.equal(tenantId, 't1');
  assert.equal(raw.docs.size, before);
  assert.equal(collections.owner.copied, 5); // o1, s1, c9, p1, plus p2 under the parent-less "ghost"
  assert.equal(collections.plans.copied, 1);
});

test('migration --apply copies everything, rewrites creditPath, and is re-runnable', async () => {
  const raw = fakeFirestore();
  seedLegacy(raw);
  await migrate(raw, { namespace: 'billing', apply: true });

  const N = 'billing/main';
  for (const p of ['owner/o1', 'owner/o1/subuser/s1', 'owner/o1/subuser/s1/subusercredit/c9', 'owner/o1/products/p1',
    'owner/ghost/products/p2', 'plans/free', 'payments/ord1']) {
    assert.ok(raw.docs.has(`${N}/${p}`), `missing ${p}`);
  }
  assert.equal(raw.docs.get(`${N}/payments/ord1`).creditPath, 'owner/o1/credit_customers/c1');
  assert.ok(raw.docs.has('SwordNexBillingSoftware/t1/owner/o1'), 'legacy left in place');

  // Data written by the live app after the move must not be overwritten by a second run.
  raw.docs.set(`${N}/plans/free`, { price: 99 });
  const again = await migrate(raw, { namespace: 'billing', apply: true });
  assert.equal(raw.docs.get(`${N}/plans/free`).price, 99);
  assert.equal(again.collections.plans.skipped, 1);
  assert.equal(again.collections.plans.copied, 0);
});

test('migration --only limits collections; --delete-legacy removes only confirmed copies', async () => {
  const raw = fakeFirestore();
  seedLegacy(raw);
  await migrate(raw, { namespace: 'billing', apply: true, only: ['plans'] });
  assert.ok(raw.docs.has('billing/main/plans/free'));
  assert.ok(!raw.docs.has('billing/main/owner/o1'));

  await migrate(raw, { namespace: 'billing', apply: true, deleteLegacy: true });
  assert.ok(![...raw.docs.keys()].some((p) => p.startsWith('SwordNexBillingSoftware/')), 'legacy cleared');
  assert.ok(raw.docs.has('billing/main/owner/o1/subuser/s1/subusercredit/c9'));
});

test('migration refuses to guess when several legacy tenants exist', async () => {
  const raw = fakeFirestore();
  raw.docs.set('SwordNexBillingSoftware/a/owner/o1', {});
  raw.docs.set('SwordNexBillingSoftware/b/owner/o2', {});
  await assert.rejects(migrate(raw, { namespace: 'billing' }), /Pass --tenant/);
});
