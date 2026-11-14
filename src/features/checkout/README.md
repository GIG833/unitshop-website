# Guest checkout preview — Phase 1

`/checkout?lang=en` (or `my`) is linked from the cart after active products have loaded. It reuses the browser cart and existing SELECT-only `loadProduct` queries for current names, quantities and MMK prices. Empty carts, read errors, missing/inactive products and mismatched responses cannot enable validation or produce a partial order total. Saved cart items are preserved. Product data is reloaded after cart changes and on retry; prices are snapshots, not stock reservations.

Customer fields are Full Name, Phone Number, City/Township, Delivery Address and optional Delivery Notes. Required fields reject whitespace, lengths are bounded, and phone validation supports 7–15 digits with optional leading + and common separators, including Myanmar digits. Phone validation is a format check only, not verification of ownership or deliverability. Labels, errors, focus on the first invalid field, status messages, mobile layout and bilingual copy are included.

The only form action is **Validate details**. The submit handler prevents navigation and validates in memory; it does not call a customer-data endpoint, create orders, clear the cart, log customer information or store it in local/session storage. No customer login, payment processing, schema/RLS/configuration changes or admin changes are included. Customer details reset on refresh/leave; switching languages or retrying the catalogue does not clear the form.

Totals include products only. Delivery fees are explicitly uncalculated. Successful validation says that no order was placed or information sent. Browser autofill is controlled by the customer's browser; this application adds no customer-data persistence.

`tests/checkout.test.mjs` covers field/phone validation, Myanmar text and digits, length limits, verified-cart gates, and translation coverage. Run all suites with `node --experimental-strip-types --test tests/*.test.mjs`. Live Supabase permissions and browser interaction still require a configured Preview check; the unchanged admin prerender needs the existing public Supabase variables for a complete production build.

## Payment selection — Phase 1

The checkout includes exactly two native radio options: Cash on Delivery (COD) and MMQR. A choice is required for successful local validation; changing the choice clears the previous validation result while preserving customer fields, cart and language. Selection remains in page memory only.

COD requires no screenshot. MMQR shows a text-only, non-scannable merchant QR placeholder and explains that screenshot uploads will be added in a later phase. There is no merchant payment address, actual QR, upload input, upload call, payment processing, order creation or confirmation flow.

Future MMQR payments must require manual verification by an admin. A screenshot alone must never automatically confirm payment. `payment.ts` describes preview display requirements only; it does not implement payment status or admin workflows. No existing admin page is changed.

`tests/payment-selection.test.mjs` tests exactly two permitted methods and renders the real component in memory with existing TypeScript/React dependencies to verify native radio inputs, selection states, bilingual conditional guidance, accessible errors and absence of upload or real QR elements. No new dependencies are added.
