/**
 * The namespace this deployment's Firestore data lives in - the same idea as Payroll's
 * SwordNexPayroll/main/<collection> and Meyyakutty's MeyyaKutty/main/<collection>.
 *
 * Several SwordNex apps share one Firebase project, so every Billing document is kept under
 *
 *     <BILLING_NAMESPACE> / main / <collection> / <document>
 *
 * (for example billing/main/owner/<ownerId>/products/<id>) instead of in top-level collections
 * another app could also use. This is an app/deployment namespace, not a store: stores are still
 * separated by owner id inside it. It is unrelated to TENANT_ID, the opaque value stamped on
 * MongoDB records.
 *
 * Only the Firestore (production) data store is namespaced. Local MongoDB development is unchanged.
 */
const NAMESPACE = String(process.env.BILLING_NAMESPACE || 'billing').trim();

// Firestore document that holds the namespace's collections as sub-collections.
const NAMESPACE_ROOT_DOC = 'main';

// Where the data lived before the namespace existed: SwordNexBillingSoftware/{TENANT_ID}/<collection>.
const LEGACY_ROOT_COLLECTION = 'SwordNexBillingSoftware';

if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,62}$/.test(NAMESPACE)) {
  throw new Error(`BILLING_NAMESPACE "${NAMESPACE}" is not a valid name (letters, numbers, - and _ only).`);
}

module.exports = { NAMESPACE, NAMESPACE_ROOT_DOC, LEGACY_ROOT_COLLECTION };
