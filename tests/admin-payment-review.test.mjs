import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const origin = "http://localhost:3000";
const path = "orders/42/11111111-1111-4111-8111-111111111111.png";
function compile(file, mocks) {
  const source = readFileSync(
    new URL(`../src/${file}`, import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", "process", code)(
    (name) => (name === "server-only" ? {} : (mocks[name] ?? require(name))),
    compiled,
    compiled.exports,
    {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public",
      },
    },
  );
  return compiled.exports;
}
function setup(options = {}) {
  const calls = {
    auth: [],
    reads: [],
    updates: [],
    filters: [],
    downloads: [],
    service: 0,
    serviceTableCalls: 0,
    committed: [],
  };
  const order = {
    id: 42,
    payment_method: "MMQR",
    payment_status: "pending",
    payment_screenshot_path: path,
    order_status: "processing",
    ...options.order,
  };
  let releaseEvidence;
  const evidenceGate = new Promise((resolve) => {
    releaseEvidence = resolve;
  });
  const client = {
    auth: {
      async getUser(token) {
        calls.auth.push(token);
        return {
          data: { user: options.invalidToken ? null : { id: "test-admin" } },
          error: options.invalidToken ? {} : null,
        };
      },
    },
    async rpc(name) {
      assert.equal(name, "is_admin");
      return {
        data: options.nonAdmin ? false : true,
        error: options.roleError ? {} : null,
      };
    },
    from(table) {
      let write = null;
      const predicates = [];
      return {
        select(fields) {
          calls.reads.push({ table, fields });
          return this;
        },
        eq(field, value) {
          calls.filters.push([field, value]);
          predicates.push([field, value]);
          return this;
        },
        order() {
          return this;
        },
        async limit() {
          return { data: [order], error: null };
        },
        update(value) {
          write = value;
          calls.updates.push(value);
          return this;
        },
        async maybeSingle() {
          if (write && options.atomic) {
            if (options.denyAdminUpdate)
              return { data: null, error: { code: "42501" } };
            if (!predicates.every(([field, value]) => order[field] === value))
              return { data: null, error: null };
            Object.assign(order, write);
            calls.committed.push({ ...write });
            return {
              data: options.commitThenError ? null : { id: 42, ...write },
              error: options.commitThenError
                ? { code: "TEST_UNCERTAIN" }
                : null,
            };
          }
          if (write)
            return {
              data:
                options.race || options.updateError
                  ? null
                  : { id: 42, ...write },
              error: options.updateError ? { code: "TEST_UPDATE" } : null,
            };
          return {
            data: options.noOrder ? null : { ...order },
            error: options.readError ? { code: "TEST_RLS" } : null,
          };
        },
      };
    },
  };
  const service = {
    from: (...args) => {
      calls.serviceTableCalls++;
      if (options.denyServiceTables)
        throw new Error(
          "Service-role table access is not allowed in this test",
        );
      return client.from(...args);
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "payment-screenshots");
        return {
          async download(objectPath) {
            calls.downloads.push(objectPath);
            if (options.concurrent) {
              if (calls.downloads.length === 2) releaseEvidence();
              await evidenceGate;
            }
            return {
              data: options.missingFile
                ? null
                : new Blob(
                    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
                    { type: "image/png" },
                  ),
              error: options.missingFile ? { code: "TEST_STORAGE" } : null,
            };
          },
        };
      },
    },
  };
  const mocks = {
    "@supabase/supabase-js": { createClient: () => client },
    "@/lib/supabase/server": {
      createServerSupabaseClient() {
        calls.service++;
        return service;
      },
    },
  };
  mocks["@/lib/supabase/admin"] = compile("lib/supabase/admin.ts", mocks);
  mocks["@/features/admin/order-workflow"] = compile("features/admin/order-workflow.ts", mocks);
  return {
    calls,
    order,
    route: (file) =>
      compile(`app/api/admin/orders/${file ? `${file}/` : ""}route.ts`, mocks),
  };
}
function request(
  endpoint,
  { token = "admin-token", method = "GET", body, requestOrigin = origin } = {},
) {
  const headers = { origin: requestOrigin };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`${origin}/api/admin/orders/${endpoint}?order_id=42`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
test("both evidence and decision endpoints enforce verified server admin authorization", async () => {
  for (const options of [
    { token: null, expected: 401 },
    { invalidToken: true, expected: 401 },
    { nonAdmin: true, expected: 403 },
    { roleError: true, expected: 503 },
  ]) {
    for (const endpoint of ["payment-screenshot", "payment-status"]) {
      const { calls, route } = setup(options);
      const r =
        endpoint === "payment-status"
          ? await route(endpoint).PATCH(
              request(endpoint, {
                token: options.token,
                method: "PATCH",
                body: { order_id: 42, payment_status: "verified" },
              }),
            )
          : await route(endpoint).GET(
              request(endpoint, { token: options.token }),
            );
      assert.equal(r.status, options.expected);
      assert.equal(calls.service, 0);
      assert.deepEqual(calls.updates, []);
      assert.deepEqual(calls.downloads, []);
    }
  }
});
test("authorized screenshot viewing proxies private bytes with no-store and no public/signed URL", async () => {
  const { calls, route } = setup();
  const response = await route("payment-screenshot").GET(
    request("payment-screenshot"),
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(calls.downloads, [path]);
  assert.equal((await response.arrayBuffer()).byteLength, 8);
  assert.deepEqual(calls.updates, []);
});
test("COD, missing evidence and cross-order/traversal paths cannot be viewed", async () => {
  for (const order of [
    { payment_method: "COD" },
    { payment_screenshot_path: null },
    { payment_screenshot_path: path.replace("42/", "43/") },
    { payment_screenshot_path: "../private/file.png" },
  ]) {
    const { calls, route } = setup({ order });
    const response = await route("payment-screenshot").GET(
      request("payment-screenshot"),
    );
    assert.equal(response.status, 404);
    assert.deepEqual(calls.downloads, []);
  }
});
test("RLS and storage read errors fail closed without leaking internal details", async () => {
  for (const options of [{ readError: true }, { missingFile: true }]) {
    const { calls, route } = setup(options);
    const response = await route("payment-screenshot").GET(
      request("payment-screenshot"),
    );
    assert.equal(response.status, 503);
    const text = await response.text();
    assert.ok(!text.includes(path));
    assert.ok(!text.includes("TEST_"));
    assert.deepEqual(calls.updates, []);
  }
});
test("explicit verify and reject change only payment_status with pending/MMQR/evidence predicates", async () => {
  for (const status of ["verified", "rejected"]) {
    const { calls, route } = setup();
    const response = await route("payment-status").PATCH(
      request("payment-status", {
        method: "PATCH",
        body: { order_id: 42, payment_status: status },
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls.updates, [{ payment_status: status }]);
    for (const filter of [
      ["id", 42],
      ["payment_method", "MMQR"],
      ["payment_status", "pending"],
      ["payment_screenshot_path", path],
    ])
      assert.ok(
        calls.filters.some(
          (value) => JSON.stringify(value) === JSON.stringify(filter),
        ),
      );
    assert.deepEqual(calls.downloads, [path]);
  }
});
test("COD, final payments and missing evidence cannot be verified or rejected", async () => {
  for (const order of [
    { payment_method: "COD" },
    { payment_status: "verified" },
    { payment_status: "rejected" },
    { payment_screenshot_path: null },
    { order_status: "cancelled" },
    { order_status: "delivered" },
  ]) {
    const { calls, route } = setup({ order });
    const response = await route("payment-status").PATCH(
      request("payment-status", {
        method: "PATCH",
        body: { order_id: 42, payment_status: "verified" },
      }),
    );
    assert.equal(response.status, 409);
    assert.deepEqual(calls.updates, []);
  }
});
test("invalid decisions and mixed order-status edits are rejected without writes", async () => {
  for (const body of [
    { order_id: 42, payment_status: "pending" },
    { order_id: 42, payment_status: "verified", order_status: "confirmed" },
    { order_id: -1, payment_status: "rejected" },
  ]) {
    const { calls, route } = setup();
    const response = await route("payment-status").PATCH(
      request("payment-status", { method: "PATCH", body }),
    );
    assert.equal(response.status, 400);
    assert.deepEqual(calls.updates, []);
  }
});
test("unreadable evidence blocks a decision; races and uncertain writes require reload", async () => {
  for (const options of [
    { missingFile: true, expected: 503 },
    { race: true, expected: 409 },
    { updateError: true, expected: 503 },
  ]) {
    const { calls, route } = setup(options);
    const response = await route("payment-status").PATCH(
      request("payment-status", {
        method: "PATCH",
        body: { order_id: 42, payment_status: "verified" },
      }),
    );
    assert.equal(response.status, options.expected);
    if (options.missingFile) assert.deepEqual(calls.updates, []);
  }
});
test("payment verification compare-and-set guards against simultaneous cancellation", async () => {
  const { calls, route } = setup({ atomic: true });
  const response = await route("payment-status").PATCH(
    request("payment-status", {
      method: "PATCH",
      body: { order_id: 42, payment_status: "verified" },
    }),
  );
  assert.equal(response.status, 200);
  assert.ok(calls.filters.some((entry) =>
    JSON.stringify(entry) === JSON.stringify(["order_status", "processing"]),
  ));
});

test("cross-origin decisions are blocked before storage or writes", async () => {
  const { calls, route } = setup();
  const response = await route("payment-status").PATCH(
    request("payment-status", {
      method: "PATCH",
      requestOrigin: "http://other.invalid",
      body: { order_id: 42, payment_status: "verified" },
    }),
  );
  assert.equal(response.status, 403);
  assert.deepEqual(calls.updates, []);
  assert.deepEqual(calls.downloads, []);
});
test("existing order list exposes availability only, and order-status updates remain separate", async () => {
  const { calls, route } = setup({ order: { payment_status: "verified" } });
  const response = await route("").GET(request(""));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.orders[0].has_payment_screenshot, true);
  assert.equal(result.orders[0].payment_screenshot_path, undefined);
  assert.ok(!JSON.stringify(result).includes(path));
  const patch = await route("").PATCH(
    request("", {
      method: "PATCH",
      body: { order_id: 42, order_status: "shipped" },
    }),
  );
  assert.equal(patch.status, 200);
  assert.deepEqual(calls.updates, [{ order_status: "shipped" }]);
});
test("admin payment UI never verifies on render and disables decisions until evidence is opened", () => {
  let calls = 0;
  const { AdminPaymentReview } = compile(
    "components/admin-payment-review.tsx",
    {
      "@/lib/supabase/client": {
        supabase: {
          auth: {
            getSession() {
              calls++;
              throw new Error("Unexpected call");
            },
          },
        },
      },
    },
  );
  const props = {
    orderId: 42,
    method: "MMQR",
    status: "pending",
    hasScreenshot: true,
    onPaymentUpdated() {
      calls++;
    },
  };
  const html = renderToStaticMarkup(
    React.createElement(AdminPaymentReview, props),
  );
  assert.match(html, /Verify Payment/);
  assert.match(html, /Reject Payment/);
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
  assert.equal(calls, 0);
  const cod = renderToStaticMarkup(
    React.createElement(AdminPaymentReview, { ...props, method: "COD" }),
  );
  assert.doesNotMatch(cod, /Verify Payment|Reject Payment/);
});
test("simultaneous Verify/Reject requests permit only one pending-state transition", async () => {
  const { calls, order, route } = setup({ atomic: true, concurrent: true });
  const handler = route("payment-status").PATCH;
  const responses = await Promise.all(
    ["verified", "rejected"].map((payment_status) =>
      handler(
        request("payment-status", {
          method: "PATCH",
          body: { order_id: 42, payment_status },
        }),
      ),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409],
  );
  assert.equal(calls.committed.length, 1);
  assert.ok(["verified", "rejected"].includes(order.payment_status));
  assert.equal(order.order_status, "processing");
});
test("service-role table UPDATE permission is not used or needed for a payment decision", async () => {
  const { calls, route } = setup({ atomic: true, denyServiceTables: true });
  const response = await route("payment-status").PATCH(
    request("payment-status", {
      method: "PATCH",
      body: { order_id: 42, payment_status: "verified" },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.serviceTableCalls, 0);
  assert.deepEqual(calls.committed, [{ payment_status: "verified" }]);
});
test("denied authenticated-admin UPDATE fails without a service-role fallback", async () => {
  const { calls, order, route } = setup({
    atomic: true,
    denyAdminUpdate: true,
    denyServiceTables: true,
  });
  const response = await route("payment-status").PATCH(
    request("payment-status", {
      method: "PATCH",
      body: { order_id: 42, payment_status: "verified" },
    }),
  );
  assert.equal(response.status, 503);
  assert.equal(order.payment_status, "pending");
  assert.equal(calls.serviceTableCalls, 0);
  assert.deepEqual(calls.committed, []);
});
test("an uncertain committed decision cannot be reversed by a retry", async () => {
  const { calls, order, route } = setup({
    atomic: true,
    commitThenError: true,
  });
  const handler = route("payment-status").PATCH;
  const first = await handler(
    request("payment-status", {
      method: "PATCH",
      body: { order_id: 42, payment_status: "verified" },
    }),
  );
  assert.equal(first.status, 503);
  for (const payment_status of ["verified", "rejected"]) {
    const response = await handler(
      request("payment-status", {
        method: "PATCH",
        body: { order_id: 42, payment_status },
      }),
    );
    assert.equal(response.status, 409);
  }
  assert.equal(order.payment_status, "verified");
  assert.equal(calls.committed.length, 1);
});
test("rejected payment remains readable but cannot be re-verified or reset through this endpoint", async () => {
  const { calls, order, route } = setup({
    atomic: true,
    order: { payment_status: "rejected" },
  });
  const view = await route("payment-screenshot").GET(
    request("payment-screenshot"),
  );
  assert.equal(view.status, 200);
  for (const payment_status of ["verified", "rejected", "pending"]) {
    const response = await route("payment-status").PATCH(
      request("payment-status", {
        method: "PATCH",
        body: { order_id: 42, payment_status },
      }),
    );
    assert.equal(response.status, payment_status === "pending" ? 400 : 409);
  }
  assert.equal(order.payment_status, "rejected");
  assert.equal(order.order_status, "processing");
  assert.deepEqual(calls.committed, []);
});

test("admin fulfilment blocks MMQR orders pending payment verification", async () => {
  for (const payment_status of ["pending", "rejected"]) {
    const { calls, route } = setup({
      atomic: true,
      order: { payment_status, order_status: "pending" },
    });
    const res = await route("").PATCH(
      request("", { method: "PATCH", body: { order_id: 42, order_status: "confirmed" } }),
    );
    assert.equal(res.status, 409);
    assert.deepEqual(calls.updates, []);
  }
});

test("admin fulfilment enforces sequential transitions with compare-and-set", async () => {
  const { calls, route } = setup({
    atomic: true,
    order: { payment_method: "COD", payment_status: "pending", order_status: "pending" },
  });
  const handler = route("").PATCH;
  const jump = await handler(request("", {
    method: "PATCH", body: { order_id: 42, order_status: "delivered" },
  }));
  assert.equal(jump.status, 409);
  assert.deepEqual(calls.updates, []);

  const confirmed = await handler(request("", {
    method: "PATCH", body: { order_id: 42, order_status: "confirmed" },
  }));
  assert.equal(confirmed.status, 200);
  assert.deepEqual(calls.updates, [{ order_status: "confirmed" }]);
  for (const predicate of [["order_status", "pending"], ["payment_status", "pending"]]) {
    assert.ok(calls.filters.some((item) => JSON.stringify(item) === JSON.stringify(predicate)));
  }
  const stale = await handler(request("", {
    method: "PATCH", body: { order_id: 42, order_status: "confirmed" },
  }));
  assert.equal(stale.status, 409);
});

test("order-status PATCH rejects cross-origin, unknown fields and oversized bodies", async () => {
  const { calls, route } = setup({ atomic: true, order: { payment_method: "COD", order_status: "pending" } });
  const handler = route("").PATCH;
  const denied = await handler(request("", {
    method: "PATCH",
    requestOrigin: "https://other.invalid",
    body: { order_id: 42, order_status: "confirmed" },
  }));
  assert.equal(denied.status, 403);
  const unknown = await handler(request("", {
    method: "PATCH",
    body: { order_id: 42, order_status: "confirmed", payment_status: "verified" },
  }));
  assert.equal(unknown.status, 400);
  const tooLarge = await handler(request("", {
    method: "PATCH",
    body: { order_id: 42, order_status: "confirmed", padding: "x".repeat(10000) },
  }));
  assert.equal(tooLarge.status, 413);
  assert.deepEqual(calls.updates, []);
});

test("admin list includes delivery details without private evidence paths", async () => {
  const { calls, route } = setup({
    order: {
      customer_name: "Customer",
      delivery_address: "Test delivery address",
      delivery_notes: "Call on arrival",
      order_items: [{ product_name: "Router", quantity: 2, unit_price: 20000, subtotal: 40000 }],
    },
  });
  const response = await route("").GET(request(""));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.orders[0].delivery_address, "Test delivery address");
  assert.equal(result.orders[0].delivery_notes, "Call on arrival");
  assert.deepEqual(result.orders[0].order_items, [{ product_name: "Router", quantity: 2, unit_price: 20000, subtotal: 40000 }]);
  assert.equal(result.orders[0].payment_screenshot_path, undefined);
  assert.ok(calls.reads.some((call) =>
    call.table === "orders" &&
    call.fields.includes("delivery_address") &&
    call.fields.includes("delivery_notes") &&
    call.fields.includes("order_items(product_name,quantity,unit_price,subtotal)"),
  ));
});
