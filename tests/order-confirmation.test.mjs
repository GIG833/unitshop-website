import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const source = readFileSync(new URL("../src/app/api/orders/[id]/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function createGet({ owns = true, rpcError = null, orderError = null, screenshot = null } = {}) {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push(["rpc", name, args]);
      return { data: owns, error: rpcError };
    },
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return this;
        },
        eq(key, value) {
          calls.push(["eq", key, value]);
          return this;
        },
        async maybeSingle() {
          return {
            data: orderError ? null : {
              id: 42,
              created_at: "2026-11-19T10:00:00Z",
              total_amount: 120000,
              payment_method: "MMQR",
              payment_status: "pending",
              order_status: "pending",
              payment_screenshot_path: screenshot,
            },
            error: orderError,
          };
        },
      };
    },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", transpiled)(
    (name) => name === "@/lib/supabase/server"
      ? { createServerSupabaseClient: () => client }
      : require(name),
    module,
    module.exports,
  );
  return { get: module.exports.GET, calls };
}
const context = (id) => ({ params: Promise.resolve({ id }) });
const request = (cookie = `unitshop_guest=${"a".repeat(64)}`) =>
  new NextRequest("http://localhost:3000/api/orders/42", {
    headers: cookie ? { cookie } : {},
  });

test("confirmation returns only public receipt fields to the owning guest", async () => {
  const { get, calls } = createGet({ screenshot: "orders/42/hidden.png" });
  const res = await get(request(), context("42"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control"), /no-store/);
  const data = await res.json();
  assert.deepEqual(data, {
    success: true,
    order: {
      id: 42,
      created_at: "2026-11-19T10:00:00Z",
      total_amount: 120000,
      payment_method: "MMQR",
      payment_status: "pending",
      order_status: "pending",
      has_payment_screenshot: true,
    },
  });
  assert.equal(JSON.stringify(data).includes("hidden.png"), false);
  assert.equal(calls[0][1], "verify_guest_order_ownership");
  assert.deepEqual(calls[0][2].p_order_id, 42);
});
test("invalid IDs, missing cookies and other guests cannot read confirmation", async () => {
  for (const id of ["0", "-1", "aaa", "4.2", "9007199254740992"]) {
    const { get, calls } = createGet();
    assert.equal((await get(request(), context(id))).status, 400);
    assert.deepEqual(calls, []);
  }
  {
    const { get, calls } = createGet();
    assert.equal((await get(request(null), context("42"))).status, 404);
    assert.deepEqual(calls, []);
  }
  {
    const { get, calls } = createGet({ owns: false });
    assert.equal((await get(request(), context("42"))).status, 404);
    assert.equal(calls.length, 1);
  }
});
test("confirmation reports backend errors without exposing data", async () => {
  for (const options of [{ rpcError: { code: "TEST" } }, { orderError: { code: "TEST" } }]) {
    const { get } = createGet(options);
    const res = await get(request(), context("42"));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.order, undefined);
  }
});
