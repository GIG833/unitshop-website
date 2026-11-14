# Guest checkout preview — Phase 1

`/checkout?lang=en` (or `my`) is linked from the cart after active products have loaded. It reuses the browser cart and existing SELECT-only `loadProduct` queries for current names, quantities and MMK prices. Empty carts, read errors, missing/inactive products and mismatched responses cannot enable validation or produce a partial order total. Saved cart items are preserved. Product data is reloaded after cart changes and on retry; prices are snapshots, not stock reservations.

Customer fields are Full Name, Phone Number, City/Township, Delivery Address and optional Delivery Notes. Required fields reject whitespace, lengths are bounded, and phone validation supports 7–15 digits with optional leading + and common separators, including Myanmar digits. Phone validation is a format check only, not verification of ownership or deliverability. Labels, errors, focus on the first invalid field, status messages, mobile layout and bilingual copy are included.

The only form action is **Validate details**. The submit handler prevents navigation and validates in memory; it does not call a customer-data endpoint, create orders, clear the cart, log customer information or store it in local/session storage. No customer login, COD/MMQR, payment UI, schema/RLS/configuration changes or admin changes are included. Customer details reset on refresh/leave; switching languages or retrying the catalogue does not clear the form.

Totals include products only. Delivery fees are explicitly uncalculated. Successful validation says that no order was placed or information sent. Browser autofill is controlled by the customer's browser; this application adds no customer-data persistence.

`tests/checkout.test.mjs` covers field/phone validation, Myanmar text and digits, length limits, verified-cart gates, and translation coverage. Run all suites with `node --experimental-strip-types --test tests/*.test.mjs`. Live Supabase permissions and browser interaction still require a configured Preview check; the unchanged admin prerender needs the existing public Supabase variables for a complete production build.
