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
node --experimental-strip-types --test tests/*.test.mjs
```

The existing Supabase client requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the website's existing configuration. No environment files or values are included here. Do not use service-role or secret keys. Admin routes already require these values during production prerendering; absent configuration can block the build.

## Live customer catalogue

- `src/features/catalog/data.ts`: SELECT-only paginated reads of `categories` and active `products`; explicit public fields, localization, MMK formatting, category filtering and image URL validation.
- `src/components/storefront.tsx`: bilingual customer page, category cards and filters using database IDs, loading/error/empty states, and manual retry.
- `src/components/product-card.tsx`: product image, translated name/description with fallback, and MMK price. Missing/broken images show a text fallback; images load lazily from HTTPS public URLs.
- `src/lib/i18n`: English/Myanmar interface translations. Known foundation categories retain their translated labels; other categories use the database English name because only `categories.name_en` is confirmed by the existing admin implementation.
- `tests/catalog.test.mjs`: mocked read-only query, pagination, failures, active visibility, category filters, localization and formatting checks. No database access.

The catalogue loads when the customer opens the page; it is not a Realtime subscription. It never substitutes sample products after failures. Categories use `id,name_en`; products use `id,name_en,name_mm,price,category_id,description_en,description_mm,image_url,is_active`. `is_active` controls catalogue visibility, not a stock quantity claim. No schema, policies, client settings or environment variables are changed.

The category and hero SVG illustrations are decorative; displayed product records and product photos come from the database. Guest checkout is a UI-only preview; order submission, payments and customer accounts remain unimplemented. Admin pages and the shared Supabase client remain unchanged.

## Verification limits

Anonymous public-read access must be validated against the intended website Supabase project in a separately configured Preview. Database errors show a retry message without exposing raw database details. RLS can also silently return an empty result, which cannot be distinguished from an empty catalogue by this client. Do not weaken RLS to make the storefront work: report insufficient permissions for review. Never connect the separate Stock Management System.

No deployment is performed by these commands. Search indexing remains disabled in metadata pending launch approval. Native-speaker review of Myanmar copy is recommended before launch.

## Product details (Phase 1)

Storefront cards link to `/products/[id]?lang=en` (or `my`). The customer detail page uses the existing public Supabase client and an explicit SELECT filtered by both the positive numeric product ID and `is_active = true`. It does not query or mutate admin data, policies, schema or configuration.

The responsive page displays a public HTTPS image, localized name and description (with existing English/Myanmar fallback), and MMK price. Loading, safe error/retry, missing/inactive product, missing-description and broken-image states are included. Back to Products preserves the selected language through the `lang` query parameter. A local shopping cart is available in Phase 2; checkout has a UI-only guest preview.

Not-found is a customer-side display state, not a server-generated HTTP 404. Product visibility is checked on page load/retry; there is no Realtime subscription. Existing RLS remains the security boundary. Supabase configuration and anonymous reads still require verification in a configured Preview; this environment has no configured public variables, and the unchanged admin routes can block a full build during prerendering.

## Shopping cart (Phase 2)

Product details include Add to Cart and View cart; the storefront header links to `/cart`. Customers can change quantities, remove products and view current MMK prices, line totals and the product total. The Myanmar/English language switch and navigation retain the selected language.

The cart stores only validated IDs/quantities in browser localStorage, with a limit of 99 per product and 100 distinct products. It reloads active product data through the existing SELECT-only Supabase client and rechecks active status before adds/increases. Inactive or missing products remain removable and are excluded from totals. Query errors preserve saved IDs while hiding unverified totals; storage errors explicitly warn about limited persistence. There is no stock reservation, order submission, payment, backend cart or cross-device synchronization.

See `src/features/cart/README.md` for implementation boundaries. `tests/cart.test.mjs` covers active-only adds, quantity limits, removal, persistence round-trips, malformed storage, storage failures, totals and translation coverage. Browser interaction and live public-read permissions remain unverified in this environment. The build compiles and typechecks, but the unchanged `/admin` prerender still fails without the existing Supabase public environment variables. No configuration is added or changed to bypass that failure.

## Guest checkout preview (Phase 1)

The cart links to `/checkout`, which shows current active product details and a products-only order total alongside required guest delivery fields. Myanmar/English switching preserves entered form values. Empty carts, catalogue errors and unavailable items block review, with retry and links back to edit the cart.

**Validate details** performs client-side checks only. Customer information is not submitted, logged or persisted by the application. No order, login, COD/MMQR or payment flow is implemented, and delivery fees are not fabricated. See `src/features/checkout/README.md` for validation, privacy and verification boundaries, and `tests/checkout.test.mjs` for coverage.
