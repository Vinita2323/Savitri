# Super Admin brand-scope audit

Source of truth: `SuperAdminSidebar.jsx` + `SuperAdminRoutes.jsx`. Findings are from code inspection and
grep, not from running the app against MongoDB.

## How scope works today
- Selected brand: `SuperAdminContext` (`selectedBrandId`, persisted in `sessionStorage`). `api.js` sends it on every
  request as `X-Brand-Id`/`X-Region-Id`. `'ALL'` = consolidated.
- Backend: `resolveBrandScope` builds `req.scope`. Trusted brand→record relationships that exist in the schema:
  - `Seller.brandId` / `Seller.brand` (added with the seller-registration feature; **legacy sellers have none**)
  - `Employee.brandId`, `Shift/Holiday/Task/Leave/Attendance.brandId`
  - `Product.brand` (a display string, not a reference)
- **No brand reference exists** on `Order`, `Captain`, `PosSale`, `PayoutRequest`, `RefundRequest`, `ReturnRequest`,
  `PlatformLedger` (only free-form `metadata.brandId` written by some actions), `ProformaInvoice`, `DeliveryChallan`.
  `Order.items[].seller` is a **display-name string**, so an order cannot be linked to a seller/brand reliably.
  These modules are scoped by **city string** (customer shipping city / captain city), which is not a brand relationship
  and is wrong wherever two brands share a city.

## Inventory

| Sidebar item | Route | Data source | Backend endpoint | Brand relationship | Brand-scoped now? |
|---|---|---|---|---|---|
| Financial Dashboard | /dashboard | API | GET /super-admin/dashboard/metrics | orders by shipping city; sellers/captains by scope | Partial (orders: city) |
| Cash and Bank | /cash-bank | **localStorage** | none | none | No (no backend) |
| Seller Payments | /transactions | API + **mock** (`centralLedgerMock`, `brandSellersMock`) | GET /super-admin/transactions | ledger `metadata.brandId`/city, seller ids | Partial; page still mixes mock |
| Customer Payments | /payments, /payments/brands/:slug(/customers/:id) | **mock** | none dedicated | none | No (mock) |
| Seller Payouts | /payouts/sellers, /brands/:slug/seller-payouts(/:sellerId) | **mock** | GET /super-admin/payouts exists, unused by these pages | recipient seller → brand | Backend yes (seller-based); pages are mock |
| Captain Payouts | /payouts/captains | **mock** | same payouts endpoint | captain city only | Backend city-based; page mock |
| Seller Purchases | /seller-settlements | **mock** | none | none | No (mock) |
| Business Brands | /brands, /brands/create, /brands/edit/:id | API | /super-admin/brands | is the brand | n/a (super_admin only) |
| Stores & Sellers | /stores, /brands/:slug/stores | API | GET /super-admin/stores(/:id) | Seller.brandId/brand | **Yes** (was already brand-aware; detail route checks scope) |
| Inventory Control | /inventory | API + mock import | GET /super-admin/inventory, POST /inventory/adjust | sellers → products | **Yes** after this change (seller filter) |
| POS Billing | /pos-billing, /history | API | /pos/* | `PosSale.store.storeId` → Seller | **Yes** after this change (history, stores list) |
| Delivery Partners | /delivery-partners | API + mock import | GET /super-admin/delivery-partners | captain city | City only |
| Quotations (7 routes) | /quotations/* | **mock + localStorage** | none | none | No (no backend) |
| Proforma Invoices (5) | /proforma-invoices/* | API + localStorage | /proforma-invoices | client shipping city | City of the *client*, not brand |
| Delivery Challan (4) | /delivery-challans/* | API | /delivery-challans | client shipping city | City of the *client*, not brand |
| Employees (7 routes) | /employees/* | API | /employees/* | `brandId` fields | Yes via validated scope (see changes); `/:id` mutations not brand-checked |
| Refunds & Returns | /refunds | **mock** | GET /refunds, PUT /refunds/:id/process exist | via order shipping city | Backend city-based; page mock |
| Commissions | /commissions | API | GET /commissions, PUT /sellers/:id/commission | Seller | **Yes** after this change |
| Reports & Analytics | /reports | API + **mock** | GET /reports | mixed | Partial; page mixes mock |
| (redirect) Captain Settlements, Financial Adjustments, Audit Logs | → /dashboard | none | endpoints exist | — | UI not built |
| Unrouted | `SuperAdminPayouts.jsx` | API | /payouts | — | page not reachable |

## Changes made
1. `resolveBrandScope` ran **before** authentication on `/super-admin/*`, so `req.user` was always undefined and the
   brand-authorization branch never executed. Added `protect('admin','super_admin')` before it; the middleware now
   returns 401 for anonymous callers.
2. Authorization: new `isBrandAuthorizedForUser` (super_admin: all; admin: all unless `Admin.authorizedBrands` is set;
   others denied). Applies to specific brands and to `ALL`.
3. Brand lookup no longer builds a regex from user input and no longer picks an arbitrary brand when a city has several.
4. New `sellerScopeFilter` / `sellerInScope`: seller→brand by `brandId`/`brand`; legacy unassigned sellers fall back to
   city **only if that brand is the only brand in the city**; checks fail closed (previously a seller with no city passed).
   Used by commissions list/update, seller payout recipient checks (4 places), inventory, POS stores and POS history.
5. POS history: an explicit `storeId` query could read another brand's sales; now it can only narrow within the scope.
6. Employee routes: `brandId` in query/body is pinned to the validated scope.
7. Frontend: removed the hardcoded brand array and the `brand_fg` default (default is `ALL`); brand list refreshes even
   when it becomes empty; `api.js` drops Super Admin responses whose `X-Brand-Id` no longer matches the selected brand.

## Not done / blockers
- **Orders, captains, refunds, ledger, payouts for captains, challans, proformas have no brand reference.** City-based
  scoping leaks across brands sharing a city. Fix needs a schema addition (e.g. `Order.brandId` stamped at order creation from
  the seller's brand) plus a reconciliation script for existing records; not auto-assigned here.
- **Pages still on mock/localStorage** (listed above) were not converted; several need new endpoints (customer payments,
  seller purchases, cash & bank, quotations). Refunds, seller/captain payouts and reports have backend endpoints and can be wired next.
- Employee `/:id` update/delete/approve endpoints do not verify the record's brand.
- Challan/proforma/POS **create/update** mutations were not audited for cross-brand writes.
- Legacy sellers without `brandId` need a reviewed backfill.
