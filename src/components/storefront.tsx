"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { categories, products, type Category } from "@/features/catalog/data";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
export function Storefront() {
  const [locale, setLocale] = useState<Locale>("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const t = dictionaries[locale];
  const shown = products.filter(
    (p) => filter === "all" || p.category === filter,
  );
  useEffect(() => {
    document.documentElement.lang = locale === "my" ? "my" : "en";
  }, [locale]);
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <div className="announcement">
        <span>{t.preview}</span>
        <span className="preview-tag">{t.previewTag}</span>
      </div>
      <header id="top" className="header">
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
              {menuOpen ? t.close : t.menu}
              <span aria-hidden="true">{menuOpen ? " ×" : " ☰"}</span>
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
              <a className="button-primary" href="#categories">
                {t.browse}
                <Arrow />
              </a>
              <a className="text-link" href="#about">
                {t.discover}
                <Arrow />
              </a>
            </div>
            <div className="hero-footnote">
              <span aria-hidden="true">✳</span> {t.categoryNames[0]}{" "}
              <span> / </span> {t.categoryNames[1]} <span> / </span>{" "}
              {t.categoryNames[3]} <span> / </span> {t.categoryNames[4]}
            </div>
          </div>
          <div className="hero-art">
            <div className="art-top">
              <span className="status-dot" />
              {t.heroLabel}
              <span className="art-number">01 / 05</span>
            </div>
            <Image
              src="/images/hero.svg"
              width={620}
              height={480}
              priority
              alt={t.imageAlt}
              className="hero-image"
            />
            <div className="art-bottom">
              <span>{t.heroCaption}</span>
              <span aria-hidden="true">↗</span>
            </div>
            <span className="art-watermark" aria-hidden="true">
              UNITSHOP
            </span>
          </div>
        </section>
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
            {categories.map((category, i) => (
              <a
                className="category-card"
                key={category}
                href="#featured"
                onClick={() => setFilter(category)}
              >
                <div className="category-card-top">
                  <Image
                    src={`/images/device-${i}.svg`}
                    width={88}
                    height={76}
                    alt=""
                  />
                  <Arrow />
                </div>
                <h3>{t.categoryNames[i]}</h3>
                <p>{t.categoryDescriptions[i]}</p>
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
              {(["all", ...categories] as const).map((category, i) => (
                <button
                  key={category}
                  aria-pressed={filter === category}
                  onClick={() => setFilter(category)}
                >
                  {i === 0 ? t.all : t.categoryNames[i - 1]}
                </button>
              ))}
            </div>
            <p className="sr-only" role="status">
              {shown.length} {t.results}
            </p>
            <div className="product-grid">
              {shown.map((product) => {
                const i = categories.indexOf(product.category);
                return (
                  <article key={product.id} className="product-card">
                    <div className="product-image">
                      <span className="sample-label">{t.sample}</span>
                      <Image
                        src={product.image}
                        width={240}
                        height={190}
                        alt={`${t.categoryNames[i]} — ${t.placeholder}`}
                      />
                      <span className="placeholder-label">{t.placeholder}</span>
                    </div>
                    <div className="product-copy">
                      <p className="product-category">{t.categoryNames[i]}</p>
                      <h3>
                        {t.categoryNames[i]} · {t.sampleName}
                      </h3>
                      <p>{t.details}</p>
                    </div>
                  </article>
                );
              })}
            </div>
            <aside className="sample-notice">
              <span className="notice-icon" aria-hidden="true">
                i
              </span>
              <div>
                <h3>{t.noticeTitle}</h3>
                <p>{t.notice}</p>
              </div>
            </aside>
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
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} UNITSHOP</span>
            <span>{t.footerNote}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
