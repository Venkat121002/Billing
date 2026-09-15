# Frontend Industry-Screen Duplication — Audit

**Date:** 2026-09-10
**Scope:** Every per-industry screen family in `frontend/src/industry/*` plus the
generic copies in `frontend/src/components/Billing/*`, the 8 `Industry*Router`
components, and how `industry` is resolved. Backend was checked for any
industry-specific logic.

**Bottom line:** the per-industry split is almost entirely accidental copy-paste,
not deliberate domain design. ~47,800 lines of industry screen code; a
conservative **25,000–30,000 lines are removable duplication**. The GST-bill
family alone is 5 × 1,830-line files that are 96–100 % identical. A
config-driven common core is the right move, and a config layer for this
(`config/industryModules.js`) **already exists and is in production use** for the
sidebar and route-gating — the screens just never got the same treatment.

---

## 1. Backend: zero industry awareness

`grep` for `industry` across `backend/`:

- `industry` / `subIndustry` are stored as free-text strings on `Owner` (and on
  `Client` for the software-dev "clients" feature). Nothing ever branches on
  them.
- Every Mongoose model is `strict: false`, so industry-specific fields
  (`imei1`, `batchNumber`, `size`, `duration`, …) are just extra keys on the
  same `Product` / `Customer` document.

**Unification is a pure frontend concern.** No API or schema changes required.

---

## 2. How `industry` is resolved (and why it's fragile)

**Value creation** — `components/Auth/SignUp.jsx` `labelToKey()`:

| UI selection | stored `industry` value |
|---|---|
| electronics → "Mobile Shop" | `mobile_shop` |
| education (any sub) | `academy` |
| grocery | `grocery` |
| restaurant | `restaurant` |
| anything else | `subLabel.toLowerCase().replace(/\s+/g, "_")` → `clothing`, `pharmacy`, `software_development`, `supermarket`, `cafe`, `bakery`, … |

**Value consumption** — every one of the 8 `Industry*Router` components repeats
this identical block:

```js
const industry =
  currentUser?.industry ||
  currentUser?.companyDetails?.industry ||
  currentUser?.Tenant?.industry ||
  localStorage.getItem("selectedIndustry") ||
  "grocery";
const industryLower = industry.toLowerCase();
if (industryLower.includes("software_development")) return <SD... />;
if (industryLower.includes("clothing"))            return <Clothing... />;
// ...
return <Grocery... />;   // fallback
```

Problems:

- The resolver block is **copy-pasted 8×**. Divergence already happened — see §4.
- Fallback is `grocery` (or the generic), so any unmatched key silently renders
  a grocery screen: `supermarket`, `cafe`, `bakery`, `others` all land on
  grocery today.
- `.includes()` string-matching is what produced the `grocery_store` routing bug
  fixed earlier — a router checked a key `labelToKey()` never emits.
- `config/industryModules.js` lists canonical keys (`grocery`, `grocery_store`,
  `restaurant`, `mobile_shop`, `academy`, `software_development`, `clothing`,
  `pharmacy`, `others`) — but `SignUp.labelToKey()` and the routers each have
  their own notion of the key set. No single source of truth.

---

## 3. Per-family similarity (measured)

Diff-line % is `diff` changed-lines ÷ file size, whitespace-normalised — a rough
upper bound (moved lines double-count). "Styling-only" means the diff is
Tailwind colour classes (`green-*` → `purple-*` / `#f74faf`) + the component
name.

### 3a. GST Bill — **the biggest win, ~0 % real difference**

| File | Lines | vs `groceryGstBill` |
|---|---|---|
| `components/Billing/GenerateGSTBill.jsx` | 1830 | 12 lines (3 stray `console.log`, `source:"Owner"` vs `"Grocery"`, fn name) |
| `industry/grocery/groceryGstBill.jsx` | 1830 | — (reference) |
| `industry/Clothing/ClothingGstBill.jsx` | 1830 | ~78 lines — **all** `green-*` → `#f74faf`, plus `value={x}` → `value={x||""}` |
| `industry/academy/academygstbill.jsx` | 1830 | ~80 lines — **all** `green-*` → `purple-*` |
| `industry/SoftwareDevelopment/SDGstBill.jsx` | 1814 | ~86 lines — colour swap + minor |

**No functional or domain difference exists between the 5 GST-bill screens.**
9,134 lines that should be ~1,850 (one component + a theme token). Pharmacy and
mobile have no GST-bill screen at all — they'd get one for free.

### 3b. Billing (POS) — shared core, **bidirectional fork divergence**

| File | Lines | vs `groceryBilling` | Nature of diff |
|---|---|---|---|
| `industry/grocery/groceryBilling.jsx` | 1501 | — | reference |
| `industry/Clothing/ClothingBilling.jsx` | 1500 | ~7 % | styling-only |
| `industry/Pharmacy/PharmacyBilling.jsx` | 1636 | ~12 % | **pharmacy has features grocery lacks**: wallet payment method, loyalty-points *redemption* at checkout, auto-load customer by phone, update-existing-customer-instead-of-duplicate |
| `industry/academy/academybilling.jsx` | 1762 | ~32 % | **genuine domain diff**: term/session payments (`Term - ${termDuration}`, `dueSession`, per-session payment schedule), no unit-multiplier stock, a `themeStyles` object; **also *missing* grocery's richer `setQty`/stock-in-units logic** |
| `industry/SoftwareDevelopment/SoftwareBilling.jsx` | 1685 | ~34 % | service/project terminology, similar divergence to academy |

Key point: **no single file is a superset.** grocery has stock-unit maths academy
dropped; academy has session-billing grocery never got; pharmacy has
wallet/redemption the other three never got. Each fork drifted independently.
This is the most expensive kind of duplication — you cannot "just keep one."

`industry/mobile/mobilebilling.jsx` (353 lines) — **dead code, imported nowhere.**
Mobile-shop tenants get either `BarcodeBilling.jsx` (via the `/barcode-billing`
route) or `GroceryBilling` (via `IndustryBillingRouter`'s fallback, because the
mobile branch there is commented out).

### 3c. Record — shared core + industry columns + fork drift

| File | Lines | vs `groceryRecord` | Nature |
|---|---|---|---|
| `industry/grocery/groceryRecord.jsx` | 2512 | — | reference (still carries **mobile leftover columns**: `brand`, `model`, `imei1`, `storage`, `duration`) |
| `industry/Clothing/ClothingRecord.jsx` | 2505 | ~3 % | styling-only |
| `industry/mobile/mobilerecord.jsx` | 2980 | ~17 % | IMEI/serial columns, staff records |
| `industry/Pharmacy/PharmacyRecord.jsx` | 2868 | ~18 % | batch/expiry/mfg/drug-licence columns, wallet-adjust modal, customer edit modal, customer dedup-by-phone |
| `industry/SoftwareDevelopment/SDRecord.jsx` | 2530 | ~20 % | clients/services/projects instead of customers/products |
| `industry/academy/academyRecord.jsx` | 2470 | ~45 % | students/courses/trainers, session ledger |

### 3d. Inventory — split into two unrelated lineages

| File | Lines | Note |
|---|---|---|
| `industry/grocery/groceryInventory.jsx` | 1441 | reference |
| `industry/Clothing/ClothingInventory.jsx` | 1404 | ~20 % vs grocery — shared core |
| `industry/Pharmacy/PharmacyInventory.jsx` | 1444 | ~11 % vs grocery — shared core |
| `industry/mobile/mobileinventory.jsx` | 833 | **different implementation** (not a copy) |
| `industry/SoftwareDevelopment/SoftwareDevelopmentInventory.jsx` | 443 | **different implementation** |
| `industry/academy/academyinventry.jsx` | 235 | **different implementation** |

grocery/clothing/pharmacy are one ~1,400-line family (retail stock).
academy/software/mobile are three bespoke smaller screens (courses / services /
device serials). Unify the retail three; treat the other three as their own
thing (or thin variants) for now.

### 3e. Add Product / Add Service

| File | Lines | vs `components/Billing/AddProduct.jsx` |
|---|---|---|
| `AddProduct.jsx` (generic) | 739 | reference |
| `grocery/groceryAddProduct.jsx` | 730 | ~13 % (styling + a couple fields) |
| `Clothing/ClothingAddProduct.jsx` | 729 | ~27 % (size/colour fields) |
| `Pharmacy/PharmacyAddProduct.jsx` | 690 | **different** (batch/expiry/licence form) |
| `mobile/addmobileproduct.jsx` | 890 | **different** (brand/model/IMEI/storage) |
| `academy/academyproduct.jsx` | 382 | **different** ("course" form) |
| `SoftwareDevelopment/AddSoftwareService.jsx` | 267 | **different** ("service" form) |

This family is genuinely field-driven: the form *is* the industry difference.
Perfect fit for a **field-schema config** feeding one form component.

### 3f. Add Customer / Add Client

| File | Lines | vs generic `AddCustomer.jsx` |
|---|---|---|
| `AddCustomer.jsx` | 613 | reference |
| `Pharmacy/PharmacyAddCustomer.jsx` | 612 | ~8 % — styling + loyalty/wallet fields |
| `SoftwareDevelopment/AddClient.jsx` | 651 | **different** — "client" with `industry`, contact-person, project fields → its own `/clients` API |

### 3g. Barcode labels

`grocery/groceryBarcode.jsx` (249), `Clothing/ClothingBarcode.jsx` (201),
`Clothing/ClothingAllBarcode.jsx` (249), `mobile/BarcodePage.jsx` (212). Small,
mutually ~70 % different (label layout per item type). Low priority — total
< 1,000 lines.

---

## 4. Bugs found during the audit (independent of unification)

1. **`IndustryAddProductRouter.jsx:21`** — `return <AddProduct />` but `AddProduct`
   is never imported → `ReferenceError` for any user whose `industry` is null.
2. **`industry/mobile/mobilebilling.jsx`** — 353 lines, imported nowhere. Dead.
3. **Mobile-shop billing is undefined behaviour** — `IndustryBillingRouter`,
   `IndustryGstBillRouter`, `IndustryBarcodeRouter`, `IndustrySubUsers` all have
   the mobile branch commented out, so mobile falls through to grocery.
4. **`groceryRecord.jsx` shows mobile columns** (`brand`, `model`, `imei1`,
   `storage`, `duration`) — copy-paste residue from being forked off a mobile
   screen.
5. **Router key sets disagree** — `SignUp.labelToKey()`, the 8 routers, and
   `config/industryModules.js` each define the industry-key vocabulary
   differently (`grocery` vs `grocery_store`, etc.).
6. **`supermarket` / `cafe` / `bakery` / `others`** silently render grocery
   screens everywhere.

---

## 5. What actually differs between industries (the real requirements)

Stripping the accidental duplication, the genuine per-industry variation is:

| Axis | Examples |
|---|---|
| **Line-item field schema** | grocery: sku, barcode · mobile: brand, model, imei1/2, colour, storage · pharmacy: batchNo, expiryDate, mfgDate, drugLicenceNo, pharmaCompany, hsnSac · clothing: size, colour · academy: courseName, duration · software: serviceName, hours/rate |
| **Terminology** | Customer / Student / Client · Product / Course / Service · Inventory / Courses / Services (sidebar already overrides this in `industryModules.js`) |
| **Feature flags** | barcode scan & labels (grocery, clothing, mobile) · loyalty + wallet (retail) · GST invoice (all except pure-service maybe) · trainers (academy) · credit ledger (mobile, pharmacy, academy) · unit-multiplier stock, e.g. sell-by-weight (grocery) |
| **Billing model** | one-shot POS sale (retail) vs term/session instalments (academy) vs project milestones (software) |
| **Receipt / invoice template** | thermal vs A4 default; label wording |
| **Compliance** | pharmacy batch + expiry tracking, drug-licence on invoice |
| **Theme colour** | grocery/others = green · clothing = `#f74faf` · academy = purple (currently hard-coded in every file) |

Everything except **billing model** and, arguably, **add-product form** is pure
configuration (fields, labels, flags, colour). Billing model is where a real
strategy split lives (retail vs instalment vs milestone).

---

## 6. Existing config layer to build on

`config/industryModules.js` already does, in production:

- `INDUSTRY_MODULES[key]` — which modules/routes an industry gets (feature flags).
- `getSidebarItems(key)` — per-industry **label overrides** (`inventory` →
  "Courses" / "Service").
- `getAllowedModules` / `isModuleAllowed` — consumed by `ModuleRoute` to gate
  routes.

`config/tabDefaults.js` — per-industry default landing tab.

The unification just extends this file (or a sibling `industryProfiles.js`) with
field schemas, feature flags for the *screens*, theme token, and receipt choice —
a pattern the codebase has already accepted.

---

## 7. Recommendation (feeds the plan)

1. **One `industryProfiles.js`** — single source of truth: canonical key,
   aliases, label overrides, line-item field schema, feature flags, theme token,
   receipt template, billing model. Fold `SignUp.labelToKey`, the 8 routers, and
   `industryModules.js` onto it.
2. **Collapse GST-bill first** — 5 files → 1 `<GstBill profile={...} />`. Pure
   win, ~7,300 lines removed, no behaviour change, lowest risk. Proof of concept.
3. **One `<PosBilling>` core** for the retail model (grocery, clothing, pharmacy,
   mobile) with pluggable line-item field slots + feature flags. Roll pharmacy's
   wallet/redemption and grocery's unit-stock into the shared core so every
   retail industry gets both.
4. **Keep instalment billing separate** — academy (sessions) and software
   (milestones) are a different workflow; give them their own core (or a
   `billingModel: "instalment"` branch), not forced into `<PosBilling>`.
5. **Restaurant/Cafe/Bakery** — no screens exist today; if F&B features come
   later (tables, KOT) that's its own core.
6. **Record & Inventory** — same treatment as billing: retail core + column
   config; leave academy/software bespoke until the core is proven.
7. **Add-Product** — one `<ItemForm fields={profile.itemSchema} />`.
8. **Fix the §4 bugs** as part of step 1 (they mostly evaporate once routing is
   config-driven).

Do it incrementally, one family at a time, each behind the same routers so it's
reversible. Suggested order: GST bill → Add-Product → Record (retail) →
Inventory (retail) → PosBilling (retail) → instalment billing → barcode labels.
