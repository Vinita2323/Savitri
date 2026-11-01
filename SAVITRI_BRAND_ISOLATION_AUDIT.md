# SAVITRI - Brand Isolation Audit

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

Brand management and isolation completion: **50.0%** (7 working / 5 partial / 0 pending / 7 failed of 19).

| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brand reference on documents | 7 | 2 | 1 | 0 | 4 | 0 | 35.7% |
| Admin mapped to authorised brands | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| SA global view | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Brand switching loads correct data | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Sellers belong to correct brand | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Products & inventory scoped | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Orders associated with brand | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Transactions/commissions association | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| Reports use brand filters | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| Cross-brand prevention (restricted users) | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Backend validates brandId (not trusting UI) | 1 | 1 | 0 | 0 | 0 | 0 | 100.0% |
| No multi-brand data without authz | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| Hard-coded/seeded brand data | 1 | 0 | 1 | 0 | 0 | 0 | 50.0% |
| **TOTAL** | **19** | **7** | **5** | **0** | **7** | **0** | **50.0%** |

| Module | Evidence |
|---|---|
| Brand reference on documents | Seller + HR collections carry brandId. Product indirect via seller. Order, PayoutRequest, PlatformLedger, RefundRequest have none. |
| Admin mapped to authorised brands | Admin.authorizedBrands exists but empty/undefined means ALL brands (fail-open); no API to manage it. |
| SA global view | ALL scope verified. |
| Brand switching loads correct data | Stores/inventory/payouts/employees/dashboard differ by X-Brand-Id. |
| Sellers belong to correct brand | Seller.brandId + legacy city fallback. |
| Products & inventory scoped | Scoped through seller; product has no brand field of its own. |
| Orders associated with brand | Derived from city/seller, no stored brand reference. |
| Transactions/commissions association | City-based filter through ledger/sellers. |
| Reports use brand filters | Scoped; verified for dashboard metrics/inventory/payouts. |
| Cross-brand prevention (restricted users) | Fails on /admin/*, /returns/admin/*, /orders/seller/*, /products; holds on /super-admin/*, /employees list, challans. |
| Backend validates brandId (not trusting UI) | resolveBrandScope validates id, authorisation and pins body/query on /employees. |
| No multi-brand data without authz | /admin/* and /super-admin/brands return cross-brand data to restricted admins. |
| Hard-coded/seeded brand data | Baseline brands auto-seeded on every scoped request when collection empty. |

## How scoping works
`resolveBrandScope` reads `X-Brand-Id` / `?brandId` / `?region` / `body.brandId`, resolves a Brand by ObjectId, `brandId` or code (city name only if unique), validates the user with `isBrandAuthorizedForUser`, and sets `req.scope`. Missing/`ALL` means consolidated scope and is allowed only for users authorised for every brand. `sellerScopeFilter` then selects sellers by `brandId`, `brand` ObjectId, or - for pre-brand legacy sellers - city when the brand is the only one in that city.

**Authorisation rule:** `super_admin` -> all; `admin` -> all unless `authorizedBrands` is a non-empty array not containing `'*'`; any other role denied. **An admin with no list is unrestricted (fail-open).**

## Route-by-route isolation status
| Route group | Scope applied | Restricted user blocked | Result |
|---|---|---|---|
| /super-admin/payouts, refunds, stores, inventory, delivery-partners, dashboard, reports (via resolveBrandScope) | Yes | Yes - 403/400 as appropriate | Verified |
| /employees/* (list, create, attendance records, task list, dashboard) | Yes (router.use + pins query/body) | Yes | Verified; forged brandId neutralised |
| /employees/:id, PUT /employees/:id, PATCH /employees/:id/status, PATCH /employees/tasks/:id/status, PATCH /employees/leaves/:id/review | Scope resolved but not applied to the record lookup | No | **Cross-brand read/modify verified** |
| /delivery-challans, /proforma-invoices (list) | Yes (city regex on shipping address) | Header required for restricted admin | Verified list; city-based, not brand-id based |
| /admin/* (dashboard, users, sellers, captains, orders and mutations) | **No** | **No** | Unauthenticated; cross-brand read/modify verified |
| /returns/admin/* | **No** | No | Cross-brand list and approve verified |
| /orders/seller/notifications/* | No (ownership missing) | No | Cross-seller accept verified |
| /products | No | No | Anonymous and cross-seller writes verified |
| /super-admin/brands (GET) | No filtering by authorizedBrands | No | Restricted admin sees all brands |

## Verified cross-brand actions by an FG-only admin
| Action | Expected | Actual |
|---|---|---|
| `GET /super-admin/payouts` with `X-Brand-Id: brand_fh` | 403 | 403 PASS |
| Same with `?brandId=brand_fh`, no header, or `ALL` | 403 | 403 PASS |
| `GET /admin/sellers` | only FG | returned FH seller too - FAIL |
| Suspend FH seller | blocked | seller suspended - FAIL |
| Change FH seller commission | blocked | commission set to 77 - FAIL |
| Approve FG payout as FH admin | blocked | 403 PASS |
| Cancel FG order as FH admin | blocked | order cancelled - FAIL |
| List/approve FG return as FH admin | blocked | listed and approved - FAIL |
| Read/edit/deactivate FG employee as FH admin | blocked | all succeeded - FAIL |
| Complete FG task as FH admin | blocked | succeeded - FAIL |
| Create employee with forged `brandId` | stored under validated brand | stored under validated brand PASS |
| Assign FG employee a task from FH scope | blocked | 400 PASS |

## Data-model findings (57 models)
- **Have a brand reference:** Admin (`authorizedBrands`), Brand, Seller (`brandId`, `brand`), Employee, EmployeeTask, Attendance, LeaveRequest, Holiday, Shift; Product has a `brand` field that is a free-text label (the verified product stored an empty string), so products inherit brand only through their seller.
- **No brand reference (isolation by derivation only):** Order, PayoutRequest, WithdrawalRequest, PlatformLedger, RefundRequest, ReturnRequest, Category, Banner, User, DeliveryChallan, ProformaInvoice, PosSale. Derivation uses city strings or seller join, so brand re-assignments, same-city brands and reports that run without a seller lookup can mis-attribute records.
- **Recommendation:** add `brandId` (indexed) to Order, PayoutRequest, PlatformLedger, RefundRequest, ReturnRequest, DeliveryChallan, ProformaInvoice, PosSale and set it server-side from the seller at creation.

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.
