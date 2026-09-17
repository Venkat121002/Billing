# Industry-Driven UI — Implementation Plan (v2)

**Date:** 2026-09-11 (revises the v1 plan from 2026-09-10)
**Companion to:** `UNIFICATION_AUDIT.md`
**Reference:** Vyapar module map (`vyapar-billing-system-documentation.md`, supplied 2026-09-11) — used for principles, not copied wholesale. See §6 for what's adopted now vs. deferred.

## What changed from v1

- **No blocking gate.** v1 had a mandatory full-screen "select industry" popup on
  every login. Superseded: the app is **usable generically from the first
  login** — Party/customer master, payments, cashbook, expenses, GST calc,
  reports all work with zero industry set. Industry is chosen once, as part of
  **completing the Company Profile** (Settings → Company Profile), which
  unlocks industry-specific fields and modules on top of the generic core —
  it does not gate the generic core.
- **Item Master redesigned around field *groups***, not a bespoke field list per
  industry (simpler, matches "same schema, same UI, different fields
  populated").
- **Scope for this plan = unify what exists today** (billing/inventory/record/
  GST screens, item master). The bigger Vyapar-core ideas (unified Party
  ledger, Payments In/Out as linked entities, Purchase module, derived stock,
  P&L) are captured as a **Future Roadmap** (§6) — not built in this plan.
- Pharmacy = generic Item Master + Batch/Expiry group on by default (no
  drug-schedule/prescription enforcement yet). Manufacturing and Restaurant/
  Cafe/Bakery are **hidden from the industry picker** until they get real
  dedicated modules (BOM, table/KOT) — they aren't config-shaped problems.

---

## 1. Rollout model

- **Registration** stays minimal (business name, owner, login) — already close
  to this after the industry step is dropped from `SignUp.jsx`.
- **On login, the app is fully usable** with the generic core: dashboard,
  products/customers (generic fields), billing (generic POS), cashbook, credit,
  reports, settings. No gate, no popup blocking anything.
- **Company Profile** (Settings → Company Profile) is where business details
  live (name, address, GSTIN, logo, invoice numbering) — industry becomes one
  field on that same screen. A dismissible banner/nudge ("Complete your company
  profile to unlock industry-specific features") points there; it is never
  mandatory.
- **Picking + saving an industry** there:
  - unlocks/relabels modules per `industryProfiles.js` (sidebar, e.g. "Courses"
    for academy, "Barcodes" only where relevant)
  - switches the Item Master's default field groups (see §2)
  - switches the billing engine/theme for that industry
- **Changing industry afterward is locked** (per your earlier decision) —
  Company Profile shows it read-only once set, with "contact support to
  change." A small `SUPPORT_KEY`-guarded backend endpoint (or, for now, a
  documented manual DB edit) is the escape hatch — see §5.

---

## 2. Item Master: universal field groups

One item schema for every industry. A small fixed set of **optional field
groups**, each just an on/off flag per industry profile (defaults), with every
field still editable per item regardless of the industry default — a pharmacy
tenant could still tag a variant if they genuinely have one:

| Group | Fields | Typically on for |
|---|---|---|
| **Core** (always) | name, unit, category, salePrice, purchasePrice, quantity, HSN/SAC, GST rate, barcode | everyone |
| **Batch / Expiry** | batchNumber, mfgDate, expiryDate | pharmacy, petshop (food/meds) |
| **Variants** | size, color | clothing |
| **Item Type** | type: product \| service; if service → duration/hours instead of stock qty | academy (courses), software (services), petshop (grooming) |
| **Serial / IMEI** | imei1, imei2, serialNumber | mobile shop |

`industryProfiles.js` carries `itemFieldGroups: { batchExpiry: true, variants: false, itemType: false, serial: false }` per industry instead of a bespoke field list. One `<ItemForm groups={profile.itemFieldGroups} />` renders the right optional sections; `<ItemForm>` never needs to know which industry it's in.

Pharmacy-only regulatory fields (drug schedule, prescription-required flag,
drug-licence-on-invoice) are **not** part of this generic scheme — they're
listed under Future Roadmap (§6) as the real vertical feature they are.

---

## 3. Architecture (single source of truth)

`frontend/src/config/industryProfiles.js`:

```js
{
  grocery: {
    key: "grocery",
    aliases: ["grocery_store", "supermarket"],
    label: "Grocery Store",
    theme: "green",
    billingModel: "pos",
    roleLabels: { customer: "Customer", item: "Product", inventory: "Inventory" },
    itemFieldGroups: { batchExpiry: false, variants: false, itemType: false, serial: false },
    featureFlags: { barcode: true, loyalty: true, wallet: true, unitStock: true, gst: true, credit: false, trainers: false },
    paymentMethods: ["cash", "upi", "card", "wallet"],
    receipt: "retail-a4",
    modules: ["dashboard","inventory","billing","barcodes","record","reports","gst","cashbook","staff_records"],
  },
  pharmacy: { ...retail base, itemFieldGroups: { batchExpiry: true }, featureFlags: { credit: true } },
  mobile_shop: { ...retail base, itemFieldGroups: { serial: true }, featureFlags: { credit: true } },
  clothing: { ...retail base, theme: "pink", itemFieldGroups: { variants: true } },
  petshop: { ...retail base, label: "Pet Shop", itemFieldGroups: { batchExpiry: true, itemType: true } },
  academy: { billingModel: "instalment", theme: "purple", roleLabels: { customer: "Student", item: "Course", inventory: "Courses" }, itemFieldGroups: { itemType: true }, featureFlags: { barcode: false, trainers: true, credit: true } },
  software_development: { billingModel: "milestone", roleLabels: { customer: "Client", item: "Service", inventory: "Services" }, itemFieldGroups: { itemType: true }, featureFlags: { barcode: false } },
  others: { ...retail base, label: "Other (generic)" },   // the "no industry chosen yet" experience
}
```

`resolveIndustryProfile(currentUser)` — replaces the copy-pasted 5-way fallback
in the 8 routers, `ModuleRoute`, and `AdminLayout`. Falls back to `others`
(generic profile), **never to `null`** — there is no gate state to render.

`industryModules.js` becomes a thin re-export deriving `modules` from the
profiles.

---

## 4. Phases

### Phase 0 — Foundations (no visible change) — ✅ DONE (2026-09-11)
- `config/industryProfiles.js` with all current industries + `petshop` +
  `others` (the generic default). Includes `mobile_shop`; `restaurant` exists
  (for accounts that already have it) but is marked `hidden` (excluded from
  `getSelectableProfiles()`); `manufacturing`/`cafe`/`bakery` aren't modelled
  yet — unrecognized values fall back to `others`, matching prior behaviour.
- `resolveIndustryProfile()` / `normalizeIndustryKey()` / `hasChosenIndustry()`
  / `getSelectableProfiles()` added; `ModuleRoute`, `AdminLayout`, and all 8
  `Industry*Router` files now use `resolveIndustryProfile(currentUser).key`
  instead of the copy-pasted 5-way fallback + `.includes()` chain.
- Bug fixes landed: `acadamy` (SignUp typo) and `grocery_store`/`supermarket`
  now alias correctly; `IndustryAddProductRouter.jsx` no longer throws
  (`AddProduct` import was missing); dead `industry/mobile/mobilebilling.jsx`
  deleted; mobile-leftover columns (`brand`/`model`/`imei1`/`color`/`storage`/
  `duration`) removed from `groceryRecord.jsx`'s data mapping, search filter,
  and CSV export.
- `industryModules.js` gained a `petshop` entry (additive only, existing
  industries' module lists untouched).
- **Verified:** `npm run build` passes (exit 0); a standalone Node check of
  `resolveIndustryProfile`/`normalizeIndustryKey`/`getSelectableProfiles`
  against every current + new industry value (including the alias/typo cases
  and unrecognized values) matched the expected key, theme, billing model, and
  selectability in every case; `industryModules.js`'s `getAllowedModules` /
  `getSidebarItems` verified unchanged for all pre-existing keys and correct
  for the new `petshop` key. Not yet committed — 13 files changed, sitting on
  branch `mongodb-only-fresh-start` (already merged into `main` via PR #1;
  recommend a fresh branch for this work stream before committing).

### Phase 1 — Company Profile + industry field (no gate) — ✅ DONE (2026-09-11)
- **Backend:** `POST /v2/auth/select-industry { industry }` — owner-only (403
  for sub-users), validates against a backend `VALID_INDUSTRIES` list kept in
  sync with `getSelectableProfiles()` (400 on unknown value), writes
  `companyDetails.industry` only while unset (409 once set). `updateProfile`
  no longer accepts/writes `industry` at all — closes the pre-existing hole
  where the generic profile-edit form could silently change it.
- **Frontend:** the existing Settings → Profile section's "Industry" field
  (previously a plain, always-editable text input feeding the generic
  `updateProfile` call — the same hole) is now its own block: a `<select>` of
  `getSelectableProfiles()` + a dedicated "Save Industry" button calling the
  new `selectIndustry()` (AuthContext), while unset; once set, a read-only
  label + "contact support to change" note.
- A dismissible `<IndustryNudgeBanner>` (owner-only, session-dismissed) sits
  at the top of the dashboard and links to Settings' profile section; nothing
  blocks.
- `SignUp.jsx`: the industry/sub-industry step, the `industries` map, and the
  buggy `labelToKey()` (source of the `acadamy` typo) are removed.
  Registration now only collects business basics.
- **Verified:** backend — register (no industry) → `auth/me` shows empty →
  `update-profile` with a spoofed `industry` is silently ignored → generic
  `select-industry` rejects unknown values (400) → valid value saves (200) →
  repeat select (409) → persists across `auth/me` → a later `update-profile`
  call can no longer touch it. `npm run build` passes (frontend).

### Phase 2 — Collapse GST Bill (proof, ~7,300 LOC removed) — ✅ DONE (2026-09-11)
- New `components/Billing/IndustryGstBill.jsx` (1,890 lines) replaces the 5
  near-identical ~1,830-line copies (grocery, Clothing, academy, SD, and the
  unused generic `GenerateGSTBill.jsx`) — **9,185 lines deleted, 1,890 added,
  net ‑7,295**.
- Built from `groceryGstBill.jsx` (the file every router already fell back
  to). Resolves its own `resolveIndustryProfile(currentUser)` — no props
  needed, so `IndustryGstBillRouter` is now a 9-line pass-through.
- A `THEMES` table (green/pink/purple/blue — one const object, ~25 named
  slots per theme, each a complete literal Tailwind class string so JIT still
  picks them all up) replaces every hardcoded colour class. `SectionCard`
  moved inside the component so it closes over the theme instead of prop
  drilling across 7 call sites.
- `profile.roleLabels.customer` now drives the "Buyer Details" section's
  wording (e.g. reads "Student" for academy) — previously no variant did this
  despite the label config existing.
- Dropped as dead/redundant while consolidating: the unreachable
  `userProfileLoading` gate (always `false`), the inline `success` banner +
  its `useState` (all 4 copies had one) — replaced with `toast.success(...)`;
  standardised `source: "Owner"` (was `"Grocery"`/`"Software_Development"`/
  inconsistent — harmless either way since `createdBy` is the real filter key,
  fixed in Phase 1).
- **Fixed real theming bugs found while diffing the 4 copies**: clothing's
  Grand Total figure and the per-item Amount box were left unthemed (plain
  green); academy's Grand Total border was pink (leftover from a
  copy-paste); SD's "Copy from Buyer" link and Grand Total border were left
  green. All four now render correctly in their own theme.
- **Verified:** `npm run build` passes; bundle down another ~93 kB.

### Phase 3 — Item Master (Add-Product) from field groups — ✅ DONE (2026-09-11)
- New `components/Billing/ItemForm.jsx` (707 lines) + `config/itemCategories.js`
  (55 lines) replace 4 files: the generic `AddProduct.jsx`,
  `groceryAddProduct.jsx`, `ClothingAddProduct.jsx`, `PharmacyAddProduct.jsx`
  (2,888 lines total) — net **‑2,126 lines**. Petshop gets the same form for
  free (new `itemCategories.js` entry).
- Built from `groceryAddProduct.jsx`, not the generic file — diffing found the
  generic `AddProduct.jsx` had two real bugs grocery's fork had already fixed
  (a `.chatAt` typo that would throw on every edit, and a GST calc that
  wrongly multiplied by `quantity × unit`); kept grocery's fixes, dropped the
  now-provably-dead `isMobileIndustry` branch (mobile gets its own screen —
  see below).
- `itemFieldGroups.variants` (clothing) now repurposes the existing
  `description` field into a "Size" picker with a size datalist, instead of
  adding a new field — matches the field-group design in §2. Category
  taxonomy (`config/itemCategories.js`) is looked up by `profile.key`.
- `itemFieldGroups.batchExpiry` (pharmacy, petshop) adds a 6-field group
  (manufacturer, licence no., HSN, batch no., mfg/expiry dates), present in
  the shared schema but only rendered when the flag is on.
- Theming reuses the same complete-literal-string `THEMES` pattern as Phase 2
  (green/pink here — purple/blue aren't exercised since academy/software
  don't use this form).
- **Add-Customer**: `PharmacyAddCustomer.jsx` (612 lines, a "sell on credit"
  form, not a contact form) turned out to have **zero theme/color
  differences** from the generic `AddCustomer.jsx` — its only real content was
  a `qtyPerUnit` display field, a stock-count in the product dropdown, and
  dropped debug `console.log`s. Folded those into `AddCustomer.jsx` directly
  (no new component needed) and deleted the duplicate — net ‑612 lines.
- **Kept separate** (per plan): `academyproduct.jsx` (courses),
  `AddSoftwareService.jsx` (services — discovered it already posts to the same
  `/products` endpoint as everyone else, so folding it in is a candidate for a
  later pass), `addmobileproduct.jsx` (890 lines — genuinely richer workflow:
  bulk multi-IMEI entry, barcode scanner, instalment/credit-purchase
  tracking, CGST/SGST split; not a copy-paste fork, a real bespoke screen).
- **Verified:** `npm run build` passes; bundle down to 3,476 kB (from 3,527 kB
  after Phase 2).

### Phase 4 — Record & Inventory (retail core)

**Inventory — ✅ DONE (2026-09-11).** New `components/Billing/IndustryInventory.jsx`
(1,098 lines) replaces `groceryInventory.jsx`, `ClothingInventory.jsx`,
`PharmacyInventory.jsx` (4,289 lines total) — net **‑3,191 lines**. Petshop
gets it for free. Mobile/academy/software keep bespoke inventory screens
(confirmed genuinely different implementations, not forks — mobile's is 833
lines vs. this cluster's ~1,400, academy's 235, software's 443).
- Columns are a `BASE_COLUMNS` + optional `BATCH_EXPIRY_COLUMNS` (pharmacy/
  petshop) + `TRAILING_COLUMNS` array, not a full per-industry column
  rewrite — pharmacy's bespoke copy had also silently swapped the "Qty"/
  "Unit" column labels onto the wrong fields; not carried forward.
- **Real bug found and fixed**: grocery's own file was internally
  inconsistent — the per-row table cells computed stock as `quantity × unit`,
  but the low-stock/out-of-stock filters, status badges, and summary cards
  all used bare `quantity`, so a product could show as e.g. "50 in stock" in
  one column while being flagged "Low Stock" by a threshold check that never
  saw the multiplier. Clothing's fork had already fixed this (applied the
  multiplier everywhere); adopted that as the one `totalItemsOf()` helper
  used consistently across the whole component.
- **Second bug fixed**: grocery's `inventorySummary.totalPurchaseValue`
  computed `purchasePrice × itemGstAmount` (price × a GST *amount*, not
  rate — a meaningless number). Clothing's fork had fixed it to
  `itemSubtotal + itemGstAmount`; adopted that.
- Dropped more dead mobile-column-rendering code (`ram`/`storage`/`imei1`
  cell renderers) left over in grocery's copy despite mobile routing
  elsewhere since before this project started — same pattern as the
  `groceryRecord.jsx` cleanup in Phase 0.
- **Verified:** `npm run build` passes; bundle down to 3,415 kB.

**Record — ✅ DONE (2026-09-15).** New `components/Billing/IndustryRecord.jsx`
(2,193 lines) replaces `groceryRecord.jsx` (2,501), `ClothingRecord.jsx`
(2,505), and `PharmacyRecord.jsx` (2,868) — net **-5,681 lines**. Built from
Pharmacy's fork (confirmed richest via full diff: wallet top-up modal,
customer view/edit/delete modals with phone-based dedup that sums loyalty/
wallet across duplicate customer records, batch/expiry/brand/pharma-company
inventory fields, unit-multiplier stock display). `config/industryScreens.js`
`record` entry now points grocery/clothing/pharmacy/petshop/restaurant/others
at it; mobile/academy/software_development stay bespoke.

- **Re-checked mobile per the standing note** — confirmed it should stay
  bespoke. The audit's "~17% different" estimate didn't hold up under a real
  diff: `mobilerecord.jsx` carries genuine mobile-specific columns and search
  logic (brand/model/IMEI/color) plus a large *dead* academy-specific branch
  (`isAcademyIndustry`, never true there since the router already sends
  academy elsewhere) — real, non-cosmetic branching, not a re-theme.
- **Real bugs found and fixed while diffing**:
  - Pharmacy's fork **silently dropped the "Pay Now" button** from the
    credit tab when it added a status badge — `handlePayCredit` was still
    defined but never called, a real functional regression (no way to route
    a customer to billing to pay off a balance). Restored it alongside the
    status badge, combining both.
  - Grocery's category filter dropdown was **hardcoded to mobile-shop
    categories** (Mobile/Bluetooth/Charger/Headset/Cable/Adapter) — nonsense
    for a grocery store. Clothing's fork had already fixed this by deriving
    the list from actual product data (`productCategories` via `useMemo`);
    adopted that fix for everyone.
  - Grocery's credit table **header and row cells were out of sync**: the
    header listed 15 columns (Email, Address, Qty, Price, GST, Due,
    Sessions, Action) but the row only rendered 9 `<td>`s (the rest were
    commented out) — every column after the mismatch point showed the wrong
    data. Pharmacy's fork had already fixed the alignment (uncommenting the
    row cells and updating the header to match); adopted its column set.
  - `total`/`credit`/`dueSession` were each assigned **twice in the same
    object literal** (`total: Number(data.total) || 0, total: total,` —
    the esbuild duplicate-key warnings visible since Phase 5) — both
    branches computed the identical value so it was harmless, but confusing
    and the literal cause of a recurring build warning; collapsed to one
    assignment each.
  - Dropped the dead `isAcademyIndustry`/`isMobileIndustry` state — grocery's
    fork declared both but never set either to `true`, so every conditional
    branch keyed on them was unreachable dead code (trainer-vs-supplier
    labels, an academy profit-calc branch, etc.).
- Gated the batch/expiry/brand/pharma-company inventory and buy-tab columns
  behind `profile.itemFieldGroups.batchExpiry` (on for pharmacy/petshop, off
  for grocery/clothing/others) instead of always showing them — matches the
  column-composition pattern from Phase 4's Inventory consolidation.
- **Verified:** `npm run build` passes; bundle down another ~112 kB. The
  IndustryRecord.jsx duplicate-key warnings are gone; the ones still printed
  are from the untouched bespoke `mobilerecord.jsx`/`academyRecord.jsx`/
  `SDRecord.jsx` files (out of scope — those stay bespoke by design).

### Phase 5 — PosBilling engine (retail) — ✅ DONE (2026-09-15)
New `components/Billing/IndustryBilling.jsx` (1,644 lines) replaces
`groceryBilling.jsx` (1,501), `ClothingBilling.jsx` (1,500),
`PharmacyBilling.jsx` (1,636) — net **-2,993 lines**. Built from Pharmacy's
fork (confirmed richest via full diff: wallet-as-payment, loyalty redemption,
phone-lookup customer auto-fill, update-not-duplicate on save; grocery/
clothing's diff was 203 lines, near-pure re-theme). `IndustryBillingRouter.jsx`
now only special-cases academy (instalment) and software_development
(milestone); grocery/clothing/pharmacy/mobile_shop/petshop/restaurant/others
all render `<IndustryBilling/>`.

- **Theming**: same `THEMES` (green/pink) literal-string pattern as Phases
  2–4. Fixed 8 leftover-unthemed green spots found in clothing's old fork
  while cataloguing pink equivalents (loading screen, error-refresh button,
  empty-cart icon, qty+ hover, Complete Sale button — all were still emerald
  under a pink brand).
- **Feature-flag gated** (per `industryProfiles.js`): payment-method buttons
  filtered by `profile.paymentMethods` (+ `featureFlags.wallet`); barcode
  scan input by `featureFlags.barcode`; loyalty-points UI/earn/redeem and
  wallet balance UI/deduction independently by `featureFlags.loyalty` /
  `featureFlags.wallet` (previously conflated under one loyalty-enabled
  check in `processCustomerUpdates` — wallet deduction would have silently
  no-op'd if loyalty were ever disabled; now independent); due-sale →
  credit-record creation by `featureFlags.credit`. All are functionally
  no-ops today since every retail profile currently has these flags on, but
  the gates are real for when a future profile turns one off.
- **Dead code dropped** while porting (found via full read, confirmed unused
  by grep): `moneys` quick-cash denominations array, `termDuration` state
  (only fed an unreachable `paymentMethod === "term"` branch — "term" was
  never in this cluster's payment-method list, that branch is deleted),
  `currentTime` state + its 1s `setInterval` (set, never rendered — was
  re-rendering the whole POS screen every second for nothing), `lastAddedSku`
  (write-only), unused `navigate`/`searchInputRef`, and 7 unused lucide
  imports (`Package`, `ChevronDown`, `Clock`, `Zap`, `AlertCircle`,
  `BadgeIndianRupee`, `Bell`).
- **`BarcodeBilling.jsx` (353 lines) deleted as dead code**: its route
  (`/barcode-billing`) is gated by `ModuleRoute moduleKey="barcode_billing"`,
  but no industry in `industryModules.js` `INDUSTRY_MODULES` ever included
  `"barcode_billing"` — the route always redirected to `/dashboard`,
  unreachable from any sidebar or link. Also dropped the now-pointless
  `barcode_billing` entry from `MODULES` and its route from `App.jsx`.
- **Verified:** `npm run build` passes (pre-existing duplicate-object-key
  esbuild warnings in `PharmacyRecord.jsx`/`ClothingRecord.jsx`/
  `mobilerecord.jsx` are unrelated — Phase 4 Record scope, still pending).

### Phase 6 — Instalment / milestone billing — ✅ DONE (2026-09-15)
`academybilling.jsx` (sessions) and `SoftwareBilling.jsx` (milestones) stay
dedicated components (not merged into `IndustryBilling.jsx` — different
billing models, per the locked decision). `IndustryBillingRouter.jsx` now
dispatches on `profile.billingModel` (`"milestone"` → SD, `"instalment"` →
academy, else the shared `<IndustryBilling/>`) instead of a hardcoded
industry-key `if`, matching the plan's stated architecture — same routing
outcome today, since only these two profiles use those models.

"Re-skin via `profile.theme`" turned out to mean something more concrete
than a cosmetic pass — reading both files surfaced real bugs:

- **`academybilling.jsx` had a genuine production bug**: its per-payment-
  method theming (cash=purple/card=blue/upi=emerald/term=orange) built
  Tailwind classes via `` `text-${themeColor}-100` ``-style template
  interpolation in 19 places (search/discount focus rings, cash input,
  receipt-modal borders/icons, format select, print/finalize buttons).
  Tailwind's JIT content scanner only picks up classes it can see verbatim
  in source — interpolated ones get silently purged from the production
  CSS build, so most of the cash-flow panel and receipt modal were
  unstyled under 3 of the 4 payment methods. Fixed by extending the
  existing (partial) `themeStyles` object into a complete literal-string
  table per payment method, matching the `THEMES` pattern from Phases 2-5.
- **`SoftwareBilling.jsx` was a sloppier fork with several real bugs**:
  ~20 spots of leftover emerald/teal styling (copied from grocery/
  pharmacy's original green theme, never updated for software's blue
  brand) — loading screen, category chips, cart, discount, customer
  modal, and the entire receipt modal; `paymentColors.card` had a green
  gradient paired with blue base/border/text/ring (now made fully
  emerald, matching its own selector chip's color and the plan already
  established by the payment-method button colors); the printed A4
  receipt duplicated the business street/city address block; a dead,
  copy-pasted `currentUser.companyDetails.industry === "academy"` check
  (this file only ever renders for software_development — always false)
  had a literal typo appending a stray `d` to "No Products Added",
  replaced with static "No Clients Added" text matching the header's own
  "X Clients" wording; a malformed duplicated `if` in the printer-format
  effect; assorted stray LLM-generated comments removed.
- **`App.jsx` had a redundant, more fragile dispatcher shadowing the
  above fix**: a second `IndustryBillingResolver` wrapper duplicated the
  billing-model dispatch with a raw `currentUser?.industry` check (missing
  `resolveIndustryProfile`'s full fallback chain through
  `companyDetails.industry`/`Tenant.industry`/localStorage), plus a fully
  unreachable duplicate `path="billing"` `<Route>` shadowed by React
  Router's static-over-splat ranking against the same-named top-level
  route. Both removed; the top-level `"billing"` route now renders
  `<IndustryBillingRouter/>` directly.
- Both files also had the same dead-code pattern found in Phase 5
  (unused `navigate`/`searchInputRef`/`getGST`/`moneys`/`addCash`, a
  1s `setInterval` re-rendering the screen for nothing, unused lucide
  imports) — dropped.
- **Not done, deliberately**: the static brand chrome (header bar,
  category labels, etc. — purple for academy, blue for software) stays
  as literal hardcoded Tailwind strings rather than being routed through
  a `THEMES[profile.theme]` lookup like the retail cluster. Unlike
  grocery/clothing/pharmacy/mobile/petshop, no other industry shares
  academy's or software's `billingModel`, so a multi-color lookup table
  for a color that can structurally never change has no behavioral
  payoff — it would be pure abstraction for a hypothetical future
  industry. The one real "hardcoded colour classes" bug (the JIT-unsafe
  interpolation above) is fixed; a token-migration of already-correct,
  already-static literal strings was skipped as scope creep.
- **Verified:** `npm run build` passes (same pre-existing Record.jsx
  duplicate-key warnings as Phase 5, unrelated).
- **Found but explicitly not fixed** (separate, larger, unrelated issue):
  `App.jsx` sets `const protectedRoutes = employerRoutes` (same array
  reference) and renders it twice — once unwrapped via `employerRoutes.map`,
  once `PrivateRoute`-wrapped via `protectedRoutes.map` — for every
  employer route, not just billing. Route-ranking ties appear to favor
  array order, meaning the earlier *unwrapped* registration could be
  winning over the `PrivateRoute`-protected one for all of dashboard/
  settings/inventory/gst/billing/etc. This needs dedicated verification
  and a real fix, not a drive-by change during a billing-theming phase.

### Phase 7 — Cleanup — ✅ DONE (2026-09-15)

**Barcode-label screens.** New `components/Billing/IndustryBarcodes.jsx`
(same `THEMES` green/pink pattern) replaces `groceryBarcode.jsx` and
`ClothingAllBarcode.jsx` (249 lines each, confirmed via full diff to be a
near-pure re-theme, same as every other retail-cluster pair). While diffing,
found `ClothingAllBarcode.jsx` imported `ClothingBarcode.jsx` (201 lines, a
full single-item barcode page) but never actually rendered it anywhere in
the JSX — a dead import hiding a fully dead 201-line file (the real
single-barcode page every industry actually uses is `/barcode/:productId` →
`industry/mobile/BarcodePage.jsx`, which despite its folder is generic).
All three old files deleted.

**Found and fixed, with the user's explicit sign-off**: `IndustrySubUsers.jsx`
(the "8th router," never counted in earlier phases because its filename
didn't match `Industry*Router.jsx`) and its only consumer,
`academySubUsers.jsx` (567 lines — a real, complete staff-activity screen:
unified records across products/bills/credit/cashbook, Excel export,
filtering, a detail modal) were **both completely unreachable**. `App.jsx`'s
`/staff-records` route imported `SubUserRecordsPage` directly, never going
through the router — so academy tenants had always gotten the generic
staff-records screen instead of this apparently-intended dedicated one.
Asked the user how to handle it (wire in vs. delete vs. leave); they chose
**wire it in**. Verified `createdBy` is stamped server-side on every record
type this screen reads (products/bills/credit/cashbook controllers all do
it from `req.user.userId`), so its owner-vs-subuser filter is sound. Also
found and fixed the *same* JIT-purge bug from Phase 6 inside it (a stats
grid building `bg-${stat.color}-50` / `text-${stat.color}-600` classes via
interpolation) before wiring it live. Renamed the file to
`IndustrySubUsersRouter.jsx` to match the other 7 routers' naming, then
repointed `/staff-records` at it.

**Collapsed the 8 routers into one.** New `config/industryScreens.js` is a
single registry (`{ kind: { default, byKey?, byModel? } }`) covering all 8
module kinds (billing, inventory, record, addProduct, addCustomer,
barcodes, gst, subUsers), and `components/Billing/IndustryScreen.jsx` is
one generic `<IndustryScreen kind="...">` dispatcher that resolves the
profile once and looks up `byModel[profile.billingModel] →
byKey[profile.key] → default`. This replaces 8 files that each
re-implemented the identical `useAuth()` + `resolveIndustryProfile()` +
`if/else` boilerplate with one lookup table — a new industry now needs one
registry edit instead of hunting through 8 files to see which ones need
updating. `App.jsx` now imports one `IndustryScreen` component and passes
`kind="..."` at each of the 8 call sites instead of importing 8 separate
router components. All 8 old router files deleted.

**Verified:** `npm run build` passes (module count 3058 → 3052, net of
deleting 8 files and adding 2; same pre-existing Record.jsx duplicate-key
warnings as Phases 5-6, unrelated, still pending the deferred Phase 4
Record consolidation).

**Not done — deliberately out of scope**: a general whole-repo dead-file
audit. This phase only removed files made dead by *this* project's own
work (the barcode duplicates, the orphaned subusers router, the collapsed
routers) — not an unrelated sweep of the whole codebase.

---

## 5. Support-side industry change

Unchanged from v1: build a minimal `PATCH /v2/admin/tenant-industry` guarded by
a `SUPPORT_KEY` env secret, or document a manual `mongosh` edit in
`SECURITY.md` for now. *(Still open — pick one when we reach Phase 1.)*

---

## 6. Future roadmap (Vyapar-inspired, explicitly NOT in this plan)

Captured so it's not lost, not scheduled:

1. **Unified Party master** — merge Customer + Supplier into one `Party`
   entity with a running ledger (ties into #2).
2. **Payments In/Out as first-class, linked entities** — a payment references
   one or more invoices/bills; party balance is *derived* from
   invoices − payments, not a directly-edited field.
3. **Derived stock** — product quantity computed from a stock-movement ledger
   (sale/purchase/return/adjustment entries), not a mutable field — gives an
   audit trail ("why is stock X?").
4. **Purchase module** — Purchase Order → Purchase Bill mirroring Sales,
   updating supplier payable and stock.
5. **Document hierarchy** — Quotation/Estimate → Sales Order → Delivery
   Challan → Invoice (today there's only a flat Bill/GST-Bill).
6. **P&L / Balance Sheet reports**, built on #1–#3 being real.
7. **Vertical modules** — Pharmacy regulatory (drug schedule, prescription
   requirement, licence-on-invoice), Manufacturing (Bill of Materials, raw
   material → finished goods), Restaurant (tables, KOT, order-to-kitchen flow).
8. **E-Invoice / E-Way Bill** government API integration.
9. **Multi-company per login**, **offline-first sync**, **role-based
   permissions beyond owner/sub-user**, **backup/restore**.

Each of these is a real project on its own; revisit after the unification
plan (§4) ships and the current feature set is on solid, de-duplicated ground.

---

## 7. Estimated impact (unchanged from v1)

| Phase | Net LOC | Risk |
|---|---|---|
| 0 Foundations | +300 / −150 | very low |
| 1 Company Profile + industry field | +350 / −150 | low |
| 2 GST bill collapse | −7,300 | low |
| 3 Item Master (add-product) | −2,500 | medium |
| 4 Record + Inventory (retail) | −8,872 (actual: -3,191 Inventory + -5,681 Record) | medium |
| 5 PosBilling | −2,993 (actual) | medium-high |
| 6 Instalment billing | ~−90 (actual; bug-fix phase, not consolidation) | low |
| 7 Cleanup | ~−320 (actual; barcode consolidation + dead ClothingBarcode.jsx + 8-router collapse) | low |
| **Total** | **≈ −30,000 LOC** | — |
