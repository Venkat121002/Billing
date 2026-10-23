/**
 * Wraps a Firestore instance so that every collection lives under the namespace:
 *
 *     db.collection('owner')  ->  <namespace>/main/owner
 *
 * Wrapping the one shared instance namespaces every read, write, transaction and batch in the
 * app without touching each call site. Anything that is not about collection paths
 * (runTransaction, batch, getAll, settings...) passes straight through to the real instance.
 */
const RAW = Symbol('rawFirestore');

function scopeToNamespace(firestore, namespace, rootDoc = 'main') {
  const base = firestore.collection(namespace).doc(rootDoc);
  return new Proxy(firestore, {
    get(target, prop) {
      if (prop === RAW) return target;
      if (prop === 'collection') return (name) => base.collection(name);
      if (prop === 'doc') return (path) => target.doc(`${namespace}/${rootDoc}/${path}`);
      // A collection-group query reads every collection with that name anywhere in the database,
      // which is exactly the cross-namespace read this wrapper exists to prevent. The few places
      // that need one use rawFirestore() and keep only paths under namespaceRoot.path.
      if (prop === 'collectionGroup') {
        return () => { throw new Error('collectionGroup() is not namespace-scoped; use rawFirestore() and filter by path'); };
      }
      if (prop === 'namespaceRoot') return base;
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/** The unwrapped Firestore (migration script and prefix-filtered collection-group queries only). */
const rawFirestore = (scoped) => scoped[RAW] || scoped;

/**
 * A full document path as the namespaced `db.doc()` expects it: relative to <namespace>/main/.
 * Paths saved before the namespace existed (SwordNexBillingSoftware/{tenant}/owner/...) are
 * accepted too, so a payment started before the move can still be settled.
 */
function relativePath(fullPath, namespace, rootDoc = 'main', legacyRoot = 'SwordNexBillingSoftware') {
  const p = String(fullPath || '');
  const current = `${namespace}/${rootDoc}/`;
  if (p.startsWith(current)) return p.slice(current.length);
  if (p.startsWith(`${legacyRoot}/`)) return p.split('/').slice(2).join('/');
  return p;
}

module.exports = { scopeToNamespace, rawFirestore, relativePath };
