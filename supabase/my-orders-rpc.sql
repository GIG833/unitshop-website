-- Apply in the UNITSHOP website Supabase SQL Editor before testing My Orders.
-- This RPC returns only order IDs for the server-provided hashed guest cookie.
-- Never grant EXECUTE to anon or authenticated.
CREATE OR REPLACE FUNCTION public.list_guest_order_ids(p_scope_hash text)
RETURNS TABLE(order_id bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT r.order_id
  FROM private.guest_order_requests AS r
  WHERE r.scope_hash = p_scope_hash
    AND r.order_id IS NOT NULL
  ORDER BY r.order_id DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.list_guest_order_ids(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_guest_order_ids(text) TO service_role;
