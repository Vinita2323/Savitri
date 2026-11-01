# SAVITRI - Admin <-> Super Admin Connectivity

_Audit date: 2026-11-01 | Scope: Backend (Express 5 / Mongoose 9) with Admin & Super Admin focus | Mode: audit only, no source changes_

Connectivity completion: **52.6%** (18 working / 4 partial / 8 pending / 8 failed of 38).

| Module | Total Features | Working | Partial | Pending | Failed | Untested / Blocked | Completion % |
|---|---:|---:|---:|---:|---:|---:|---:|
| A. Admin creation by SA | 7 | 2 | 1 | 4 | 0 | 0 | 35.7% |
| B. Admin updates by SA | 5 | 0 | 1 | 3 | 1 | 0 | 10.0% |
| C. Brand connectivity | 8 | 5 | 1 | 0 | 2 | 0 | 68.8% |
| D. Data synchronisation | 11 | 9 | 1 | 1 | 0 | 0 | 86.4% |
| E. Permission tests | 7 | 2 | 0 | 0 | 5 | 0 | 28.6% |
| **TOTAL** | **38** | **18** | **4** | **8** | **8** | **0** | **52.6%** |

| Module | Evidence |
|---|---|
| A. Admin creation by SA | Admin login OK, blocked from SA-only APIs. No create/assign-permission API; brand assignment possible only by editing DB field. |
| B. Admin updates by SA | No update API. authorizedBrands is read live from DB (mechanism exists). Deactivation impossible; deleted admin token still works. |
| C. Brand connectivity | Brand create/store/switch/scoped isolation OK. Legacy routes bypass scope; assignment only via DB. |
| D. Data synchronisation | Seller, product, inventory, order, commission, refund, employee, attendance, task visible to SA. Payout partly synced. Quotation has no entity. |
| E. Permission tests | SA-only APIs blocked and self-escalation blocked; other-brand data, global settings, payout restriction, revoked admin, unauthenticated legacy routes fail. |

## Workflow A - Admin creation
| Step | Result |
|---|---|
| Super Admin creates Admin | **NOT IMPLEMENTED** (endpoint probes 404). `Admin` documents are created only through scripts/DB. |
| Stored in MongoDB | n/a |
| Assign brand | Possible only by writing `Admin.authorizedBrands` in the database. No API/UI. |
| Assign permissions | **NOT IMPLEMENTED** - no permissions field or module-permission middleware. |
| Admin can log in | PASS (`POST /auth/admin/login`; wrong password 401; empty 400; operator-injection payload -> 500). |
| Admin sees only authorised modules | **NOT IMPLEMENTED** - role is the only discriminator. |
| Admin blocked from unauthorised APIs | PASS for SA-only routes (transactions, commissions, audit-logs, reports, brand writes, withdrawals, inventory adjust: all 403). FAIL for unauthenticated legacy routes. |

## Workflow B - Admin updates
| Step | Result |
|---|---|
| SA updates admin details / persisted / reflected | **NOT IMPLEMENTED** (an admin can update only their own profile). |
| Permission change takes effect | PARTIAL - `authorizedBrands` is re-read from MongoDB on every scoped request when it is not in the token (tokens do not embed it), so a DB change applies immediately. |
| Deactivated admin cannot access protected APIs | **FAIL** - no status field; a deleted admin's token still returned 200 on `/super-admin/payouts`. |

## Workflow C - Brand connectivity
Brand created (201) and persisted with generated `brandId`; editable, toggleable and deletable only by Super Admin (admin 403 on every write). Admin scoped to FG saw FG data and got 403 on FH, on `ALL` and when no brand was supplied. Forged `brandId` in the body/query of `/employees` writes was neutralised (employee stored under the validated brand). **Failures:** unrestricted admins reach every brand; `/admin/*`, `/returns/admin/*`, order and seller mutations ignore brand; by-id employee/task endpoints ignore brand.

## Workflow D - Data synchronisation (Admin action -> Super Admin visibility)
| Item | Result |
|---|---|
| Seller approval | PASS (visible in /admin/sellers and /super-admin/stores) |
| Product create/update | PASS (visible in admin list and SA inventory) |
| Inventory changes | PASS (seller edit and SA adjustment persisted) |
| Order status | PASS |
| Commission | PASS (SA view reflects update) |
| Payout | PARTIAL (PayoutRequest PAID; WithdrawalRequest stays PENDING) |
| Refund | PASS (SA list/process; auto-creation from returns not verified end-to-end) |
| Employee / attendance / tasks | PASS (SA sees all brands via ALL, or one brand) |
| Quotation | NOT APPLICABLE - no quotation entity is persisted |

## Workflow E - Permission tests
| Scenario | Result |
|---|---|
| Admin accessing Super Admin APIs | PASS (403) |
| Admin accessing another Admin's records | n/a - no admin-records API |
| Admin accessing another brand's data | FAIL on legacy routes (see Brand Isolation) |
| Admin changing its own role | PASS (ignored) |
| Admin modifying permissions | n/a - none exist |
| Admin modifying global settings | FAIL - `PUT /admin/commission-settings` succeeds for a brand-restricted admin |
| Admin performing payout approval | By design allowed (`payoutAuth`); flag as a policy decision |
| Inactive admin | FAIL |
| Requests without JWT | PASS on /super-admin/*, /employees; FAIL on /admin/*, /products, /faqs, /support-settings, /transport/vehicles, /sellers/:id DELETE |

## End-to-end workflow log
| Test | Scenario | What happened | Verdict |
|---|---|---|---|
| TEST 1 | Super Admin -> Create Brand -> Create Admin -> Assign Brand -> Assign Permissions -> Admin Login | Brand create: PASS (201, persisted, duplicate/validation rejected). **Create Admin: NOT POSSIBLE** (POST /super-admin/admins, /admin/create, /auth/admin/register all 404). Assign brand/permissions: NOT POSSIBLE via API (brand field set directly in DB for the test). Admin login: PASS. | PARTIAL - 2 of 5 steps exist |
| TEST 2 | Admin -> Create Seller -> Seller Login -> Create Product -> Admin Views Product -> SA Views Product | Admin cannot create sellers (self-registration only; registration blocked by OTP/fee). Seeded seller -> admin approval PASS -> product create PASS -> admin product list PASS -> SA inventory (brand_fg) shows it PASS, brand_fh does not PASS. | PARTIAL - seller creation by admin not implemented; rest PASS |
| TEST 3 | User -> Browse -> Place Order -> Seller Receives -> Admin Monitors -> SA Views | Browse PASS; COD order PASS (stock decremented, commission snapshot stored); seller notification PASS (only to owning seller); admin sees order PASS; SA sees order PASS; status update persists and user gets notifications PASS. But order has no brand reference; a different brand's admin also sees/cancels it. | PASS functionally / FAIL isolation |
| TEST 4 | Admin -> Manage Commission -> Seller Earnings Updated -> SA Views Commission | SA commission update persisted and visible in /super-admin/commissions. Admin route also changes it. Marking order Delivered via admin did **not** credit seller earnings (totalEarnings 0, wallet unchanged) although two ledger rows were created. | PARTIAL |
| TEST 5 | Admin -> Process Payout -> SA Monitors -> Final Status Sync | Seller withdrawal debited wallet and created WithdrawalRequest + PayoutRequest. Admin and SA can approve; SA processed with mock UTR -> PAID; duplicate process and reject-after-paid blocked; cross-brand admin approve blocked (403). **WithdrawalRequest remained PENDING** (no sync to PayoutRequest). | PARTIAL |
| TEST 6 | Super Admin -> Change Admin Permissions -> Admin Access Updated | No permissions model/API. Changing `authorizedBrands` directly in DB would take effect immediately (read live per request) - mechanism present, UI/API absent. | FAIL (not implemented) |
| TEST 7 | Super Admin -> Switch Brand -> Brand Data Changes -> Verify Isolation | Stores, inventory, payouts, dashboard metrics, employees and challans change with X-Brand-Id; invalid brand 400; restricted admin 403 for other brands/ALL. Legacy /admin/* routes ignore the switch. | PARTIAL |

## Method and environment (applies to all reports)

- **Isolated environment.** The backend (`Backend/src/server.js`) was started on port 5099 against a throw-away in-memory MongoDB (`mongodb-memory-server`, database `savitri_audit_test`). The Atlas URI in `Backend/.env` was **overridden for the process and never connected to**. No production data was read or written.
- **No real external effects.** Razorpay, Cloudinary, SMS, Firebase and SMTP credentials were replaced with dummy values for the test process; nothing was charged, paid out, texted, e-mailed or pushed. Payout "processing" used mock UTR strings only.
- **No source changes.** Test harness scripts live outside the repository (session scratchpad). `git status` was clean before and after (see end of the complete audit report).
- **Test accounts.** One super admin, four admins (one unrestricted, FG-only, FH-only, one deleted mid-test), two approved sellers + one pending seller, two users, seeded directly into the test DB. Admin login endpoints were exercised through HTTP; other role tokens were minted with the test secret using the same payload shape as the app's own `generateToken` (seller/user login needs OTP/SMS, which is out of scope).
- **Totals.** 275 test records were produced; after discarding tests that were invalid because of the harness (wrong request contract, GET-with-body, contaminated data) and re-running them correctly, **263 are reported** (261 conclusive, 2 inconclusive). 17 additional "does this endpoint exist?" probes are reported as *missing modules*, not as API failures.
- **Several failing rows share one root cause** (e.g. one missing `protect()` produces many rows). Counts of failed rows are therefore **not** counts of distinct defects; distinct defects are listed in the Security Audit.
- **Completion formula.** Completion % = (Working + 0.5 x Partial) / Total features. Features are the checkable behaviours enumerated per module in this report series; "Untested / Blocked" features earn no credit. This is a verified-behaviour score, not a count of files or endpoints, and it is only as granular as the feature lists shown.
