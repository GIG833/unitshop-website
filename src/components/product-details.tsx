"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import {
  formatPrice,
  localizedText,
  loadProduct,
  parseProductId,
  type Product,
} from "@/features/catalog/data";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

type ProductState =
  | { status: "loading" | "error" | "not-found" }
  | { status: "ready"; product: Product };
export function ProductDetails({
  id,
  initialLocale,
}: {
  id: string;
  initialLocale: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [state, setState] = useState<ProductState>({ status: "loading" });
  const [request, setRequest] = useState(0);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const t = dictionaries[locale];
  const backUrl = `/?lang=${locale}#featured`;
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        if (parseProductId(id) === null) {
          if (active) setState({ status: "not-found" });
          return;
        }
        const { supabase } = await import("@/lib/supabase/client");
        const product = await loadProduct(supabase, id);
        if (active)
          setState(
            product ? { status: "ready", product } : { status: "not-found" },
          );
      } catch {
        if (active) setState({ status: "error" });
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [id, request]);
  const product = state.status === "ready" ? state.product : null;
  const name = product
    ? localizedText(product.name_en, product.name_mm, locale)
    : "";
  const description = product
    ? localizedText(product.description_en, product.description_mm, locale)
    : "";
  return (
    <>
      <a className="skip-link" href="#product-main">
        {t.skip}
      </a>
      <header className="header">
        <div className="container header-inner">
          <Link href={backUrl} aria-label="UNITSHOP">
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
      <main id="product-main" className="container product-detail-main">
        <Link className="text-link detail-back" href={backUrl}>
          ← {t.backToProducts}
        </Link>
        <div aria-busy={state.status === "loading"}>
          {state.status === "loading" && (
            <div className="catalog-state" role="status">
              <h1 className="detail-state-title">{t.productDetails}</h1>
              <p>{t.productLoading}</p>
            </div>
          )}
          {state.status === "error" && (
            <div className="catalog-state" role="alert">
              <h1 className="detail-state-title">{t.productDetails}</h1>
              <p>{t.productError}</p>
              <button
                className="button-primary"
                onClick={() => {
                  setState({ status: "loading" });
                  setRequest((value) => value + 1);
                }}
              >
                {t.retry}
              </button>
            </div>
          )}
          {state.status === "not-found" && (
            <div className="catalog-state" role="status">
              <h1 className="detail-state-title">{t.productNotFound}</h1>
              <p>{t.productNotFoundBody}</p>
            </div>
          )}
          {product && (
            <article className="product-detail-grid">
              <div className="detail-image">
                {product.image_url && failedImage !== product.image_url ? (
                  // Public HTTPS product URLs use the existing image strategy without new host settings.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={name}
                    width={640}
                    height={560}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImage(product.image_url)}
                  />
                ) : (
                  <p className="image-unavailable">{t.noImage}</p>
                )}
              </div>
              <div className="detail-copy">
                <p className="eyebrow">{t.productDetails}</p>
                <h1>{name}</h1>
                <p className="detail-price">
                  {formatPrice(product.price, locale)}
                </p>
                <section aria-labelledby="description-heading">
                  <h2 id="description-heading">{t.description}</h2>
                  <p className="product-description">
                    {description || t.noDescription}
                  </p>
                </section>
              </div>
            </article>
          )}
        </div>
      </main>
      <footer className="footer">
        <div className="container footer-bottom">
          <span>UNITSHOP</span>
          <span>{t.footer}</span>
        </div>
      </footer>
    </>
  );
}
