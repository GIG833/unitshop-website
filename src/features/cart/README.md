# Customer shopping cart

`model.ts` defines validated product IDs and quantities (1–99 per product, 100 distinct products maximum), immutable operations and rounded MMK totals. `use-cart.ts` synchronizes the customer cart with the browser localStorage key `unitshop.customer-cart.v1`, including storage events from other tabs. Only IDs and quantities are persisted; stored prices and product details are never trusted.

The detail-page Add to Cart button rechecks the active product via the existing public Supabase client before saving. `/cart` reloads active records and current prices, supports increasing/decreasing quantities and removal, and excludes missing/inactive products from totals. Increases also recheck active status. Failed reads show an error and retry without deleting saved items or fabricating totals. If browser storage fails, an explicit warning explains that persistence is unavailable; the cart remains usable in memory for that visit.

No checkout, stock reservation, payments, writes to Supabase, schema/policy changes, admin authentication changes or new dependencies are included. Visibility and prices are snapshots at load/increase, not a Realtime guarantee. Public-read access still requires verification in a configured Preview.
