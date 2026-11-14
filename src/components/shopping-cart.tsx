"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { useCart } from "@/features/cart/use-cart";
import { MAX_QUANTITY, totalMMK, type CartEntry } from "@/features/cart/model";
import {
  loadProduct,
  formatPrice,
  localizedText,
  type Product,
} from "@/features/catalog/data";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export function ShoppingCart({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState(initialLocale);
  const cart = useCart();
  const t = dictionaries[locale];
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <>
      <a className="skip-link" href="#cart-main">
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
      <main id="cart-main" className="container product-detail-main">
        <Link
          className="text-link detail-back"
          href={`/?lang=${locale}#featured`}
        >
          ← {t.backToProducts}
        </Link>
        <h1 className="cart-title">{t.cartTitle}</h1>
        {cart.storageError && (
          <p className="catalog-state" role="alert">
            {t.cartStorageError}
          </p>
        )}
        {!cart.ready ? (
          <p className="catalog-state" role="status">
            {t.cartLoading}
          </p>
        ) : cart.entries.length === 0 ? (
          <p className="catalog-state" role="status">
            {t.cartEmpty}
          </p>
        ) : (
          <CartContents
            key={cart.entries.map((item) => item.productId).join(",")}
            entries={cart.entries}
            locale={locale}
            remove={cart.remove}
            setQuantity={cart.setQuantity}
          />
        )}
      </main>
      <footer className="footer">
        <div className="container footer-bottom">
          <span>UNITSHOP</span>
          <span>{t.cartNoCheckout}</span>
        </div>
      </footer>
    </>
  );
}
function CartContents({
  entries,
  locale,
  remove,
  setQuantity,
}: {
  entries: CartEntry[];
  locale: Locale;
  remove: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
}) {
  const [products, setProducts] = useState<(Product | null)[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [request, setRequest] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const t = dictionaries[locale];
  const ids = entries.map((item) => item.productId).join(",");
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const result = await Promise.all(
          ids.split(",").map((id) => loadProduct(supabase, id)),
        );
        if (active) {
          setProducts(result);
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("error");
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [ids, request]);
  async function increase(entry: CartEntry) {
    if (pending !== null) return;
    setPending(entry.productId);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const fresh = await loadProduct(supabase, String(entry.productId));
      setProducts((current) =>
        current.map((product, index) =>
          entries[index].productId === entry.productId ? fresh : product,
        ),
      );
      if (!fresh) {
        setMessage("unavailable");
        return;
      }
      setQuantity(entry.productId, entry.quantity + 1);
    } catch {
      setMessage("error");
    } finally {
      setPending(null);
    }
  }
  const lines = entries.flatMap((entry, index) =>
    products[index]
      ? [{ price: products[index]!.price, quantity: entry.quantity }]
      : [],
  );
  return (
    <div aria-busy={status === "loading"}>
      {status === "loading" && (
        <p className="catalog-state" role="status">
          {t.cartLoading}
        </p>
      )}
      {status === "error" && (
        <div className="catalog-state" role="alert">
          <p>{t.cartError}</p>
          <button
            className="button-primary"
            onClick={() => {
              setStatus("loading");
              setRequest((value) => value + 1);
            }}
          >
            {t.retry}
          </button>
          <p>{t.cartSaved}</p>
          {entries.map((entry) => (
            <button
              className="cart-remove"
              key={entry.productId}
              onClick={() => remove(entry.productId)}
            >
              {t.cartRemove} #{entry.productId}
            </button>
          ))}
        </div>
      )}
      {status === "ready" && (
        <>
          {pending !== null && <p role="status">{t.cartChecking}</p>}
          <p role="alert">
            {message === "error"
              ? t.cartError
              : message === "unavailable"
                ? t.cartUnavailable
                : ""}
          </p>
          <ul className="cart-list">
            {entries.map((entry, index) => {
              const product = products[index];
              const name = product
                ? localizedText(product.name_en, product.name_mm, locale)
                : `${t.cartUnavailable} #${entry.productId}`;
              return (
                <li key={entry.productId} className="cart-row">
                  <CartImage
                    key={product?.image_url || entry.productId}
                    product={product}
                    name={name}
                    noImage={t.noImage}
                  />
                  <div className="cart-item-copy">
                    {product ? (
                      <Link href={`/products/${product.id}?lang=${locale}`}>
                        {name}
                      </Link>
                    ) : (
                      <p>{name}</p>
                    )}
                    {product && (
                      <p className="product-price">
                        {formatPrice(product.price, locale)}
                      </p>
                    )}
                    <button
                      className="cart-remove"
                      onClick={() => remove(entry.productId)}
                      aria-label={`${t.cartRemove}: ${name}`}
                    >
                      {t.cartRemove}
                    </button>
                  </div>
                  <div
                    className="cart-quantity"
                    role="group"
                    aria-label={`${t.cartQuantity}: ${name}`}
                  >
                    <button
                      disabled={entry.quantity <= 1 || pending !== null}
                      onClick={() => {
                        setQuantity(entry.productId, entry.quantity - 1);
                      }}
                      aria-label={`${t.cartDecrease}: ${name}`}
                    >
                      −
                    </button>
                    <span aria-live="polite">{entry.quantity}</span>
                    <button
                      disabled={
                        !product ||
                        entry.quantity >= MAX_QUANTITY ||
                        pending !== null
                      }
                      onClick={() => void increase(entry)}
                      aria-label={`${t.cartIncrease}: ${name}`}
                    >
                      +
                    </button>
                  </div>
                  {product && (
                    <p className="cart-line-total">
                      {formatPrice(
                        totalMMK([
                          { price: product.price, quantity: entry.quantity },
                        ]),
                        locale,
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <aside className="cart-summary">
            <h2>{t.cartTotal}</h2>
            <p>{formatPrice(totalMMK(lines), locale)}</p>
            {products.some((product) => !product) && (
              <p className="cart-disclaimer">{t.cartExcluded}</p>
            )}
            <p className="cart-disclaimer">{t.cartNoCheckout}</p>
            {!products.some((product) => !product) && pending === null && (
              <Link
                className="button-primary checkout-link"
                href={`/checkout?lang=${locale}`}
              >
                {t.checkoutContinue}
              </Link>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
function CartImage({
  product,
  name,
  noImage,
}: {
  product: Product | null | undefined;
  name: string;
  noImage: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="cart-image">
      {product?.image_url && !failed ? (
        // Existing public HTTPS image strategy; no remote settings or credentials needed.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={name}
          width={100}
          height={100}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{noImage}</span>
      )}
    </div>
  );
}
