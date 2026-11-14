import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateGuest,
  validPhone,
  normalizePhone,
  EMPTY_GUEST,
  FIELD_LIMITS,
  hasVerifiedCart,
} from "../src/features/checkout/validation.ts";
import { dictionaries } from "../src/lib/i18n/dictionaries.ts";
const valid = {
  fullName: "Test Customer",
  phone: "09 123 456 789",
  city: "Yangon",
  address: "Example delivery address",
  notes: "",
};
test("all required fields reject empty and whitespace values; notes are optional", () => {
  assert.deepEqual(validateGuest(EMPTY_GUEST), {
    fullName: "required",
    phone: "required",
    city: "required",
    address: "required",
  });
  assert.deepEqual(
    validateGuest({
      ...EMPTY_GUEST,
      fullName: "  ",
      phone: "  ",
      city: "\t",
      address: "\n",
      notes: " ",
    }),
    {
      fullName: "required",
      phone: "required",
      city: "required",
      address: "required",
    },
  );
  assert.deepEqual(validateGuest(valid), {});
});
test("English and Myanmar customer names and delivery text are accepted", () => {
  assert.deepEqual(
    validateGuest({
      ...valid,
      fullName: "မောင်မောင်",
      city: "ရန်ကုန်",
      address: "အမှတ် ၁၊ ရန်ကုန်",
      notes: "ညနေပိုင်း",
    }),
    {},
  );
});
test("phone validation supports local, international, formatted and Myanmar digits", () => {
  for (const value of [
    "09123456789",
    "+95 9 123 456 789",
    "(09) 123-456-789",
    "၀၉၁၂၃၄၅၆၇၈၉",
    "+၉၅ ၉ ၁၂၃ ၄၅၆ ၇၈၉",
  ])
    assert.equal(validPhone(value), true, value);
  assert.equal(normalizePhone(" +၉၅ (၉) ၁၂၃-၄၅၆၇၈၉ "), "+959123456789");
});
test("phone validation rejects malformed, short, long and non-phone inputs", () => {
  for (const value of [
    "",
    "123456",
    "1234567890123456",
    "09abc1234567",
    "++959123456789",
    "09+123456789",
    "00000000",
    "09/123456789",
    "09.123456789",
    "<script>",
  ])
    assert.equal(validPhone(value), false, value);
  assert.equal(validateGuest({ ...valid, phone: "abc" }).phone, "phone");
});
test("field lengths are validated without mutating or retaining submitted details", () => {
  for (const field of Object.keys(FIELD_LIMITS))
    assert.equal(
      validateGuest({ ...valid, [field]: "1".repeat(FIELD_LIMITS[field] + 1) })[
        field
      ],
      "tooLong",
    );
  const copy = { ...valid };
  validateGuest(copy);
  assert.deepEqual(copy, valid);
});
test("review requires a complete active product response matching the saved cart", () => {
  const entries = [{ productId: 12, quantity: 2 }];
  const product = { id: 12, is_active: true, price: 2500 };
  assert.equal(hasVerifiedCart(entries, [product]), true);
  for (const products of [
    [],
    [null],
    [{ ...product, id: 13 }],
    [{ ...product, is_active: false }],
    [{ ...product, price: NaN }],
    [{ ...product, price: -1 }],
  ])
    assert.equal(hasVerifiedCart(entries, products), false);
  assert.equal(hasVerifiedCart([], []), false);
  assert.equal(
    hasVerifiedCart([{ productId: 12, quantity: 0 }], [product]),
    false,
  );
  assert.equal(
    hasVerifiedCart([{ productId: 12, quantity: 100 }], [product]),
    false,
  );
});
test("both languages cover fields, errors, privacy and preview-only messaging", () => {
  assert.deepEqual(
    Object.keys(dictionaries.en).sort(),
    Object.keys(dictionaries.my).sort(),
  );
  for (const locale of ["en", "my"])
    for (const key of [
      "checkoutTitle",
      "checkoutPreview",
      "checkoutPrivacy",
      "checkoutFullName",
      "checkoutPhone",
      "checkoutCity",
      "checkoutAddress",
      "checkoutNotes",
      "checkoutRequired",
      "checkoutPhoneError",
      "checkoutValidated",
      "checkoutUnavailable",
      "checkoutTotal",
    ])
      assert.ok(dictionaries[locale][key].length > 0);
});
