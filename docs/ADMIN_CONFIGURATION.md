# Admin Configuration and multi-brand assignment

## How it works
- Super Admin opens **Admin Configuration** (`/super-admin/admin-configuration`) to create admins and assign brands.
- An admin created there signs in at the existing `/admin/login` and uses the existing Admin panel.
- An admin limited to brands picks one of **their** brands in the header switcher. Every page shows that brand. There is no combined view across brands.
- The server reads the assignment from the database on every request, so a change applies to the next click. No re-login is needed.
- A brand held by another admin can only be taken with an explicit **Move** or **Share**. A City Admin's brand can be shared, not moved.
- Naming a brand that is not yours returns **403**. A record of another brand addressed by its id is refused (mostly **404**, the existing convention).

## Database changes
| Change | Detail |
|---|---|
| `Admin.brandAccess` | `ASSIGNED` for admins managed here: only the listed brands; an empty list means no access. Optional. |
| `Admin.exclusiveBrands` | Brands held without sharing. Unique index, created automatically on first use. |
| New collection `adminassignmentlogs` | Brand, action, previous admin, new admin, changed by, date and time. |

**Migration:** none. Existing accounts are not rewritten. An older account changes only when a Super Admin saves its brands (with a confirmation if it could use all brands), or when one of its listed brands is deleted.

## API endpoints
New, Super Admin only (`/api/super-admin/admin-config`):

| Method | Path |
|---|---|
| GET | `/overview`, `/history`, `/admins`, `/admins/:id` |
| POST | `/admins`, `/admins/:id/reset-password` |
| PUT | `/admins/:id`, `/admins/:id/brands` |
| PATCH | `/admins/:id/status` |

New for the signed-in admin: `GET /api/admin/my-brands`.

Brand checks added to: profile edit requests, memberships (subscriptions and statistics), referrals, registration fee payments, freight bookings, commission reports, POS, delivery challan and proforma pickers, treasury settlement unmatch and refund sync, admin purchases, admin product list, store list, and the older admin brand-access editor.

## Behaviour changes for existing accounts
- **Super Admin** and admins who can use all brands: no change.
- **City Admins** and older admins limited to specific brands: the pages listed above now show only their brand.

## Existing problems fixed along the way
1. The admin endpoints for profile edit requests had **no role check**: any signed-in user, including a customer, could list and approve them.
2. An admin with two or more brands got 403 on most Admin panel pages.
3. The admin product list was cached and shared between admins.
4. Deleting an admin's only brand gave that admin access to **all** brands.
5. The admin freight booking list failed once a booking had a customer (`User` was not imported).

## Files
**New:** `Backend/src/` `controllers/myBrandsController.js`, `middleware/brandRecordGuards.js`, `middleware/posBrandGuard.js`, `models/AdminAssignmentLog.model.js`, `routes/adminConfigRoutes.js`, `services/adminAccountService.js`, `utils/adminAccess.js`, `utils/restrictedAdmin.js`.
`Frontend/src/` `modules/super-admin/pages/SuperAdminAdminConfig.jsx`, `modules/super-admin/components/admin-config/AdminConfigParts.jsx`, `modules/admin/components/AdminBrandGate.jsx`, `services/adminConfigService.js`, `utils/adminBrand.js`.

**Modified (backend):** controllers `adminPurchase`, `brand`, `captainRegistrationFee`, `commissionSettings`, `deliveryChallan`, `employeeAdmin`, `employeePortal`, `membership`, `pos`, `product`, `profileEditRequest`, `proformaInvoice`, `referral`, `sellerRegistrationFee`, `superAdminFinancial`, `transportBooking`, `treasury`; routes `adminPurchase`, `admin`, `captainRegistrationFee`, `commission`, `deliveryChallan`, `membership`, `pos`, `profileEditRequest`, `proformaInvoice`, `referral`, `sellerRegistrationFee`, `transportBooking`; `middleware/authMiddleware.js`, `middleware/scopeMiddleware.js`, `models/Admin.model.js`, `services/cityAdminService.js`, `server.js`.

**Modified (frontend):** `AdminHeader.jsx`, `AdminLayout.jsx`, `EmployeeContext.jsx`, `PurchaseViews.jsx`, `SuperAdminSidebar.jsx`, `SuperAdminRoutes.jsx`, `services/api.js`.

## Test results (isolated test database)
| Test | Result |
|---|---|
| Brand isolation, API (12 brands, two admins with five each) | 870 / 870 |
| Other brands' records by id, own purchases, City Admin conversion | 30 / 30 |
| Admin Configuration and Admin panel, browser | 63 / 63 |
| City Admin | 98 / 98 |
| Salary and payroll | 121 / 121 |
| Admin purchases | 93 / 93 |
| Employee selfie and seller flows | 92 / 92 |
| Report periods | 29 / 29 |
| Purchase page merge, documents pages, session and PDF checks | all passed |
| Backend unit tests | 47 / 47 |
| Frontend production build | passed |

## Remaining risks and limits
1. **Platform-wide settings are not brand data** and a brand-limited admin can still change them for everyone: categories, banners, FAQs, policies, support settings, pricing, vehicle types, membership plans, referral settings, registration fee settings, membership expiry run.
2. **Captains are matched by city.** Brands in the same city share captains.
3. **Customers belong to a brand through their orders**, so one customer can appear under several brands. Blocking a customer still needs all-brand access.
4. **Older admins with no brand list still see all brands** until a Super Admin assigns brands to them.
5. Creating a **City Admin** on a brand page does not check Admin Configuration, so that brand ends up shared.
6. The **file upload endpoint** requires no login (existing, not changed).
7. The test database cannot run MongoDB transactions, so treasury money movements were not exercised.
8. Allowed actions were tested on a sample of endpoints, not every write in every module.
