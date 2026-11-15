import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import {
  uploadScreenshot,
  screenshotError,
  MAX_SCREENSHOT_BYTES,
} from "../src/features/checkout/screenshot.ts";
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const origin = "http://localhost:3000";
function loadRoute(path, client) {
  const source = readFileSync(
    new URL(`../src/app/api/${path}/route.ts`, import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const routeModule = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) =>
      name === "@/lib/supabase/server"
        ? { createServerSupabaseClient: () => client }
        : require(name),
    routeModule,
    routeModule.exports,
  );
  return routeModule.exports.POST;
}
function fakeClient(options = {}) {
  const calls = { uploads: [], removes: [], updates: [], rpc: [] };
  const order = {
    payment_method: "MMQR",
    payment_status: "pending",
    order_status: "pending",
    payment_screenshot_path: null,
    ...options.order,
  };
  let updating = false;
  const client = {
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return {
        data:
          name === "verify_guest_order_ownership"
            ? options.owns !== false
            : {
                order_id: 42,
                total_amount: 100,
                payment_method: args.p_order.payment_method,
              },
        error: null,
      };
    },
    from() {
      const query = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        is() {
          return this;
        },
        update(data) {
          updating = true;
          calls.updates.push(data);
          return this;
        },
        async maybeSingle() {
          if (updating) {
            updating = false;
            return {
              data: options.zeroRows || options.updateError ? null : { id: 42 },
              error: options.updateError ? { code: "TEST_UNCERTAIN" } : null,
            };
          }
          if (calls.updates.length)
            return {
              data: options.readError
                ? null
                : {
                    payment_screenshot_path:
                      (typeof options.currentPath === "function"
                        ? options.currentPath(calls)
                        : options.currentPath) ?? "other-upload.png",
                  },
              error: options.readError ? { code: "TEST_READ" } : null,
            };
          return { data: order, error: null };
        },
      };
      return query;
    },
    storage: {
      from() {
        return {
          async upload(path) {
            calls.uploads.push(path);
            return { error: null };
          },
          async remove(paths) {
            calls.removes.push(...paths);
            return { error: null };
          },
        };
      },
    },
  };
  return { client, calls };
}
function uploadRequest(
  file = new File([new Uint8Array([255, 216, 255, 0])], "payment.jpg", {
    type: "image/jpeg",
  }),
) {
  const body = new FormData();
  body.set("screenshot", file);
  return new NextRequest(`${origin}/api/orders/payment-screenshot`, {
    method: "POST",
    headers: {
      origin,
      cookie: `unitshop_guest=${"a".repeat(64)}`,
      "x-order-id": "42",
    },
    body,
  });
}
test("upload client sends multipart screenshot and x-order-id, retrying only that endpoint", async () => {
  const calls = [];
  const file = new File(["test"], "payment.png", { type: "image/png" });
  const send = async (url, init) => {
    calls.push({ url, init });
    return Response.json(
      { success: calls.length > 1 },
      { status: calls.length > 1 ? 200 : 503 },
    );
  };
  await assert.rejects(uploadScreenshot("42", file, send));
  await uploadScreenshot("42", file, send);
  assert.equal(calls.length, 2);
  for (const { url, init } of calls) {
    assert.equal(url, "/api/orders/payment-screenshot");
    assert.equal(init.headers["x-order-id"], "42");
    assert.equal(init.headers["Content-Type"], undefined);
    assert.equal(init.body.get("screenshot").name, "payment.png");
  }
});
test("client accepts JPEG/PNG/WebP up to 5 MB and rejects empty/large/unsupported files", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"])
    assert.equal(screenshotError({ type, size: MAX_SCREENSHOT_BYTES }), null);
  assert.equal(screenshotError({ type: "image/png", size: 0 }), "size");
  assert.equal(
    screenshotError({ type: "image/png", size: MAX_SCREENSHOT_BYTES + 1 }),
    "size",
  );
  assert.equal(screenshotError({ type: "image/svg+xml", size: 100 }), "type");
});
test("orders endpoint accepts both COD and MMQR using the existing atomic RPC", async () => {
  for (const method of ["cod", "mmqr"]) {
    const { client, calls } = fakeClient();
    const post = loadRoute("orders", client);
    const request = new NextRequest(`${origin}/api/orders`, {
      method: "POST",
      headers: {
        origin,
        cookie: `unitshop_guest=${"a".repeat(64)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customer_name: "Test",
        customer_phone: "09123456789",
        customer_city: "Test",
        delivery_address: "Test address",
        payment_method: method,
        items: [{ product_id: 1, quantity: 1 }],
        idempotency_key: randomUUID(),
      }),
    });
    const response = await post(request);
    assert.equal(response.status, 201);
    assert.equal(calls.rpc[0].name, "create_guest_order");
    assert.equal(
      calls.rpc[0].args.p_order.payment_method,
      method.toUpperCase(),
    );
  }
});
test("upload attaches evidence without writing payment or order status", async () => {
  const { client, calls } = fakeClient();
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest());
  assert.equal(response.status, 201);
  assert.equal(calls.uploads.length, 1);
  assert.deepEqual(calls.updates, [
    { payment_screenshot_path: calls.uploads[0] },
  ]);
  assert.deepEqual(calls.removes, []);
});
test("already attached evidence is a successful retry, even after admin status changes", async () => {
  const { client, calls } = fakeClient({
    order: {
      payment_screenshot_path: "existing.png",
      payment_status: "verified",
      order_status: "confirmed",
    },
  });
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.deepEqual(calls.uploads, []);
  assert.deepEqual(calls.updates, []);
});
test("uncertain database update preserves the uploaded object", async () => {
  const { client, calls } = fakeClient({ updateError: true });
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest());
  assert.equal(response.status, 503);
  assert.equal(calls.uploads.length, 1);
  assert.deepEqual(calls.removes, []);
});
test("confirmed zero-row race cleans only this request's unreferenced file", async () => {
  const { client, calls } = fakeClient({ zeroRows: true });
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest());
  assert.equal(response.status, 201);
  assert.deepEqual(calls.removes, calls.uploads);
});
test("uncertain read-back preserves the uploaded object for reconciliation", async () => {
  const { client, calls } = fakeClient({ zeroRows: true, readError: true });
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(calls.removes, []);
});
test("ownership, method and image signatures are enforced before attachment", async () => {
  for (const options of [
    { owns: false },
    { order: { payment_method: "COD" } },
    { order: { order_status: "cancelled" } },
  ]) {
    const { client, calls } = fakeClient(options);
    const response = await loadRoute(
      "orders/payment-screenshot",
      client,
    )(uploadRequest());
    assert.ok(response.status >= 400);
    assert.deepEqual(calls.uploads, []);
  }
  const { client, calls } = fakeClient();
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest(new File(["not a PNG"], "fake.png", { type: "image/png" })));
  assert.equal(response.status, 415);
  assert.deepEqual(calls.uploads, []);
});
test("read-back confirming this upload never deletes its attached file", async () => {
  const { client, calls } = fakeClient({
    zeroRows: true,
    currentPath: (calls) => calls.uploads[0],
  });
  const response = await loadRoute(
    "orders/payment-screenshot",
    client,
  )(uploadRequest());
  assert.equal(response.status, 201);
  assert.deepEqual(calls.removes, []);
});
test("backend accepts PNG and WebP signatures, rejects empty and oversized images", async () => {
  for (const [bytes, type] of [
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"],
    [new TextEncoder().encode("RIFF1234WEBP"), "image/webp"],
  ]) {
    const { client } = fakeClient();
    const response = await loadRoute(
      "orders/payment-screenshot",
      client,
    )(uploadRequest(new File([bytes], "evidence", { type })));
    assert.equal(response.status, 201);
  }
  for (const bytes of [
    new Uint8Array(0),
    new Uint8Array(MAX_SCREENSHOT_BYTES + 1),
  ]) {
    const { client, calls } = fakeClient();
    const response = await loadRoute(
      "orders/payment-screenshot",
      client,
    )(uploadRequest(new File([bytes], "evidence.png", { type: "image/png" })));
    assert.equal(response.status, 413);
    assert.deepEqual(calls.uploads, []);
  }
});
test("upload requires same-origin request and guest cookie before any database calls", async () => {
  for (const headers of [
    {
      origin: "http://other.example",
      cookie: `unitshop_guest=${"a".repeat(64)}`,
    },
    { origin },
  ]) {
    const { client, calls } = fakeClient();
    const request = new NextRequest(`${origin}/api/orders/payment-screenshot`, {
      method: "POST",
      headers,
    });
    const response = await loadRoute(
      "orders/payment-screenshot",
      client,
    )(request);
    assert.ok(response.status >= 400);
    assert.deepEqual(calls.rpc, []);
    assert.deepEqual(calls.uploads, []);
  }
});
test("orders endpoint stops oversized streamed bodies before buffering all data or calling Supabase", async () => {
  for (const contentLength of [null, "1"]) {
    let reads = 0;
    let cancelled = false;
    const body = new ReadableStream({
      pull(controller) {
        reads++;
        if (reads > 100) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(4096).fill(97));
      },
      cancel() {
        cancelled = true;
      },
    });
    const headers = { origin, "content-type": "application/json" };
    if (contentLength) headers["content-length"] = contentLength;
    const { client, calls } = fakeClient();
    const request = new NextRequest(`${origin}/api/orders`, {
      method: "POST",
      headers,
      body,
      duplex: "half",
    });
    const response = await loadRoute("orders", client)(request);
    assert.equal(response.status, 413);
    assert.equal(cancelled, true);
    assert.ok(reads < 100);
    assert.deepEqual(calls.rpc, []);
  }
});
