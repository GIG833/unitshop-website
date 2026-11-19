# UNITSHOP Mobile Storefront UI Polish — 2026-11-19

Scope: storefront/marketing and product-display UI only. Product photos, product pricing, categories in Supabase, checkout/cart state, order creation, MMQR uploads, and Admin Order Management are not modified.

## Changes
- Keep the brand and bilingual selector; compress the mobile header to **one row** (logo + language + cart icon + menu). The menu includes My Orders, products, Home, and About. Keyboard-accessible button states and full link labels remain.
- Reduce hero spacing and prioritize a "Shop products" CTA that opens the real catalogue. The second action leads to categories. Replace arrow emoji with inline monochrome SVG so rendering is consistent on iOS.
- Show database-driven category cards in a balanced 2-column mobile grid (6 items = 3 equal rows). Add distinct WiFi Card and Power Bank SVG icons and a neutral generic fallback, not a fake MiFi substitute.
- All storefront product cards use the **exact existing uploaded product image**, no asset regeneration, with contained aspect ratio. Product names clamp to 3 lines; the summary clamps to 2 lines; pricing remains conspicuous; a localized Product Details action is shown. The full description is still present on the product-detail page.
- Product filters scroll horizontally on narrow screens rather than wrapping awkwardly into a second line.
- Tighter product-detail spacing makes the purchase action easier to reach without cropping the actual product image. Myanmar and English layouts are addressed.
- Correct stale "checkout unavailable / preview only" copy in both languages and root metadata description. Current checkout/payment behavior is **unchanged**.

## Privacy, payment and inventory invariants
- No prices, specs, inventory status, customer information, account IDs, or payment details are invented.
- All original product image URLs are preserved. Existing graphic overlays embedded in uploaded product photos are **not** edited: change them in the Admin Product image uploader with actual approved photos when available.
- No Supabase/RLS/migration changes, no guest-session/order/payment API modifications.
- Root `robots noindex` is unchanged intentionally; SEO launch is a separate decision, not a mobile style patch.

## Preview checklist
1. Open at 320, 375, 390, 428 px and a tablet size. Confirm logo, language, cart, menu fit on one line and menu works with either language.
2. From menu open My Orders and return. Cart icon navigates to existing shopping cart.
3. From hero, "Shop products" scrolls to catalogue. "Browse categories" scrolls to category grid. Arrows appear as simple vector arrows, not colorful emoji.
4. The six category cards appear in equal two-column rows, with a distinct power-bank icon. Clicking a category sets the correct filter.
5. Product card photos remain identical to the originals. Long multiline specs don't stretch the grid; names/prices stay readable. The full description appears inside Product Details.
6. Scroll filters horizontally, confirm All Products and Power Banks filters. Test English and Myanmar locale switching.
7. Product details "Add to cart" remains functional. Execute one **non-payment** cart and checkout navigation smoke test.
8. Check no sideways page scrolling, no tap targets hidden behind Safari browser bars, and no broken layout on narrow iPhone browsers.
9. Automated lint, typecheck, unit tests and Vercel Preview must succeed before any production merge.
