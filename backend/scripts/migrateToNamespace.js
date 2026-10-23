/**
 * One-time move of Billing's Firestore data into the namespace:
 *
 *     SwordNexBillingSoftware/{TENANT_ID}/owner/abc/products/p1
 *       ->  billing/main/owner/abc/products/p1
 *
 * Every collection under the old tenant document is copied, sub-collections included
 * (owner -> subuser -> subusercredit, products, bills, plans, payments, supportRequests, platform,
 * otpVerifications ...). Payment documents also get their saved creditPath rewritten to the new
 * relative form.
 *
 * Safe by default:
 *   - With no flags it only COUNTS what would move (dry run).
 *   - --apply copies documents. Documents that already exist at the destination are left alone
 *     (add --overwrite to replace them). Nothing is deleted.
 *   - --delete-legacy removes an old document only after the copy is confirmed to exist at the
 *     destination. Run it separately, once you have checked the new data in the Firebase console.
 *
 * Usage (from backend/, with credentials for the project, e.g. GOOGLE_APPLICATION_CREDENTIALS):
 *   node scripts/migrateToNamespace.js --project=swordnex-sites                  # dry run
 *   node scripts/migrateToNamespace.js --project=swordnex-sites --apply          # copy
 *   node scripts/migrateToNamespace.js --project=swordnex-sites --delete-legacy  # after checking
 *   Options: --only=owner,plans    limit to some top-level collections
 *            --namespace=billing   override BILLING_NAMESPACE
 *            --tenant=<id>         the old {TENANT_ID} document (default: TENANT_ID env, else the only one found)
 *            --database=billing    the named Firestore database (default: BILLING_DB_ID, else "billing")
 *            --project=...         the Firebase project (REQUIRED)
 *
 * The script touches ONLY the one database named above.
 */
const { LEGACY_ROOT_COLLECTION, NAMESPACE_ROOT_DOC } = require('../config/tenant');
const { relativePath } = require('../config/tenantFirestore');

const PARALLEL = 20;

async function inChunks(items, fn) {
  for (let i = 0; i < items.length; i += PARALLEL) {
    await Promise.all(items.slice(i, i + PARALLEL).map(fn));
  }
}

/**
 * @param {object} firestore  an UNWRAPPED Firestore (the real database)
 * @param {object} opts       { namespace, tenantId, rootDoc, apply, overwrite, deleteLegacy, only, log }
 * @returns { collections: { [name]: { copied, skipped, deleted } } , tenantId }
 */
async function migrate(firestore, {
  namespace, tenantId, rootDoc = NAMESPACE_ROOT_DOC, apply = false, overwrite = false,
  deleteLegacy = false, only = null, log = () => {},
}) {
  const legacyParent = firestore.collection(LEGACY_ROOT_COLLECTION);
  if (!tenantId) {
    const found = (await legacyParent.listDocuments()).map((d) => d.id);
    if (found.length !== 1) {
      throw new Error(`Cannot tell which ${LEGACY_ROOT_COLLECTION} document to move (found: ${found.join(', ') || 'none'}). Pass --tenant=<id>.`);
    }
    tenantId = found[0];
  }
  const legacyRoot = legacyParent.doc(tenantId);
  const newRoot = firestore.collection(namespace).doc(rootDoc);

  const names = (await legacyRoot.listCollections()).map((c) => c.id);
  const wanted = only ? names.filter((n) => only.includes(n)) : names;
  const missing = (only || []).filter((n) => !names.includes(n));
  if (missing.length) log(`Not found under ${legacyRoot.path}: ${missing.join(', ')}`);

  const collections = {};
  const stat = (name) => (collections[name] = collections[name] || { copied: 0, skipped: 0, deleted: 0 });

  async function copyCollection(src, dst, top) {
    const refs = await src.listDocuments(); // includes "missing" parents that only hold sub-collections
    await inChunks(refs, async (srcRef) => {
      const dstRef = dst.doc(srcRef.id);
      const snap = await srcRef.get();
      const s = stat(top);
      if (snap.exists) {
        let data = snap.data();
        if (top === 'payments' && typeof data.creditPath === 'string') {
          data = { ...data, creditPath: relativePath(data.creditPath, namespace, rootDoc) };
        }
        const already = (await dstRef.get()).exists;
        if (already && !overwrite) {
          s.skipped += 1;
        } else {
          if (apply) await dstRef.set(data);
          s.copied += 1;
        }
      }
      for (const sub of await srcRef.listCollections()) {
        await copyCollection(sub, dstRef.collection(sub.id), top);
      }
      // Delete the old document only once its copy is confirmed (children were handled above).
      if (deleteLegacy && snap.exists) {
        if ((await dstRef.get()).exists) {
          await srcRef.delete();
          s.deleted += 1;
        } else {
          log(`KEPT ${srcRef.path}: no copy at ${dstRef.path}`);
        }
      }
    });
  }

  for (const name of wanted) {
    log(`${apply ? 'Copying' : 'Counting'} ${legacyRoot.path}/${name} ...`);
    await copyCollection(legacyRoot.collection(name), newRoot.collection(name), name);
  }
  return { tenantId, collections };
}

module.exports = { migrate };

// ---------------------------------------------------------------- CLI
if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // never .env.custom (local Mongo)
  const flags = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  }));
  if (!flags.project) {
    console.error('Pass --project=<firebase project id> so this cannot run against the wrong project.');
    process.exit(1);
  }
  process.env.FIREBASE_PROJECT_ID = String(flags.project);
  process.env.BILLING_DB_ID = String(flags.database || process.env.BILLING_DB_ID || 'billing');
  const { NAMESPACE } = require('../config/tenant');
  const { rawDb } = require('../config/firebase');

  const apply = !!flags.apply;
  const deleteLegacy = !!flags['delete-legacy'];
  const namespace = String(flags.namespace || NAMESPACE);
  console.log(`Project ${flags.project}, database ${process.env.BILLING_DB_ID}, namespace ${namespace}/${NAMESPACE_ROOT_DOC}`);
  console.log(deleteLegacy ? 'MODE: delete legacy (copies are verified first)' : apply ? 'MODE: apply (copy)' : 'MODE: dry run (nothing is written)');

  migrate(rawDb, {
    namespace,
    tenantId: flags.tenant ? String(flags.tenant) : process.env.TENANT_ID,
    apply: apply || deleteLegacy,
    overwrite: !!flags.overwrite,
    deleteLegacy,
    only: flags.only ? String(flags.only).split(',') : null,
    log: console.log,
  }).then(({ tenantId, collections }) => {
    console.log(`\nLegacy source: ${LEGACY_ROOT_COLLECTION}/${tenantId}`);
    for (const [name, s] of Object.entries(collections)) {
      console.log(`  ${name.padEnd(20)} ${apply || deleteLegacy ? 'copied' : 'would copy'} ${s.copied}, already there ${s.skipped}${deleteLegacy ? `, deleted ${s.deleted}` : ''}`);
    }
    process.exit(0);
  }).catch((err) => { console.error(err); process.exit(1); });
}
