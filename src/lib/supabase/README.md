# Existing public Supabase client

`client.ts` is shared by the website admin pages and the customer catalogue. It reads the existing public URL and anonymous key from environment configuration and fails if either is missing. Never pass a service-role or secret key to browser code.

The customer catalogue performs SELECT-only reads from `products` (`is_active = true`) and `categories`. Database RLS and storage policies remain the security boundary; this integration does not change them. Public-read access and the identity of the website-specific project must be verified separately. Do not connect the separate Stock Management System.
