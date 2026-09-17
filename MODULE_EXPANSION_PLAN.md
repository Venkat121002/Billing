# Module Expansion — Quick Wins Plan

**Date:** 2026-09-17
**Companion to:** `UNIFICATION_PLAN.md` (the industry-unification work this plan builds on top of — all 8 phases there are done)
**Scope:** promote features that already exist but are buried inside another screen into their own first-class sidebar module — **no new backend, no new data model.** Bigger real feature gaps found during the audit (drug-expiry alerts, repair tickets, attendance, project tracking, Purchase Orders, etc.) are listed at the bottom as a deferred backlog, not part of this plan.

---

## 0. How the audit was grounded

Before planning anything, the current module map (`config/industryModules.js` / `industryProfiles.js`) was checked against the user's stated per-industry list — it matched exactly. Then the actual code (not just labels) was inspected to separate "genuinely missing" from "exists, just not surfaced":

| Claim | Verdict | Evidence |
|---|---|---|
| Low-stock alerts | **Already exists** | `EmployerDashboard.jsx` KPI tile, sidebar "Low Stock Alert" bell (`AdminLayout.jsx`), `IndustryInventory.jsx` badges — all driven by `reorderLevel`. |
| Academy "Fee Dues" | **Exists, but buried** | `academyRecord.jsx` has its own session-based "Fee Dues" tab (richer than the generic credit tab) — but academy's `INDUSTRY_MODULES` list has no `"credit"` entry, so there's no direct nav path to it. |
| SD "Clients" | **Exists, better than expected** | `SoftwareDevelopmentInventory.jsx` already has a "Service Details / Client Details" tab toggle with its own search box and an always-visible "Add Client" button (`AddClient.jsx`, which already supports edit via `location.state.client`). Not deeply hidden — just not a separate sidebar icon. |
| Academy "Students" | **Exists only as a Record tab** | Confirmed via `academyRecord.jsx` — customers (labelled "Student" per `roleLabels`) are only reachable by opening Record and switching tabs, unlike Trainers, which already has its own dedicated roster screen (`components/Billing/Trainer.jsx`, routed at `/trainers`). |
| Purchase Orders | **Does not exist** | No PO entity in `backend/models` or `backend/controllers`; "Buy Details" in Record only displays each product's own purchase fields. Not a quick win — real backend work. Deferred. |
| Dashboard per-industry variance | **Binary only** | `EmployerDashboard.jsx` only branches on academy-vs-everyone-else; grocery/pharmacy/clothing/mobile/petshop/SD all see the identical generic dashboard. Not addressed here (bigger design question, deferred). |

**The working pattern this plan reuses**: `Trainer.jsx` is the existing, proven template — a standalone screen (search, list table, Add/Edit/Delete modal) backed by an entity that already has a REST API (`/suppliers`, relabelled). Every item below follows that same shape, per your direction to mirror it exactly rather than build something richer.

---

## 1. Academy — Students module — ✅ DONE (2026-09-17)

**What existed before**: academy's Record screen (`academyRecord.jsx`) had a "Students" tab pulling from `/customers`, with `roleLabels.customer = "Student"` already applied everywhere else in the app (billing, receipts). There was no way to see students without first opening Record.

**Shipped**: new `frontend/src/industry/academy/Students.jsx` — same shape as `Trainer.jsx` (header + "Add Student" button, search bar, table, Add/Edit modal with its own inline form, Delete with confirm, a View-details modal), backed by the same `/customers` API academy's Record tab already uses — no new backend route.

- **Fields deliberately trimmed from the generic customer shape**: academy's `featureFlags` have `loyalty: false` and `wallet: false`, so the Loyalty Points / Wallet Balance fields and actions that the retail-cluster customer modal (`IndustryRecord.jsx`) shows were *not* carried over — Students only has Name / Phone / Location / GSTIN. Copying the retail fields blindly would have shown dead UI for a feature academy doesn't use.
- **Theming**: built consistently purple throughout (matching academy's actual brand color and every other academy-only screen), rather than mirroring `Trainer.jsx`'s own inconsistency (it's mostly green with only its "Add Trainer" button in purple) — a small, low-risk improvement made while building a clean new file, not a retroactive fix to `Trainer.jsx` itself.
- Added `MODULES.students = { label: "Students", path: "/students", icon: Users }` to `industryModules.js`.
- Added `"students"` to `INDUSTRY_MODULES.academy`.
- New static route `<Route path="/students" element={<Students/>} />` in `App.jsx`, same pattern as the existing `/trainers` route (not gated through `IndustryScreen` — single-industry, so a plain always-same route matches precedent).
- "Add Student" uses its own inline modal (matching `Trainer.jsx`'s pattern), not `AddCustomer.jsx` — the open question from the original plan, resolved by following precedent.
- **Verified**: `npm run build` passes with no new warnings. Live-tested unauthenticated access to `/students` — correctly redirects to `/login` (same `SubscriptionRoute` guard as every other employer route). Full authenticated UI verification (actually viewing the rendered table/modals with real academy data) was **not** done — no test credentials available in this session; flag if you want that checked before relying on it.

---

## 2. Academy — Fee Dues module — ✅ DONE (2026-09-17)

**What existed before**: a fully-built, session-based due-tracking tab already lived inside `academyRecord.jsx` (richer than the generic retail credit tab — shows Student ID/Name/Phone/Course/Total Fee/Fee Paid/Balance/Status/Action, tab id `"credit"`, label "Fee Dues", confirmed at `academyRecord.jsx:112`). It wasn't reachable except by opening Record and clicking the tab. Academy's `INDUSTRY_MODULES` list had no `"credit"` entry at all, even though `featureFlags.credit = true` for academy already.

**Shipped** (smallest possible version — no UI rebuild, no new route):
- Added `"credit"` to `INDUSTRY_MODULES.academy` in `industryModules.js`.
- Confirmed the implementation detail flagged in the original plan: `AdminLayout.jsx`'s sidebar rendered `<Link to={item.path}>` with **no** `state` prop, so a plain link would have landed on Record's default tab ("sales"), not Fee Dues. Fixed with a one-line addition — `<Link ... state={item.state}>` — reading an optional `state` field off each sidebar item (`undefined` for every other module, so this is a no-op everywhere else).
- Added an academy-specific override in `getSidebarItems()` (same pattern already used there for academy's "Courses" / SD's "Service" inventory relabel): for `industryKey === "academy"` and module key `"credit"`, return `{ label: "Fee Dues", path: "/record", state: { activeTab: "credit" } }` instead of the generic Credit module's own label/path (`/credit`, the standalone `Credit.jsx` page other industries use).
- No new route needed — reuses the existing `/record` route (`ModuleRoute moduleKey="record"`, already allowed for academy).
- Known minor cosmetic overlap (accepted, not fixed — out of scope for a quick win): `AdminLayout`'s `isActive()` highlights by path prefix only, so both the "Record" and "Fee Dues" sidebar entries highlight together whenever the user is anywhere under `/record`, regardless of which tab is actually open.
- **Verified**: `npm run build` passes with no new warnings (pre-existing unrelated `mobilerecord.jsx` duplicate-key warnings only). Live-tested unauthenticated `/record` still correctly redirects to `/login`, no console errors. Full authenticated verification (clicking "Fee Dues" in the sidebar and confirming Record opens on the credit tab with real academy data) was **not** done — no test credentials available in this session; flag if you want that checked before relying on it.

---

## 3. Software Development — Clients module — ✅ DONE (2026-09-17)

**What existed before**: better than the audit first suggested. `SoftwareDevelopmentInventory.jsx` (the "Service" screen) already had a "Service Details / Client Details" tab toggle at the top, with its own search placeholder and an always-visible "Add Client" button that opens `AddClient.jsx` (a full form, already supporting edit via `location.state.client` — this part needed no new work at all).

**Shipped**: new `frontend/src/industry/SoftwareDevelopment/Clients.jsx` — the "Client Details" branch's table/search/fetch logic extracted verbatim from `SoftwareDevelopmentInventory.jsx`'s `activeView === "clients"` code (same `/clients` fetch + filter, same columns: Client Name / Industry / Contact / Project / Type / Deadline / Budget / Actions), wrapped in its own header + "Add Client" button, no `services`/toggle state carried over.

- "Add Client" and the row-level View/Edit actions still navigate to the existing `AddClient.jsx` (`/add-client`, `location.state.client` for edit) exactly as before — matched the existing behavior verbatim, including the pre-existing quirk where the "View" (`BookOpen`) and "Edit" (`Edit3`) row buttons both open the same edit form (no separate read-only view was added — out of scope for a straight extraction, unlike `Trainer.jsx`'s real View modal).
- Added `MODULES.clients = { label: "Clients", path: "/clients", icon: Users }` to `industryModules.js`.
- Added `"clients"` to `INDUSTRY_MODULES.software_development`.
- New static route `<Route path="/clients" element={<Clients/>} />` in `App.jsx`, same single-industry pattern as `/trainers` and `/students`.
- Left the existing "Service Details / Client Details" toggle inside `SoftwareDevelopmentInventory.jsx` untouched — both entry points now coexist (dropping the in-page toggle, if wanted, is a separate follow-up call).
- **Verified**: `npm run build` passes with no new warnings (pre-existing unrelated `SDRecord.jsx` duplicate-key warning only). Live-tested unauthenticated `/clients` — correctly redirects to `/login`, no console errors. Full authenticated UI verification (viewing the rendered client table with real data) was **not** done — no test credentials available in this session.

---

## 5. Mobile Shop — Repair/Warranty Tracking + IMEI Lookup — ✅ DONE (2026-09-17)

**Scope note**: unlike Phases 1–3, this is genuinely new backend work, not a quick win — flagged as such before starting; confirmed via a fresh audit (no `repair`/`warranty`/`claim`/`RMA` hits anywhere in the codebase — see below) and scoped with the user through 3 explicit choices before building: (1) one `RepairTicket` entity with a `ticketType: "repair" | "warranty"` flag rather than two separate entities/models; (2) a "core set" of fields (customer name/phone as free text, not linked to the `Customer` entity; device brand/model/IMEI/issue; status; estimated/final cost; received/promised dates; technician; notes) rather than also linking to the original sale/product; (3) the IMEI lookup screen searches existing `Product.imei1`/`imei2` records only (no cross-reference into repair-ticket history).

**Audit confirmed before building**: zero backend hits for repair/warranty/claim/RMA; `warranty` only existed as a free-text descriptive field on the Product model (`addmobileproduct.jsx`, `mobileinventory.jsx`) with no expiry tracking or claim entity; IMEI (`Product.imei1`/`imei2`, `backend/models/mongodb/Product.js`) only appeared as a searchable/printable product field across `mobilerecord.jsx`, `mobileinventory.jsx`, `addmobileproduct.jsx`, `BarcodePage.jsx`, `SubUserRecordsPage.jsx` — no dedicated lookup screen existed. `Trainer`/`Client` (own Mongoose collection + controller + route file + dual `/api/v2/*` + `/v2/*` server mount) were used as the concrete template for adding a wholly new entity, since — unlike Students/Clients in Phases 1 & 3 — a repair ticket has no existing endpoint to reuse.

**Shipped — Backend** (new `RepairTicket` entity, following the Trainer/Client pattern exactly):
- `backend/models/mongodb/RepairTicket.js` — new Mongoose schema: `tenantId/ownerId/subuserId/createdBy` (standard multi-tenant scoping fields, same as every other entity), `ticketType`, `customerName`, `customerPhone`, `deviceBrand`, `deviceModel`, `imei` (indexed), `issueDescription`, `status` (Received/In Progress/Completed/Delivered/Cancelled), `estimatedCost`, `finalCost`, `receivedDate`, `promisedDate`, `technician`, `notes`.
- Registered in `backend/models/mongodb/index.js` (require + `modelMap['repairtickets']` + export) — same 3 touch points as `Trainer`.
- `backend/controllers/firestoreRepairTicketController.js` — full CRUD (`getRepairTickets`, `getRepairTicketById`, `createRepairTicket`, `updateRepairTicket`, `deleteRepairTicket`), using the shared `getCollection`/`fetchUnifiedData` scoping helpers (`backend/utils/dbUtils.js`) — identical scoping to every other entity (tenantId + effective ownerId, plus subuserId when the caller is a subuser).
- `backend/routes/firestoreRepairTicketRoutes.js` — standard `router.use(auth)` + GET/GET:id/POST/PUT/DELETE.
- Mounted in `backend/server.js` at both `/api/v2/repair-tickets` and `/v2/repair-tickets`, same dual-mount pattern as every other entity route.
- **Verified**: a Node sanity check (`require()` on the new model/controller/route files) loads cleanly with no errors. Full live CRUD against a running MongoDB instance was **not** exercised — no test credentials or local Mongo instance available in this session.

**Shipped — Frontend**:
- `frontend/src/industry/mobile/RepairTickets.jsx` — new screen at `/repair-tickets`, same list/search/add/edit/delete/view shape as `Trainer.jsx`, backed by the new `/repair-tickets` API. A "Repairs" / "Warranty Claims" tab toggle (same UI pattern as SD's existing Service/Client toggle) filters by `ticketType`; the Add/Edit form's own Ticket Type buttons set it. Status shown as a color-coded badge (blue→amber→emerald→green→red across Received→Delivered/Cancelled).
- `frontend/src/industry/mobile/ImeiLookup.jsx` — new read-only screen at `/imei-lookup`. Fetches `/products` (already tenant/owner-scoped server-side — confirmed `mobileinventory.jsx` does no additional client-side owner filtering, so this screen follows the same precedent), filters to only devices with `imei1` or `imei2` set, and lets the user search by IMEI/brand/model. No add/edit/delete — deliberately read-only per the locked scope choice.
- `MODULES.repair_tickets` (`Wrench` icon) and `MODULES.imei_lookup` (`ScanSearch` icon) added to `industryModules.js`; both added to `INDUSTRY_MODULES.mobile_shop` only.
- Two new static routes in `App.jsx`, same single-industry pattern as `/trainers`/`/students`/`/clients`.
- **Verified**: `npm run build` passes with no new warnings. Live-tested unauthenticated `/repair-tickets` and `/imei-lookup` — both correctly redirect to `/login`, no console errors. Full authenticated UI verification (creating a real ticket, confirming the IMEI lookup against real product data) was **not** done — no test credentials available in this session.

---

## 6. Pet Shop — Pet Profile Records — ✅ DONE (2026-09-17)

**Not from the original §4 backlog** — a fresh gap the user spotted while reviewing the current per-industry module report: petshop had no way to record a customer's actual pet (name, species, vaccination history), only the generic Customer entity. Distinct from the still-open "Pet Shop: grooming/service booking" backlog item below — that's appointment scheduling, this is just profile data. Also surfaced in passing: `itemFieldGroups.itemType` is set to `true` for petshop (and clothing/mobile_shop) in `industryProfiles.js`, but is never actually read anywhere in `ItemForm.jsx` or the backend — a dead config flag, not a working product/service toggle. Left as-is (not part of this build; still a quick win worth doing later).

Scoped via 3 explicit choices (all recommended defaults) before building: a customer can have multiple pets (new `Pet` entity with a `customerId` reference, not fields bolted onto Customer); a "core" field set (pet name, species, breed, DOB, owner link with auto-filled phone, last vaccination date, notes) rather than a full repeatable vaccination-history list; a standalone sidebar screen mirroring Trainer/Students, not embedded inside the existing Record screen.

**Shipped — Backend** (new `Pet` entity, same Trainer/Client/RepairTicket pattern):
- `backend/models/mongodb/Pet.js` — new Mongoose schema: standard `tenantId/ownerId/subuserId/createdBy` scoping fields, `customerId` (indexed reference to the linked Customer) + denormalized `customerName`/`customerPhone` for list display without a join, `petName`, `species`, `breed`, `dob`, `lastVaccinationDate`, `notes`.
- Registered in `backend/models/mongodb/index.js` (require + `modelMap['pets']` + export, same 3 touch points as every other entity).
- `backend/controllers/firestorePetController.js` — full CRUD via the shared `getCollection`/`fetchUnifiedData` scoping helpers, identical pattern to Trainer/Client/RepairTicket controllers.
- `backend/routes/firestorePetRoutes.js`, mounted in `backend/server.js` at `/api/v2/pets` + `/v2/pets`.
- **Verified**: Node `require()` sanity check loads the model/controller/routes cleanly. Live CRUD against a running MongoDB instance was **not** exercised — no local Mongo/test credentials in this session.

**Shipped — Frontend**:
- `frontend/src/industry/petshop/Pets.jsx` — new screen at `/pets` (first file in a new `industry/petshop/` folder — petshop previously had no bespoke screens, only the shared `IndustryScreen` registry). Same list/search/add/edit/delete/view shape as `Trainer.jsx`/`Students.jsx`. The Add/Edit form includes a customer search-and-select picker (queries the already-fetched `/customers` list client-side, matches by name/phone) — selecting a customer auto-fills `customerName`/`customerPhone` onto the pet record, with a "Change" option to re-pick.
- `MODULES.pets` (`PawPrint` icon) added to `industryModules.js`, added to `INDUSTRY_MODULES.petshop` only.
- New static route `/pets` in `App.jsx`, same single-industry pattern as the other quick-win screens.
- **Verified**: `npm run build` passes with zero warnings (first build in this whole session with none at all). Live-tested unauthenticated `/pets` — correctly redirects to `/login`, no console errors. Full authenticated UI verification (linking a real customer, saving a pet, confirming it round-trips) was **not** done — no test credentials available in this session.

---

## 7. Pharmacy — Expiry Alerts screen — ✅ DONE (2026-09-17)

**Quick win, no new backend** — unlike Repair Tickets/Pets, expiry dates already exist on every batch-tracked product (`Product.expiryDate`, plus `batchNumber`/`pharmaCompany`/`hsnSac`/`mfgDate` — all persisted via the schema's `strict: false`, populated by `ItemForm.jsx`'s existing `batchExpiryFieldConfig` group for pharmacy). Today that data is only visible as red text while already inside Inventory, with no dedicated view and no real "at a glance" alerting — same gap `UNIFICATION_PLAN.md` §6 already flagged.

**Shipped**: `frontend/src/industry/Pharmacy/ExpiryAlerts.jsx` — new read-only screen at `/expiry-alerts` (first file in a new `industry/Pharmacy/` folder — pharmacy has been fully generic/`IndustryScreen`-driven since the Phase 4 Record consolidation, no bespoke files left). Same shape as `ImeiLookup.jsx`: fetches `/products` (already tenant/owner-scoped server-side, same precedent), filters to items with an `expiryDate` set, computes days-until-expiry client-side, and sorts soonest-first. Three summary tiles (Expired / Expiring within 30 days / Total tracked) plus a search box (product name, batch number, manufacturer) and a status badge per row (red "Expired", amber "Expiring Soon", green "OK"). No add/edit/delete — deliberately read-only, matching the IMEI Lookup precedent, since editing a batch's expiry date is already Inventory's job.
- `MODULES.expiry_alerts` (`AlertTriangle` icon) added to `industryModules.js`, added to `INDUSTRY_MODULES.pharmacy` only (not petshop, even though petshop also has `batchExpiry: true` — scoped to what was asked; trivial to extend later).
- New static route `/expiry-alerts` in `App.jsx`, same single-industry pattern as the other quick-win screens.
- **Verified**: `npm run build` passes with no new warnings. Live-tested unauthenticated `/expiry-alerts` — correctly redirects to `/login`, no console errors. Full authenticated UI verification (real batch data actually showing correct day counts/status) was **not** done — no test credentials available in this session.

---

## 8. Software Development — Milestone Tracker — ✅ DONE (2026-09-17)

**Real backend build**, picked from the earlier per-industry options menu for SD. `billingModel: "milestone"` has been set in `industryProfiles.js` since Phase 2 of `UNIFICATION_PLAN.md`, but nothing backed it — a "service" was still billed as one flat line item (hourly/daily/AMC rate) with no way to break a project into billable milestones. This build makes the label real.

Scoped via 3 explicit choices (all recommended defaults) before building: milestones attach directly to a `Client` via `clientId` (reusing the Client's existing project fields — projectName, budget, deadline — as project context, rather than adding a separate `Project` entity as a third hierarchy level); a "core" field set (title, description, due date, status, amount) rather than also adding an independent 0–100% progress slider; a standalone sidebar screen mirroring Trainer/Pets, not embedded inside the existing Clients screen.

**Shipped — Backend** (new `Milestone` entity, same Trainer/Client/RepairTicket/Pet pattern):
- `backend/models/mongodb/Milestone.js` — new Mongoose schema: standard `tenantId/ownerId/subuserId/createdBy` scoping fields, `clientId` (indexed reference) + denormalized `clientName`, `title`, `description`, `dueDate`, `status` (Not Started/In Progress/Completed/Blocked), `amount`.
- Registered in `backend/models/mongodb/index.js` (3 touch points, same as every other entity).
- `backend/controllers/firestoreMilestoneController.js` — full CRUD via the shared `getCollection`/`fetchUnifiedData` scoping helpers.
- `backend/routes/firestoreMilestoneRoutes.js`, mounted in `backend/server.js` at `/api/v2/milestones` + `/v2/milestones`.
- **Verified**: Node `require()` sanity check loads the model/controller/routes cleanly. Live CRUD against a running MongoDB instance was **not** exercised — no local Mongo/test credentials in this session.

**Shipped — Frontend**:
- `frontend/src/industry/SoftwareDevelopment/Milestones.jsx` — new screen at `/milestones`, same list/search/add/edit/delete/view shape as `Trainer.jsx`/`Pets.jsx`. The Add/Edit form has a client search-and-select picker (queries the already-fetched `/clients` list client-side, matches by name/project) — same UI pattern as the Pets → Customer picker. Status shown as a color-coded badge (gray→amber→emerald→red across Not Started→In Progress→Completed/Blocked). Built in SD's actual blue theme (`AdminLayout.jsx`'s `isSoftwareDev` branch), not the green/emerald default other quick-win screens use, since SD is a themed industry.
- `MODULES.milestones` (`Milestone` icon) added to `industryModules.js`, added to `INDUSTRY_MODULES.software_development` only.
- New static route `/milestones` in `App.jsx`, same single-industry pattern as the other quick-win screens.
- **Verified**: `npm run build` passes with no new warnings. Live-tested unauthenticated `/milestones` — correctly redirects to `/login`, no console errors. Full authenticated UI verification (linking a real client, saving a milestone, confirming round-trip) was **not** done — no test credentials available in this session.

---

## 4. Explicitly not in this plan (deferred backlog, found during the audit)

Real feature gaps, not quick wins — each needs new backend/data-model work:

- **Pharmacy**: drug-license/prescription-required fields (see §7 above for the related-but-distinct expiry-alerting work that *is* done — this is about regulatory enforcement, not visibility), Barcodes/Reports modules currently disabled — enabling those two is actually a one-line `INDUSTRY_MODULES` change if wanted (flagging since it's *almost* a quick win, but changes what pharmacy tenants see by default, worth a deliberate yes/no rather than bundling in silently).
- ~~**Mobile Shop**: repair-ticket/warranty-claim tracking, dedicated IMEI lookup screen~~ — done, see §5 above.
- ~~**Software Development**: real project/milestone tracker~~ — done, see §8 above.
- **Clothing**: true size×color stock matrix (today `variants` just repurposes the description field into a single "Size" label).
- **Pet Shop**: grooming/service booking or appointment system (today `itemType` product-vs-service is a dead config flag, never actually rendered — see §6 above for the related-but-distinct pet profile work that *is* done). Wiring up `itemType` as a real product/service toggle (petshop, clothing, mobile_shop) is close to a quick win and still open too.
- **Cross-industry**: Purchase Order entity/workflow (Purchase → approval → stock update), per-industry dashboard widgets beyond the current academy/non-academy binary.

These are captured here so they're not lost, matching how `UNIFICATION_PLAN.md` §6 tracks its own future roadmap — not scheduled.
