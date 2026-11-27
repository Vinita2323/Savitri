# Brand-wise Admin permissions

Extends Admin Configuration (`docs/ADMIN_CONFIGURATION.md`). One Admin account can hold several brands, and the Super Admin now
chooses separately for each brand what the Admin may do there. The login, roles, Admin panel and City Admin feature are unchanged.

## How it works

| Question | Decided by |
|---|---|
| Which brands may this admin use? | `Admin.authorizedBrands` (unchanged, managed by Admin Configuration) |
| What may the admin do in brand X? | the `AdminBrandAccess` record for (admin, X), if the account has `permissionMode: 'PER_BRAND'` |
| Which permission does this API call need? | `Backend/src/utils/permissionRules.js` (one table for the whole API) |

Every request from a per-brand admin goes through `protect()` → `checkAdminRequest()` (`middleware/adminPermissionGate.js`):

1. Look up the call in the rule table. **No rule = refused** (403 `PERMISSION_DENIED`), so a new endpoint is closed to these admins until it is listed.
2. Work out the one brand the request names (header, query or body). Two different brands, a list, `ALL`, or a brand that is not assigned → 403. With no brand named, an admin with exactly one brand works in that brand.
3. Load the active `AdminBrandAccess` record for (admin, brand) from the database. No record, an inactive one, or damaged data → nothing is allowed.
4. Check the permission. Then **pin the request to that brand**: `authorizedBrands` for this request becomes `[brand]` and the brand headers are overwritten. The existing scope and record-ownership checks (`resolveBrandScope`, `sellerInScope`, `canAccessProduct`, `brandRecordGuards`, …) then treat every other brand, including the admin's own other brands, as foreign.

Calls that concern only the admin's own account (`/auth/*`, profile, my-brands, own documents, the brand list, push tokens) are always allowed.

`GET /api/products` and `GET /api/products/:id` are public routes. `staffViewGate` gives the admin view only to a valid admin token that has the permission. Otherwise the caller gets the shop view, or a 403 when the call came from the Admin panel.

### Modules and actions

Defined in `utils/permissionCatalog.js` (the Super Admin screen reads it from the API). Actions: view, create, edit, delete, approve, reject, export, manage. Each module lists only the actions that exist for it, and every other action requires View.

- **Sensitive** actions (payout approve/reject/pay, payroll approve/pay, finance entries, commission changes, referral credit, employee password reset, proforma payment) are never part of a preset and must be ticked one by one.
- **Shared** modules (categories, promotions, FAQs/policies, pricing, platform settings) change data used by every brand. The screen warns about this.
- **Super Admin only** stays so: brands, admin accounts, platform commission rates, payroll policy, payroll payment reversal, payroll audit, financial adjustments, ledger. These are not in the catalogue, so no permission can unlock them.

Approve and reject are separate: the rule reads the requested status from the body (for example seller status `approved` needs approve, `rejected` or `suspended` needs reject). An unknown value needs both.

### Role presets

`ADMIN`, `SUB_ADMIN`, `CUSTOM` are starting points, not login roles. Choosing one copies its permissions into the brand record. Later changes to that brand never change the preset or the admin's other brands.

## Database

| Collection | Purpose |
|---|---|
| `adminbrandaccesses` | `{ adminId, brandId, roleProfile, permissions: { module: [actions] }, isActive, createdBy, updatedBy, timestamps }`, unique index on `(adminId, brandId)` (created on first write; autoIndex is off) |
| `adminpermissionlogs` | append-only audit log: CONFIGURED / UPDATED / REVOKED with before, after and who |
| `admins.permissionMode` | new optional field; `'PER_BRAND'` switches the account to per-brand permissions |

Assignment changes keep the records in step:

| Change | Effect on permissions |
|---|---|
| Brand added | starts with no permissions (allows nothing) until configured |
| Brand removed | record switched off immediately (logged) |
| Brand moved | the previous holder's record is switched off; the new holder gets only what was configured for them |
| Brand shared | each admin keeps a separate record |
| Brand removed and later given back | starts again from nothing (old permissions are not restored) |
| Brand deleted | all records for it switched off; access records no longer block deleting a brand |
| Admin deactivated | every request refused (existing behaviour); records kept |
| Admin reactivated | records for brands still assigned apply again; the old sessions stay invalid |
| Admin made City Admin | `permissionMode` removed and records switched off; City Admin permissions apply |

## Migration

Nothing changes for existing accounts until someone acts:

- New admins created in Admin Configuration are per-brand from the start.
- Existing admins keep full access inside their brands (the screen shows "Full access"). When the Super Admin configures one of their brands and saves, the account switches over with no confirmation: the configured brands get what was chosen, and every other brand gets its own full-access record, so nothing is lost. "Configure Access" on such a brand starts with everything ticked.
- `Backend/scripts/migrateAdminBrandPermissions.js` switches existing brand-limited admins without changing what they can do (full permissions in each of their brands):

```
node scripts/migrateAdminBrandPermissions.js                       # dry run, writes nothing
node scripts/migrateAdminBrandPermissions.js --apply --admin=x@y   # one account
node scripts/migrateAdminBrandPermissions.js --apply               # all brand-limited admins
node scripts/migrateAdminBrandPermissions.js --apply --preset=SUB_ADMIN   # reduces access
```

The script never touches City Admins, Super Admins, or older admins that can use every brand (it lists those: assign their brands first). Running it again changes nothing. Run the dry run against production first and keep a database backup.

## APIs

| Method | Path | |
|---|---|---|
| GET | `/api/super-admin/admin-config/permission-catalog` | modules, actions, presets |
| GET | `/api/super-admin/admin-config/permission-history?adminId=&brandId=` | audit log |
| POST | `/api/super-admin/admin-config/admins` | now also accepts `access: [{ brandId, roleProfile, permissions }]` |
| PUT | `/api/super-admin/admin-config/admins/:id/brands` | same `access`; for an older account, brands left out of `access` keep full access |
| GET | `/api/admin/my-brands` | adds `enforced`, `allActions` and each brand's `configured`, `roleProfile`, `permissions` |

Unknown modules, unknown actions, actions without View, brands not assigned to the admin, duplicates and unknown presets are refused with 400.

## Admin panel

- `utils/adminPermissions.js` holds the permissions of the brand shown now. `AdminBrandGate` loads them with the brand list, reloads the panel when the brand or its permissions change (switching, or a change detected on focus or after a 403), and clears them when leaving the panel.
- The sidebar, header links and the in-page tab strips (employees, purchases) show only allowed sections. An address that is not allowed shows "You do not have access to this section" and loads no data. View-only sections show a notice.
- Buttons are marked `data-perm="module.action"` (294 controls in 44 files). A stylesheet generated from the permissions hides those the admin lacks; `super.only` marks Super Admin controls.
- The task "people remembered" list is kept per brand, and browser-only products are not shown while a brand is selected.

Hiding is only for convenience: the server checks every request.

## Adding an endpoint

Add a rule to `permissionRules.js`. Without one, per-brand admins get 403. The coverage script used in testing lists every mounted route that has no rule.

## Tests (in-memory test database only)

| Suite | Result |
|---|---|
| Per-brand permissions API (example admin with 4 brands, all 28 module probes per brand, switching, tampering with brand ids, aliases, path case, HEAD, record ownership across own brands, presets, overrides, sharing, moving, removing, deactivation, damaged data, migration script, City Admin, Super Admin, brand deletion) | 549 / 549 |
| Per-brand permissions API: now also covers an older admin keeping full access in brands not configured | 550 / 550 |
| Per-brand permissions browser test (configure drawer, presets, saved status, history, sidebar, hidden buttons, blocked addresses, switching, no cached data, live permission change, older admin editing, phone width) | 47 / 47 |
| "Select all" per section in the drawer | 12 / 12 |
| Brand isolation, existing access mode / every permission granted | 870 / 870 each |
| Record-by-id checks, both modes | 30 / 30 each |
| Admin Configuration browser suite (every permission granted) | 63 / 63 |
| City Admin API | 98 / 98 |
| Payroll, admin purchases, selfie/seller, report periods | 121, 93, 92, 29 all passing |
| Backend unit tests | 47 / 47 |
| Frontend production build | passes |

## Remaining risks

- **Rule table upkeep.** A new endpoint is closed to per-brand admins until a rule is added (safe, but it can look like a bug).
- **Shared modules** (categories, promotions, content, pricing, settings) affect all brands. Grant them carefully.
- **Two permission systems.** City Admins keep their older area-level permission list, as required. They are not merged.
- **Hidden buttons.** These cover the controls found in the Admin pages. A missed button would show but its action would be refused by the server with a message.
- **One extra database read** per admin request (the brand's access record).
- **Older admins** keep full access inside their brands until they are configured or migrated.
