import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../supabase/promotions.sql");
const route = read("../src/app/api/promotions/route.ts");
const banners = read("../src/components/promotion-banners.tsx");
const storefront = read("../src/components/storefront.tsx");
const admin = read("../src/app/admin/promotions/page.tsx");
const dashboard = read("../src/app/admin/page.tsx");

test("promotion table has row-level security and only active rows visible to guests", () => {
  assert.match(migration, /alter table public.promotions enable row level security/i);
  assert.match(migration, /for select to anon, authenticated\s+using \(is_active = true\)/i);
  assert.match(migration, /for update to authenticated\s+using \(\(select public.is_admin\(\)\)\)/i);
  assert.match(migration, /for insert to authenticated\s+with check \(\(select public.is_admin\(\)\)\)/i);
  assert.match(migration, /is_active boolean not null default false/i);
});
test("public API returns only enabled banners, with same-origin proxied images", () => {
  assert.ok(route.includes('.eq("is_active", true)'));
  assert.ok(route.includes('"/storage/v1/object/public/product-images/promotions/"'));
  assert.ok(route.includes('image.origin === origin'));
  assert.ok(route.includes('cache: "no-store"') || route.includes('"Cache-Control": "no-store"'));
  assert.ok(!route.includes("SERVICE_ROLE"));
});
test("banners are bilingual, display-only and absent when not configured", () => {
  assert.ok(storefront.includes("<PromotionBanners locale={locale} />"));
  assert.ok(banners.includes("if (promotions.length === 0) return null"));
  assert.ok(banners.includes("promotion.title_mm"));
  assert.ok(banners.includes("promotion.body_mm"));
  assert.ok(banners.includes("final invoice"));
  assert.ok(banners.includes("checkout prices stay unchanged"));
  assert.ok(!banners.includes("setCart("));
});
test("only existing admin-authenticated form can manage banners", () => {
  assert.ok(admin.includes('supabase.rpc("is_admin")'));
  assert.ok(admin.includes('supabase.auth.getUser()'));
  assert.ok(admin.includes('.from("product-images").upload('));
  assert.ok(admin.includes('.from("promotions").insert('));
  assert.ok(admin.includes('.from("promotions").update('));
  assert.ok(admin.includes('.from("promotions")'));
  assert.ok(dashboard.includes('href="/admin/promotions"'));
});
