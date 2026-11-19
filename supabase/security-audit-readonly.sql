-- UNITSHOP Database Security Audit — READ ONLY
-- Run manually in the website's Supabase SQL Editor under a privileged
-- reviewer account. Review results privately; do NOT paste service keys,
-- customer rows, payment screenshots, passwords or PII into a public PR.
-- This script only reads schema, routine grants, RLS and bucket metadata.
-- It does NOT alter production data, policies, grants or configuration.

-- 1. Identify the actual order line-items table and known relevant tables.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       pg_get_userbyid(c.relowner) AS owner_role,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND (c.relname ILIKE '%order%'
    OR c.relname ILIKE '%product%'
    OR c.relname ILIKE '%payment%'
    OR c.relname ILIKE '%guest%')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;

-- 2. Inspect RLS policy definitions (read only).
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname IN ('public', 'private', 'storage')
  AND (tablename ILIKE '%order%'
    OR tablename ILIKE '%product%'
    OR tablename ILIKE '%payment%'
    OR tablename ILIKE '%guest%'
    OR tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- 3. Verify SQL functions and EXECUTE privileges.
-- SECURITY DEFINER routines must be scrutinized for owner/search_path,
-- caller-controlled arguments, and who can invoke them.
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       pg_catalog.pg_get_userbyid(p.proowner) AS owner_role,
       p.proconfig AS function_config,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE p.proname IN (
  'is_admin', 'create_guest_order',
  'verify_guest_order_ownership', 'list_guest_order_ids'
)
ORDER BY n.nspname, p.proname;

-- 4. Confirm which columns hold order details and items. No row contents.
SELECT table_schema, table_name, ordinal_position, column_name, data_type,
       is_nullable
FROM information_schema.columns
WHERE table_schema IN ('public', 'private')
  AND (table_name ILIKE '%order%'
    OR table_name ILIKE '%product%'
    OR table_name ILIKE '%guest%')
ORDER BY table_schema, table_name, ordinal_position;

-- 5. Verify that payment evidence is not stored in a public bucket.
SELECT id, name, public AS bucket_is_public,
       file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('payment-screenshots', 'product-images')
ORDER BY id;

-- 6. Inspect table-level SELECT, INSERT, UPDATE and DELETE grants.
SELECT table_schema, table_name, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'private')
  AND (table_name ILIKE '%order%'
    OR table_name ILIKE '%guest%'
    OR table_name ILIKE '%product%')
ORDER BY table_schema, table_name, grantee, privilege_type;
