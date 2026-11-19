# UNITSHOP Phase 1C — Admin orders & database security audit

Date: 2026-11-19. Project: `unitshop-website` Supabase (`vtptsiikrypvgrumhywd`).
Scope: **read-only inspection of current production schema, policies, function definitions, privilege grants, storage metadata, and advisor notices**. No production database mutations were performed.

## Verified live database facts

- All inspected application tables have RLS enabled: `public.categories`, `public.products`, `public.admin_users`, `public.orders`, `public.order_items`, and `private.guest_order_requests`.
- `orders`: authenticated admin `SELECT` and `UPDATE` RLS policies require `is_admin()` for access. `order_items` has admin-only `SELECT`.
- **Column grants limit authenticated UPDATE on `public.orders` to `order_status` and `payment_status` only**; other customer details and monetary columns are not granted for authenticated UPDATE. This is an existing defense and must be preserved.
- The service role has direct write privileges required by `create_guest_order`; `create_guest_order` is `SECURITY INVOKER` and EXECUTE is granted only to `service_role`.
- `verify_guest_order_ownership` and `list_guest_order_ids` are SECURITY DEFINER functions with `service_role` EXECUTE only, not anonymous/authenticated.
- `is_admin()` is SECURITY DEFINER and executable by authenticated users. Its body returns a boolean for the requesting `auth.uid()`'s membership in `public.admin_users`; this is **intentional for the current admin login and RLS design** and should not be blindly revoked.
- `payment-screenshots` is **private** with a 5 MiB limit and JPEG/PNG/WebP allowlist; product images are public by design.
- Current `orders` table has **no user-defined triggers** on status transitions. Valid values are constrained by CHECK constraints, but **allowed progression** is not enforced in the database. A legitimate admin session can update either status field through the Supabase Data API without passing through the Next.js API's transition rules.

## Security advisor notices

1. `rls_enabled_no_policy` (INFO) for `private.guest_order_requests` and `public.admin_users`. These no-policy tables are intentional under current design; verify necessary restricted role grants before changing.
2. `authenticated_security_definer_function_executable` (WARN) for `public.is_admin()`. Needed for `is_admin()` checks by authenticated admin. Examine function/grants before any remediation; do not revoke without updating auth and RLS.
3. `auth_leaked_password_protection` (WARN) — currently disabled. Consider enabling in Supabase Auth settings.

Relevant official advisor documentation:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Changes in this GitHub PR

- Admin orders page now shows complete delivery address/notes and order-item product snapshots.
- Server GET continues to require authenticated admin and exposes only screenshot availability, never the private screenshot object path.
- Server PATCH authorizes the admin and validates exact fields, strict same-origin JSON, bounded request size, verified sequential order transitions and a compare-and-set update against the previous order + payment state.
- Client dropdown reflects allowed transitions and warns on unpaid MMQR; product and order links are restored to the admin dashboard.
- New automated tests cover workflow rules, delivery data, private evidence minimization, invalid transitions, and cross-origin/oversized/mixed-field requests.

## Remaining risk: enforcement outside the Next.js API

The Next.js server and UI now reject shipping an unpaid MMQR order. However the database currently does not guarantee the same invariant if an authorized admin client writes `order_status` directly. RLS protects *who* writes, not business progression.

**Follow-up, not applied in this PR:** design, test, and deploy a database trigger or narrowly scoped RPC enforcing valid status transitions and MMQR verification before fulfilment. It must preserve `create_guest_order` inserts and the `total_amount` update during order creation, prevent direct status bypasses, and handle already-existing orders. Test with isolated data/branch first, verify administrator workflows and row locks, then deploy with explicit production approval. Avoid migrating a live payment flow before these tests.

Other follow-ups: server-side paginated order search (the current admin list shows only latest 50), rate limiting, fully isolated database tests, admin VPN-free access, and monitoring of failed order/payment actions.

## Manual preview validation

1. Open preview `/admin/orders`, check order details are visible to the authorized admin only.
2. Verify items show saved order-time names, quantities and prices; original product edits must not change historical orders.
3. For COD: pending → confirmed → processing → shipped → delivered (one step at a time).
4. For MMQR with unverified payment: confirm/process/ship are blocked, cancellation allowed while pending. Verify payment in merchant transaction **before** accepting evidence and changing payment status; only then may fulfil.
5. Verify old admin session/no token gets blocked and any unknown order is not readable without admin auth.
6. Verify addresses, phone numbers and screenshot paths are not logged into browser console or exposed by unauthenticated API.
7. Do not apply SQL/schema changes or merge to production without explicit owner review.
