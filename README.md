# UNITSHOP Customer Website

Next.js App Router customer catalogue, independent of the separate UnitShop Stock Management System.

## Development and checks

Use Node.js 24 (the test command uses native TypeScript stripping):

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
node --experimental-strip-types --test tests/catalog.test.mjs
```

The existing Supabase client requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the website's existing configuration. No environment files or values are included here. Do not use service-role or secret keys. Admin routes already require these values during production prerendering; absent configuration can block the build.

## Live customer catalogue

- `src/features/catalog/data.ts`: SELECT-only paginated reads of `categories` and active `products`; explicit public fields, localization, MMK formatting, category filtering and image URL validation.
- `src/components/storefront.tsx`: bilingual customer page, category cards and filters using database IDs, loading/error/empty states, and manual retry.
- `src/components/product-card.tsx`: product image, translated name/description with fallback, and MMK price. Missing/broken images show a text fallback; images load lazily from HTTPS public URLs.
- `src/lib/i18n`: English/Myanmar interface translations. Known foundation categories retain their translated labels; other categories use the database English name because only `categories.name_en` is confirmed by the existing admin implementation.
- `tests/catalog.test.mjs`: mocked read-only query, pagination, failures, active visibility, category filters, localization and formatting checks. No database access.

The catalogue loads when the customer opens the page; it is not a Realtime subscription. It never substitutes sample products after failures. Categories use `id,name_en`; products use `id,name_en,name_mm,price,category_id,description_en,description_mm,image_url,is_active`. `is_active` controls catalogue visibility, not a stock quantity claim. No schema, policies, client settings or environment variables are changed.

The category and hero SVG illustrations are decorative; displayed product records and product photos come from the database. Checkout and customer accounts remain unimplemented. Admin pages and the shared Supabase client remain unchanged.

## Verification limits

Anonymous public-read access must be validated against the intended website Supabase project in a separately configured Preview. Database errors show a retry message without exposing raw database details. RLS can also silently return an empty result, which cannot be distinguished from an empty catalogue by this client. Do not weaken RLS to make the storefront work: report insufficient permissions for review. Never connect the separate Stock Management System.

No deployment is performed by these commands. Search indexing remains disabled in metadata pending launch approval. Native-speaker review of Myanmar copy is recommended before launch.
