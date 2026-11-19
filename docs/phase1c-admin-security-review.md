# UNITSHOP Phase 1C — Admin orders and database security review

## Verified from the repository
- Customer orders are created through `POST /api/orders` calling the database RPC `create_guest_order` with a hashed HttpOnly guest scope and an idempotency key.
- Guest confirmation and MMQR screenshot upload verify ownership using `verify_guest_order_ownership` before using server credentials.
- The admin API checks a Supabase bearer access token and `is_admin()` on the server.
- Admin MMQR verification is separate from order status, checks screenshot existence, and updates only pending payment states.
- Admin order list previously omitted `delivery_address` and `delivery_notes`, and allowed status jumps / MMQR processing without verification.

## Phase 1C branch changes
- Full delivery address, notes and customer contact fields shown in the protected admin order list.
- Server-authoritative sequential status transitions: pending -> confirmed -> processing -> shipped -> delivered; cancellation only before shipped. COD may proceed through this flow; MMQR requires `payment_status = verified` before fulfilment.
- `PATCH /api/admin/orders` now requires same-origin JSON, bounds the request stream to 2 KiB, rejects unexpected keys, and uses an authenticated-admin RLS-scoped compare-and-set update checking current payment and order status. No service-role writes are used to change order state.
- Admin UI shows only available transitions, requires operator confirmation and offers manual refresh; search covers the latest 50 records only.
- Existing admin dashboard links directly to Products and Orders.
- Automatic tests cover valid/invalid transitions, origin/body validation, payment prerequisites and status races.

## Critical LIMITS — requires inspecting the live Supabase project
This repository does **not** contain the active `create_guest_order`, `verify_guest_order_ownership`, `is_admin` implementation, the full `orders` / line-items DDL, or full RLS policies. Do not claim a complete security certification based on this branch alone.

Run `supabase/security-audit-readonly.sql` privately using a trusted Supabase SQL Editor session. Inspect:
1. Whether `orders`, line-items, `guest_order_requests`, and payment screenshot metadata have correct RLS and table grants.
2. Whether `create_guest_order` recomputes product prices from trusted database products, rejects inactive products, enforces maximum quantities, and atomically creates line-items and order rows.
3. Whether guest ownership RPCs are restricted to service_role, have safe `SECURITY DEFINER` search paths, scope hash checks, and cannot enumerate other guests' orders.
4. Whether `is_admin` correctly ties authorization to the authenticated user, and whether direct client writes cannot bypass important payment/order transitions.
5. Whether `payment-screenshots` bucket is private, storage policies deny anonymous reads, and service keys are never in client bundles.
6. Which actual table stores ordered products, quantities and *price-at-purchase snapshots*. The item schema is **not evidenced in this repository**, so product line details are deliberately not queried by this PR.
7. Whether backup/restore and audit-logging policies satisfy the shop's requirements.

The SQL file contains SELECT statements only: it must not change grants, RLS, database schema, customer rows or payment state. Do not paste personal customer data or credentials into public issues or PR comments.

## Manual Preview acceptance before any merge
- As admin, verify authorized list access with full delivery address and notes for an existing test order.
- Check denied/non-admin access does not display sensitive order details.
- COD: pending -> confirmed -> processing -> shipped -> delivered; direct pending -> delivered is rejected. Delivered/cancelled orders cannot be modified.
- MMQR: pending payment blocks confirmation and shipping; after *manual* merchant-transaction verification the proper next status is allowed. A screenshot alone never counts as verified.
- Confirm a stale admin page cannot overwrite a concurrent payment or order status change; reload after a 409/503 response.
- Check UX on mobile and without VPN where applicable.
- Review the current latest-50 list limit and choose later pagination only after confirming database indexes and load.

**Do not apply SQL changes to production without a separate, reviewed migration and verified database backup.**
