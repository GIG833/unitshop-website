"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import {
  filterProducts,
  type Catalog,
} from "@/features/catalog/data";
import { ProductCard } from "./product-card";
import { PromotionBanners } from "./promotion-banners";
import { categoryPresentationIndex, categoryIconPath } from "@/features/catalog/category-presentation";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

function Arrow() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
export function Storefront({
  initialLocale = "en",
}: {
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<number | "all" | "mifi">("mifi");
  const t = dictionaries[locale];
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const [catalog, setCatalog] = useState<Catalog>({
    categories: [],
    products: [],
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [request, setRequest] = useState(0);
  const { categories, products } = catalog;
  // This must be initialized before evaluating a non-empty category list.
  // The first render has zero categories, hiding a TDZ crash until API data arrives.
  const categoryIndex = categoryPresentationIndex;
  const selectedFilter = filter === "mifi"
    ? categories.find((category) => categoryIndex(category.name_en) === 0)?.id ?? -1
    : filter;
  const shown = filterProducts(products, selectedFilter);
  const categoryName = (category: Catalog["categories"][number]) => {
    const index = categoryIndex(category.name_en);
    return index >= 0 ? t.categoryNames[index] : category.name_en;
  };
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        if (!response.ok) throw new Error("Catalog unavailable");
        const result: Catalog = await response.json();
        if (active) {
          setCatalog(result);
          setStatus("ready");
        }
      } catch {
        if (active) {
          setCatalog({ categories: [], products: [] });
          setStatus("error");
        }
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [request]);
  useEffect(() => {
    document.documentElement.lang = locale === "my" ? "my" : "en";
  }, [locale]);
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header id="top" className="header storefront-header">
        <div className="container header-inner">
          <a href="#top" aria-label="UNITSHOP" onClick={closeMenu}>
            <Brand />
          </a>
          <nav aria-label={t.menu} className="desktop-nav">
            <a href="#top">{t.home}</a>
            <a href="#categories">{t.shop}</a>
            <a href="#about">{t.about}</a>
          </nav>
          <div className="header-actions">
            <Link className="cart-nav account-shortcut" href={`/my-orders?lang=${locale}`}>{locale === "my" ? "ကျွန်ုပ်၏ အော်ဒါများ" : "My Orders"}</Link>
            <Link className="cart-nav cart-shortcut" href={`/cart?lang=${locale}`} aria-label={t.cartTitle} title={t.cartTitle}>
              <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2 11h12l2-8H6" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span className="cart-shortcut-text">{t.cartTitle}</span>
            </Link>
            <div
              className="language-switch"
              role="group"
              aria-label={t.language}
            >
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
            <button
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="menu-label">{menuOpen ? t.close : t.menu}</span>
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            className="mobile-nav container"
            aria-label={t.menu}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMenuOpen(false);
                document
                  .querySelector<HTMLButtonElement>(".menu-toggle")
                  ?.focus();
              }
            }}
          >
            <a onClick={closeMenu} href="#top">
              {t.home}
            </a>
            <a onClick={closeMenu} href="#categories">
              {t.shop}
            </a>
            <a onClick={closeMenu} href="#about">
              {t.about}
            </a>
            <Link href={`/my-orders?lang=${locale}`} onClick={closeMenu}>
              {locale === "my" ? "ကျွန်ုပ်၏ အော်ဒါများ" : "My Orders"}
            </Link>
            <Link href={`/cart?lang=${locale}`} onClick={closeMenu}>
              {t.cartTitle}
            </Link>
          </nav>
        )}
      </header>
      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="little-line" />
              {t.eyebrow}
            </p>
            <h1 id="hero-title">
              {t.hero}
              <br />
              <span>{t.heroAccent}</span>
            </h1>
            <p className="hero-intro">{t.intro}</p>
            <div className="hero-links">
              <a className="button-primary" href="#featured">
                {t.browse}
                <Arrow />
              </a>
              <a className="text-link" href="#categories">
                {t.discover}
                <Arrow />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="hero-footnote-mark" aria-hidden="true" /> {t.categoryNames[0]}{" "}
              <span> / </span> {t.categoryNames[1]} <span> / </span>{" "}
              {t.categoryNames[3]} <span> / </span> {t.categoryNames[4]}
            </div>
          </div>
          <div className="hero-art">
            <div className="art-top">
              <span className="status-dot" />
              {t.heroLabel}
              <span className="art-number">UNITSHOP</span>
            </div>
            <Image
              src="/images/a_clean_high_resolution_product_hero_scene_a_clo.png"
              width={620}
              height={480}
              priority
              alt={t.imageAlt}
              className="hero-image"
            />
            <div className="art-bottom">
              <span>{t.heroCaption}</span>
              <Arrow />
            </div>
            <span className="art-watermark" aria-hidden="true">
              UNITSHOP
            </span>
          </div>
        </section>
        <PromotionBanners locale={locale} />
        <section
          id="categories"
          className="category-section container"
          aria-labelledby="category-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.categoryEyebrow}</p>
              <h2 id="category-title">{t.categoryTitle}</h2>
            </div>
            <p>{t.categoryIntro}</p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <a
                className="category-card"
                key={category.id}
                href="#featured"
                onClick={() => setFilter(category.id)}
              >
                <div className="category-card-top">
                  <Image
                    src={categoryIconPath(category.name_en)}
                    width={88}
                    height={76}
                    alt=""
                  />
                  <Arrow />
                </div>
                <h3>{categoryName(category)}</h3>
                <p>
                  {categoryIndex(category.name_en) >= 0
                    ? t.categoryDescriptions[categoryIndex(category.name_en)]
                    : t.shop}
                </p>
              </a>
            ))}
          </div>
        </section>
        <section
          id="featured"
          className="featured-section"
          aria-labelledby="featured-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t.collection}</p>
                <h2 id="featured-title">{t.featured}</h2>
              </div>
              <p>{t.featuredIntro}</p>
            </div>
            <div className="filters" role="group" aria-label={t.filter}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  aria-pressed={selectedFilter === category.id}
                  onClick={() => setFilter(category.id)}
                >
                  {categoryName(category)}
                </button>
              ))}
              <button
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                {t.all}
              </button>
            </div>
            <div aria-busy={status === "loading"}>
              {status === "loading" && (
                <p className="catalog-state" role="status">
                  {t.loading}
                </p>
              )}
              {status === "error" && (
                <div className="catalog-state" role="alert">
                  <p>{t.loadError}</p>
                  <button
                    className="button-primary"
                    onClick={() => {
                      setStatus("loading");
                      setFilter("mifi");
                      setRequest((value) => value + 1);
                    }}
                  >
                    {t.retry}
                  </button>
                </div>
              )}
              {status === "ready" && (
                <>
                  <p className="sr-only" role="status">
                    {shown.length} {t.results}
                  </p>
                  {shown.length === 0 ? (
                    <p className="catalog-state" role="status">
                      {filter === "all" ? t.empty : t.emptyCategory}
                    </p>
                  ) : (
                    <div className="product-grid">
                      {shown.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          locale={locale}
                          noImage={t.noImage}
                          detailsLabel={t.productDetails}
                          category={(() => {
                            const category = categories.find(
                              (category) => category.id === product.category_id,
                            );
                            return category
                              ? categoryName(category)
                              : t.uncategorized;
                          })()}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
        <section id="about" className="about-section container">
          <div>
            <p className="eyebrow">{t.aboutEyebrow}</p>
            <h2>{t.aboutTitle}</h2>
          </div>
          <p>{t.aboutBody}</p>
        </section>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <a href="#top" aria-label="UNITSHOP">
                <Brand />
              </a>
              <p>{t.footer}</p>
            </div>
            <a className="text-link" href="#top">
              {t.back} ↑
            </a>
          </div>
          <section
            className="footer-contact"
            aria-labelledby="footer-contact-title"
          >
            <h2 id="footer-contact-title">{t.contactTitle}</h2>
            <dl className="footer-contact-grid">
              {telegram && /^[a-z0-9_]+bot$/i.test(telegram) && (
                <div>
                  <dt>Telegram</dt>
                  <dd><a href={`https://t.me/${telegram}`}>{locale === "my" ? "Telegram မှာ မေးရန်" : "Ask on Telegram"}</a></dd>
                </div>
              )}
              <div>
                <dt>{t.contactPhone}</dt>
                <dd>
                  <a href="tel:09780078055" dir="ltr">
                    09780078055
                  </a>
                </dd>
              </div>
              <div>
                <dt>Viber</dt>
                <dd>
                  <span dir="ltr">09780078055</span>
                </dd>
              </div>
              <div>
                <dt>Facebook</dt>
                <dd>
                  <a href="https://www.facebook.com/share/1K2GiDideu/?mibextid=wwXIfr">
                    {t.contactFacebook}
                  </a>
                </dd>
              </div>
            </dl>
          </section>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} UNITSHOP</span>
            <span>{t.footerNote}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
