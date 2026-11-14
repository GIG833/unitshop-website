"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Brand } from "./brand";
import { PaymentSelection } from "./payment-selection";
import {
  isPaymentMethod,
  type PaymentMethod,
} from "@/features/checkout/payment";
import { useCart } from "@/features/cart/use-cart";
import { totalMMK, type CartEntry } from "@/features/cart/model";
import {
  loadProduct,
  localizedText,
  formatPrice,
  type Product,
} from "@/features/catalog/data";
import {
  EMPTY_GUEST,
  FIELD_LIMITS,
  validateGuest,
  hasVerifiedCart,
  type GuestDetails,
  type GuestErrors,
} from "@/features/checkout/validation";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type CatalogueState =
  | { signature: string; status: "loading" | "error" }
  | { signature: string; status: "ready"; products: (Product | null)[] };
export function GuestCheckout({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState(initialLocale);
  const cart = useCart();
  const [details, setDetails] = useState<GuestDetails>({ ...EMPTY_GUEST });
  const [errors, setErrors] = useState<GuestErrors>({});
  const [checked, setChecked] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [request, setRequest] = useState(0);
  const [catalogue, setCatalogue] = useState<CatalogueState>({
    signature: "",
    status: "loading",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const t = dictionaries[locale];
  const signature = JSON.stringify(cart.entries);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!cart.ready) return;
      try {
        const entries = JSON.parse(signature) as CartEntry[];
        if (entries.length === 0) {
          if (active)
            setCatalogue({ signature, status: "ready", products: [] });
          return;
        }
        const { supabase } = await import("@/lib/supabase/client");
        const products = await Promise.all(
          entries.map((entry) =>
            loadProduct(supabase, String(entry.productId)),
          ),
        );
        if (active) setCatalogue({ signature, status: "ready", products });
      } catch {
        if (active) setCatalogue({ signature, status: "error" });
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [signature, cart.ready, request]);
  const status =
    !cart.ready || catalogue.signature !== signature
      ? "loading"
      : catalogue.status;
  const products =
    catalogue.status === "ready" && catalogue.signature === signature
      ? catalogue.products
      : [];

  const verified = hasVerifiedCart(cart.entries, products);
  const canValidate = status === "ready" && verified;
  const lines = cart.entries.flatMap((entry, index) =>
    products[index]
      ? [{ price: products[index]!.price, quantity: entry.quantity }]
      : [],
  );
  const fields = ["fullName", "phone", "city", "address", "notes"] as const;
  const labels = {
    fullName: t.checkoutFullName,
    phone: t.checkoutPhone,
    city: t.checkoutCity,
    address: t.checkoutAddress,
    notes: t.checkoutNotes,
  };
  const errorMessage = (error: string | undefined) =>
    error === "required"
      ? t.checkoutRequired
      : error === "phone"
        ? t.checkoutPhoneError
        : t.checkoutTooLong;
  const validationToken = `${signature}:${request}:${paymentMethod ?? ""}`;
  function updateField(field: keyof GuestDetails, value: string) {
    const next = { ...details, [field]: value };
    setDetails(next);
    setChecked(null);
    if (attempted) setErrors(validateGuest(next));
  }
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setChecked(null);
    const nextErrors = validateGuest(details);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = fields.find((field) => nextErrors[field]);
      if (first)
        formRef.current
          ?.querySelector<HTMLElement>(`#checkout-${first}`)
          ?.focus();
      return;
    }
    if (!isPaymentMethod(paymentMethod)) {
      formRef.current?.querySelector<HTMLInputElement>("#payment-cod")?.focus();
      return;
    }
    if (canValidate) setChecked(validationToken);
  }
  return (
    <>
      <a className="skip-link" href="#checkout-main">
        {t.skip}
      </a>
      <header className="header">
        <div className="container header-inner">
          <Link href={`/?lang=${locale}`} aria-label="UNITSHOP">
            <Brand />
          </Link>
          <div className="language-switch" role="group" aria-label={t.language}>
            <button
              lang="my"
              aria-pressed={locale === "my"}
              onClick={() => setLocale("my")}
            >
              မြန်မာ
            </button>
            <button
              lang="en"
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              EN<span className="sr-only"> English</span>
            </button>
          </div>
        </div>
      </header>
      <main id="checkout-main" className="container product-detail-main">
        <Link className="text-link detail-back" href={`/cart?lang=${locale}`}>
          ← {t.checkoutBack}
        </Link>
        <h1 className="cart-title">{t.checkoutTitle}</h1>
        <p className="checkout-notice">{t.checkoutPreview}</p>
        {cart.storageError && (
          <p className="catalog-state" role="alert">
            {t.cartStorageError}
          </p>
        )}
        <div className="checkout-grid">
          <form
            ref={formRef}
            className="checkout-form"
            noValidate
            onSubmit={validate}
          >
            <h2>{t.checkoutGuest}</h2>
            <p className="checkout-help">{t.checkoutPrivacy}</p>
            {fields.map((field) => (
              <div className="checkout-field" key={field}>
                <label htmlFor={`checkout-${field}`}>
                  {labels[field]}{" "}
                  {field === "notes" ? (
                    <span>({t.checkoutOptional})</span>
                  ) : (
                    <span aria-hidden="true">*</span>
                  )}
                </label>
                {field === "address" || field === "notes" ? (
                  <textarea
                    id={`checkout-${field}`}
                    rows={field === "address" ? 3 : 2}
                    value={details[field]}
                    maxLength={FIELD_LIMITS[field]}
                    required={field !== "notes"}
                    autoComplete={
                      field === "address" ? "street-address" : "off"
                    }
                    aria-invalid={!!errors[field]}
                    aria-describedby={
                      errors[field] ? `checkout-${field}-error` : undefined
                    }
                    onChange={(event) => updateField(field, event.target.value)}
                  />
                ) : (
                  <input
                    id={`checkout-${field}`}
                    type={field === "phone" ? "tel" : "text"}
                    inputMode={field === "phone" ? "tel" : "text"}
                    autoComplete={
                      field === "fullName"
                        ? "name"
                        : field === "phone"
                          ? "tel"
                          : "address-level2"
                    }
                    value={details[field]}
                    maxLength={FIELD_LIMITS[field]}
                    required
                    aria-invalid={!!errors[field]}
                    aria-describedby={
                      errors[field] ? `checkout-${field}-error` : undefined
                    }
                    onChange={(event) => updateField(field, event.target.value)}
                  />
                )}
                {errors[field] && (
                  <p
                    className="checkout-field-error"
                    id={`checkout-${field}-error`}
                  >
                    {errorMessage(errors[field])}
                  </p>
                )}
              </div>
            ))}
            <PaymentSelection
              method={paymentMethod}
              locale={locale}
              invalid={attempted && !isPaymentMethod(paymentMethod)}
              onChange={(method) => {
                setPaymentMethod(method);
                setChecked(null);
              }}
            />
            {attempted && Object.keys(errors).length > 0 && (
              <p role="alert" className="checkout-field-error">
                {t.checkoutFixErrors}
              </p>
            )}
            <button
              className="button-primary"
              type="submit"
              disabled={!canValidate}
            >
              {t.checkoutValidate}
            </button>
            <p role="status" className="checkout-validation">
              {checked === validationToken && canValidate
                ? t.checkoutValidated
                : ""}
            </p>
          </form>
          <aside
            className="checkout-summary"
            aria-labelledby="checkout-summary-heading"
            aria-busy={status === "loading"}
          >
            <h2 id="checkout-summary-heading">{t.checkoutSummary}</h2>
            {status === "loading" && (
              <p className="catalog-state" role="status">
                {t.cartLoading}
              </p>
            )}
            {status === "error" && (
              <div className="catalog-state" role="alert">
                <p>{t.cartError}</p>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    setChecked(null);
                    setCatalogue({ signature, status: "loading" });
                    setRequest((value) => value + 1);
                  }}
                >
                  {t.retry}
                </button>
                <p>{t.cartSaved}</p>
              </div>
            )}
            {status === "ready" && cart.entries.length === 0 && (
              <p role="status" className="catalog-state">
                {t.cartEmpty}
              </p>
            )}
            {status === "ready" && cart.entries.length > 0 && (
              <>
                <ul className="checkout-items">
                  {cart.entries.map((entry, index) => {
                    const product = products[index];
                    return (
                      <li key={entry.productId}>
                        <div>
                          <p>
                            {product
                              ? localizedText(
                                  product.name_en,
                                  product.name_mm,
                                  locale,
                                )
                              : `${t.cartUnavailable} #${entry.productId}`}
                          </p>
                          <p className="checkout-help">
                            {t.cartQuantity}: {entry.quantity}
                            {product && (
                              <>
                                {" "}
                                · {formatPrice(product.price, locale)}{" "}
                                {t.checkoutEach}
                              </>
                            )}
                          </p>
                        </div>
                        {product && (
                          <strong>
                            {formatPrice(
                              totalMMK([
                                {
                                  price: product.price,
                                  quantity: entry.quantity,
                                },
                              ]),
                              locale,
                            )}
                          </strong>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {!verified ? (
                  <p className="catalog-state" role="alert">
                    {t.checkoutUnavailable}
                  </p>
                ) : (
                  <div className="checkout-total">
                    <span>{t.checkoutTotal}</span>
                    <strong>{formatPrice(totalMMK(lines), locale)}</strong>
                  </div>
                )}
                <p className="checkout-help">{t.checkoutFees}</p>
                {paymentMethod && (
                  <p className="checkout-payment-summary">
                    {t.paymentTitle}:{" "}
                    <strong>
                      {paymentMethod === "cod" ? t.paymentCod : t.paymentMmqr}
                    </strong>
                  </p>
                )}
              </>
            )}
            <Link className="text-link" href={`/cart?lang=${locale}`}>
              {t.checkoutEditCart}
            </Link>
          </aside>
        </div>
      </main>
      <footer className="footer">
        <div className="container footer-bottom">
          <span>UNITSHOP</span>
          <span>{t.checkoutPreview}</span>
        </div>
      </footer>
    </>
  );
}
