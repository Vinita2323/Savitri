# SAVITRI - Pending Features and Recommended Next Phases

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

## A. Not implemented (confirmed by probes and code search)
| # | Missing capability | Needed for |
|---|---|---|
| 1 | Admin management API (create, list, update, deactivate, delete, reset password) | Super Admin control of Admins |
| 2 | Admin permission model (module/action permissions) + `requirePermission()` middleware | "Admin sees only authorised modules" |
| 3 | Admin status (`isActive`/`status`), session revocation, per-request admin reload in `protect()` | Deactivated admin cannot call APIs |
| 4 | Brand-to-admin assignment API (`authorizedBrands`) with fail-closed default | Brand connectivity |
| 5 | Notification APIs for Admin/Super Admin | Notifications module |
| 6 | Quotation entity (model, CRUD, status, brand scope) - today only an e-mail sender | Quotation management |
| 7 | Global settings module (platform config) beyond commission/pricing/policies | Global settings |
| 8 | Comprehensive audit trail (admin actions, brand and HR changes, seller approvals) | Audit logs |
| 9 | Store write APIs (stores are sellers) and Super Admin product approval workflow | Store/product governance |
| 10 | Admin-created sellers (admin onboarding on behalf of seller) | Test 2 workflow |
| 11 | Replace frontend-only panels (`mywillbook-super-admin`, `brand-super-admin`) with real API-backed screens, or remove them | Admin Management UI |

## B. Implemented but failing (fix before anything else)
See Security Audit C1-C3, H1-H8 and API Test Results failed list: missing `protect()`; ownership checks (orders, products, seller notifications); brand scope on legacy routes and by-id HR endpoints; Super Admin role mismatches; 500s on bad input; seller earnings on admin Delivered; withdrawal/payout status sync.

## C. Implemented but not tested in this audit
Captain app (jobs, COD settlement, wallet), transport bookings, POS billing, delivery challan and proforma invoice success paths, membership purchase, referral, ratings, wishlist sync, FCM push, Socket.IO delivery, Cloudinary uploads, seller registration (OTP + fee), seller/captain registration-fee webhooks, e-mail sending.

## D. Recommended phases
**Phase 0 - Stop the bleeding (days).** Add `protect(...)` to every route in `adminRoutes.js`, `productRoutes.js`, `faqRoutes.js`, `supportRoutes.js` (writes), `vehicleTypeRoutes.js`, `sellerRoutes.js` DELETE, `uploadRoutes.js`; remove the JWT fallback secret and fail on startup if `JWT_SECRET` is missing; restrict CORS to an allow-list; add helmet, login/OTP rate limiting and lockout; stop returning OTP and stack traces; add ownership checks to `getOrderById`, seller notification actions and product update/delete.

**Phase 1 - Identity & permissions.** Add `status`, `permissions[]` and `authorizedBrands` (required for `admin`) to `Admin`; make `protect()` load the admin and reject inactive ones; build Admin-management endpoints and a `requirePermission` middleware; make `resolveBrandScope` fail-closed; normalise role strings (`super_admin`) in one constant.

**Phase 2 - Brand isolation everywhere.** Add `brandId` to Order, PayoutRequest, WithdrawalRequest, PlatformLedger, RefundRequest, ReturnRequest, DeliveryChallan, ProformaInvoice, PosSale; backfill from sellers; apply `resolveBrandScope` + scoped queries to `/admin/*`, `/returns/admin/*` and by-id HR endpoints; filter `GET /super-admin/brands` by `authorizedBrands`.

**Phase 3 - Financial integrity.** Credit seller earnings and write ledger rows in one place regardless of which actor marks an order Delivered; sync WithdrawalRequest <-> PayoutRequest; decide whether admins may approve payouts/change commission and remove the duplicate routes; add an order status state machine and 4xx validation for bad enums/ids/negative values; wrap multi-document money movements in transactions (replica set required).

**Phase 4 - Missing modules.** Quotations, admin/SA notifications, settings, audit trail, store/product approval; connect or retire the mock panels; remove demo seed data from controllers.

**Phase 5 - Quality gates.** API integration tests against `mongodb-memory-server` (the harness approach used here is a starting point) for every route in the inventory, with auth and brand matrices generated from the route table; CI `npm audit`; load and concurrency tests for stock and payouts.
