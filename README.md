# UNITSHOP Customer Website

Phase 1 storefront foundation. This repository is independent of the UnitShop Stock Management System.

## Local development

Use Node.js 20.9 or newer (validated with Node 24), then:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables or external services are required.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```

`npm start` serves the production build locally. The build uses webpack for predictable execution across environments.

## Structure

- `src/app`: App Router page, root layout, metadata, global styles and favicon.
- `src/components`: reusable branding and interactive storefront composition.
- `src/features/catalog`: typed categories and illustrative sample product data.
- `src/features/cart`, `checkout`, `admin`: documented future feature boundaries; no active implementation.
- `src/lib/i18n`: English and Myanmar homepage dictionaries.
- `src/lib/supabase`: documentation only; no integration.
- `public/images`: small, self-contained SVG placeholder illustrations, no external requests.

## Homepage behavior

Responsive navigation, skip link, mobile menu with Escape support, English/Myanmar toggle, category links and sample product filters. Language selection lasts for the current page session and updates the document language. Product imagery and catalogue entries are explicitly labeled as samples. No prices, stock claims or specifications are supplied.

## Scope and next phases

There is no shopping cart, checkout, admin access, database, payment integration or deployment configuration. No existing Supabase or Vercel projects are used. Future work should define real catalogue content and image rights, persistent locale routing, cart behavior, guest checkout, admin authorization and a separately approved backend.

SEO title and description are supplied. Search indexing is deliberately disabled with robots metadata during this sample-only foundation; review before a future launch. Have a native Myanmar speaker review translations before launch. No hosting or production connection is configured.
