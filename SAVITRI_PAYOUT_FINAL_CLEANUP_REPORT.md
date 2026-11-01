# SAVITRI - Payout Module Final Cleanup Report

_Date: 2026-11-01 | All changes are **uncommitted** (working tree only), pending your final review._

## 0. Summary

| # | Task | Result |
|---|---|---|
| 1 | Captain records with missing city | **Fixed (no guessing)**: brand attribution now also uses the captain's own `workingArea.city`; captains with neither are never assigned to a brand and are listed by a read-only report script |
| 2 | Stack-trace exposure | **Fixed**: stack never returned unless explicitly enabled outside production; malformed ids are 400 with a generic message; production 500s are generic |
| 3 | Admin / Super Admin payout pages in a real browser | **Verified** (Chrome, real login forms) |
| 4 | Seller Wallet / Captain Wallet in a real browser | **Verified** (real login, real forms, live status changes) |
| 5 | Payout request / approval / rejection / payment end to end | **Verified** in browser and API |
| 6 | Brand filtering with multiple brands | **Verified** through the real brand switcher, plus API |
| 7 | Socket.IO live updates and polling fallback | **Verified**: WebSocket, long-polling fallback, 30 s polling fallback |
| 8 | Repeated rejection cannot refund twice | **Verified** (sequential and 3 concurrent repeats) |
| 9 | All payout integration tests | **34 / 34** API, **36 / 36** browser, **20 / 20** ledger + realtime |
| 10 | Complete Phase 1 security suite | **250 / 250** (the earlier informational stack-trace check now passes too) |

Also green: 12 / 12 error-response checks, 20 / 20 existing unit tests.

**Environment safety.** Tests used an in-memory MongoDB, an isolated backend on port 5099 and a separate Vite instance on port 3100 pointed at it (`VITE_API_URL` overridden for that process only). Your dev servers on ports 3000 and 5000 were not touched and nothing real was paid, e-mailed, texted or pushed. `.env` was not modified.

---

## 1. Captain records with missing city

**Problem.** Brand views attribute a captain by city. A captain with an empty `city` was invisible in every brand view, and, more seriously, the payout detail/approve/reject/process checks were written `if (captain.city && !match)`, which **let any brand-scoped admin act on a captain with no city** (fail-open).

**Fix (no arbitrary assignment).**
- A captain's brand is derived only from data the captain declared: `city`, else `workingArea.city`. Implemented once in `scopeMiddleware` (`captainInScope`, `captainScopeFilter`, `getScopedCaptainIds`) and reused by payouts, delivery partners, settlements, reports and the admin captain lists.
- A captain with **neither** is attributed to **no** brand: visible only in consolidated "All Regions" (Super Admin).
- The four payout scope checks and the adjustment check are now fail-closed (`!captain || !captainInScope(...)` -> 403).
- **Incomplete records are reported, not edited:** `Backend/src/scripts/reportCaptainsMissingCity.js` (read-only) lists captains with no operating city, with their open payout count/amount, so you can have them completed (`node src/scripts/reportCaptainsMissingCity.js [--json]`, uses `MONGODB_URI`). It was run against the test database only (1 record found, as seeded). **I have not run it against your real database; the number of affected production captains is unknown.**

**Verified:** brand_fh lists the Bhopal captain *and* the work-area-only captain, not the Indore or city-less captain; brand_fg lists only Indore; city-less captain visible only under ALL; a restricted admin gets 403 approving or reading a city-less captain payout; Super Admin (ALL) still can.

## 2. Stack-trace exposure

`middleware/errorMiddleware.js`:
- `stack` is returned **only** when `NODE_ENV !== 'production'` **and** `EXPOSE_ERROR_STACK=true` (previously every non-production environment, e.g. staging, exposed it).
- `CastError` (malformed ids) -> **400** with `"Invalid identifier supplied"` (was 500 with Mongoose internals); unset-status `ValidationError` -> 400.
- In production, 5xx responses return `"Internal server error"`; full detail stays in the server log.
- Explicit 4xx errors keep their own status/message.

**Verified (12 checks):** 404, 401, malformed id, bad status, and an in-process matrix (production, development, staging, flag on/off, production with flag on = still no stack).

**Not changed (unrelated, listed in section 8):** 47 controller sites build their own `res.status(500).json({ message: error.message })`; those bypass this handler and can still return raw error text (no stack).

## 3-5. Browser verification (Chrome via Playwright, real login forms)

36 / 36 checks pass. Roles used: Super Admin, Admin (Indore), Admin (Bhopal), Seller (Indore), Captain (mobile viewport).

| Area | Evidence |
|---|---|
| Super Admin login, `/super-admin/payouts/sellers` and `/payouts/captains` | Real form login; pages render; header shows "Real-time updates on"; start empty |
| Seller Wallet | Seller logs in, wallet shows 5000.00, requests 1000 through the modal, balance drops to 4000.00, Withdrawals tab shows PENDING |
| Captain Wallet | Captain logs in on a phone viewport, taps Request Payout / Submit Payout Request, sees "Submitted for Review" |
| Request reaches Super Admin | Both new requests appear on the already-open SA pages **without reload** |
| Approve (SA UI) | DB `APPROVED`; the open seller wallet flips to APPROVED **live** |
| Pay (SA UI, mock UTR) | DB withdrawal `COMPLETED`; seller wallet flips to COMPLETED live; wallet balance stays 4000.00 |
| Reject (SA UI) | Captain payout `REJECTED`; captain wallet balance restored (3000) and shown live without reload |
| Admin payout pages | Admin (Indore) sees only the Indore seller; Admin (Bhopal) sees only the Bhopal seller; new requests from the other brand never appear; a new Bhopal request appears live on the Bhopal admin page |
| Admin dashboard scoping (screenshot) | Bhopal admin dashboard shows 1 seller / 2 captains (Bhopal + work-area captain) |

Screenshots are in the session scratchpad (`shots/`, 25 files, e.g. `sa_captains_brand_fh.png`, `seller_withdrawals_completed.png`).

## 6. Brand filtering (multiple brands)

Brand switcher exercised in the real Super Admin UI (All Regions, Fashion Hub / Bhopal, Fashion Gallary / Indore) on both pages:
- Sellers: Fashion Hub = Bhopal Seller only; Fashion Gallary = Indore Seller only; All Regions = both.
- Captains: Fashion Hub = Bhopal + work-area captain; Fashion Gallary = Indore captain; City-less captain only under All Regions; all four under All Regions.
- API: an Admin scoped to Bhopal receives 403 for the Indore scope; delivery-partners list follows the same attribution.

## 7. Socket.IO live updates and polling fallback

| Scenario | Result |
|---|---|
| Normal WebSocket | New request / status change arrives live on SA seller + captain pages, admin page, seller wallet, captain wallet |
| WebSocket blocked (realistic async failure) | Socket.IO falls back to HTTP long-polling, header still "Real-time updates on", new request arrives without reload |
| Socket fully blocked (WebSocket + long-polling) | Header switches to "Auto-refresh every 30s"; new request still arrives through the 30 s poll |
| Security of the feed | Admin sockets are re-validated against the DB (active, same role, same token version); seller/captain sockets join only their own room; a seller socket received **no** `ledger:changed` / `payout:changed` events; payloads carry no amounts or personal data |

**One real defect found and fixed during this work:** with the default transport order, a blocked WebSocket stopped the connection instead of continuing with long-polling. `tryAllTransports: true` was added to `Frontend/src/services/financeSocket.js`.

Also added (small, same feature): the Admin payout page (`AdminPayoutManagement.jsx`) now has the same live subscription + 30 s poll as the Super Admin page; it previously only loaded once.

## 8. Repeated rejection / double refund

- Captain payout: first reject restores the wallet; a second reject returns 400 and the balance is unchanged (3000 -> 3000).
- Seller payout: first reject refunds exactly once (4500 -> 5000); **three simultaneous repeat rejects all returned 400 and the wallet stayed 5000**.
- Rejecting through the legacy withdrawal route first and then the unified route does not refund twice (unified route skips the refund when the withdrawal is already REJECTED); verified earlier in the integration run.

## 9. Test results

| Suite | Result |
|---|---|
| Payout API integration (requests, brand filters, city rules, approve / pay / reject, sync to seller + captain records, notifications, legacy path, live events) | **34 / 34** |
| Browser end-to-end (section 3-7) | **36 / 36** |
| Error-response checks | **12 / 12** |
| Customer-payment ledger + realtime (earlier feature, rerun) | **20 / 20** (one assertion updated: sellers may now connect to *their own* room, and must not receive finance events) |
| Phase 1 security + regression suite | **250 / 250** |
| Existing unit tests (`npm test`) | **20 / 20** |

Tests that failed on first run and why (all test-script issues, fixed and re-run, none hid a product defect except the transport fallback in section 7): seller balance format (`5000.00`, not `5,000`), UTR selector matched the page search box, admin sidebar group not expanded, and an unrealistic synchronous WebSocket failure simulation.

## 10. Files changed in this cleanup (all uncommitted)

Modified: `middleware/scopeMiddleware.js`, `middleware/errorMiddleware.js`, `controllers/superAdminFinancialController.js` (city fail-open fixes and captain scope filters), `Frontend/src/services/financeSocket.js`, `Frontend/src/modules/admin/pages/AdminPayoutManagement.jsx`.
New: `Backend/src/scripts/reportCaptainsMissingCity.js`.
Earlier payout/ledger/Phase 1 work remains in the working tree as before; nothing has been committed.

## 11. Remaining issues

1. **City-less captains.** They cannot be attributed to a brand and are visible only to Super Admin (All Regions). Their city must be completed. Run the report script against the real database to see how many exist.
2. **Brand model for captains is city-based.** Two brands in one city would both match the same captains; an explicit `brandId` on Captain (and on payouts/ledger rows) is still the proper fix.
3. **47 controller sites return raw `error.message` on 500** (no stack). Production masking only applies to errors routed through the global handler.
4. **Admin brand default is still fail-open** (admin with no `authorizedBrands` = all brands) until brands are assigned and `ADMIN_BRANDS_FAIL_CLOSED=true` is set (see Phase 1 report 10.1).
5. **Historical customer payments** are not in the ledger until `backfillCustomerPayments.js` is run (opt-in, not run).
6. **Browser coverage.** Chrome only; no Firefox/Safari; the Admin panel's other tabs and the seller registration flow were not exercised.
7. **Payout wallet records:** the seller `pendingBalance` / `totalWithdrawn` counters are not updated by the unified approve/reject path (pre-existing; the visible available balance and withdrawal status are correct).
8. Items still open from earlier reports: login/OTP rate limiting, CORS allow-list/helmet, admin password policy, by-id review of challan / proforma / POS / transport / wallet endpoints, Admin management + permission API.

## 12. Review checklist before commit
- Decide whether to run `reportCaptainsMissingCity.js` and `backfillCustomerPayments.js` on the real database (both read `MONGODB_URI`; the second writes).
- Set `EXPOSE_ERROR_STACK` only on local dev machines that need it.
- Confirm `JWT_SECRET` is set in every environment (server refuses to start otherwise).
- Frontend: `Frontend/dist` is git-ignored; no build artifacts will be committed.
