"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";

type Promotion = {
  id: number;
  title_en: string;
  title_mm: string | null;
  body_en: string | null;
  body_mm: string | null;
  image_url: string | null;
};

export function PromotionBanners({ locale }: { locale: Locale }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/promotions", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return; // A promotion outage must never break the shop.
        const payload: { promotions?: Promotion[] } = await response.json();
        if (active && Array.isArray(payload.promotions)) {
          setPromotions(payload.promotions.filter(
            (p) => p && Number.isSafeInteger(p.id) && typeof p.title_en === "string",
          ).slice(0, 6));
        }
      } catch { /* Keep the existing storefront usable without promotions. */ }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, []);

  if (promotions.length === 0) return null;
  const isMy = locale === "my";
  return (
    <section className="promotion-section container" aria-labelledby="promotion-heading">
      <div className="promotion-heading">
        <p className="eyebrow">{isMy ? "UNITSHOP အထူးအစီအစဉ်" : "UNITSHOP SPECIAL OFFERS"}</p>
        <h2 id="promotion-heading">{isMy ? "လက်ရှိ ပရိုမိုးရှင်းများ" : "Current promotions"}</h2>
      </div>
      <div className="promotion-grid">
        {promotions.map((promotion) => {
          const title = (isMy ? promotion.title_mm?.trim() : null) || promotion.title_en;
          const body = (isMy ? promotion.body_mm?.trim() : null) || promotion.body_en;
          return (
            <article className="promotion-banner" key={promotion.id}>
              <div className="promotion-copy">
                <p className="promotion-kicker">UNITSHOP / SPECIAL OFFER</p>
                <h3>{title}</h3>
                {body && <p className="promotion-body">{body}</p>}
                <p className="promotion-note">
                  {isMy
                    ? "လျှော့ဈေးကို ဆိုင်မှ အတည်ပြုပြီး နောက်ဆုံးဘောက်ချာတွင်သာ တွက်ချက်ပါမည်။ Website ဈေးနှုန်း မပြောင်းလဲပါ။"
                    : "Offer confirmed by the shop on the final invoice. Website checkout prices stay unchanged."}
                </p>
              </div>
              {promotion.image_url && (
                <div className="promotion-image-wrap">
                  {/* Images are uploaded by shop admins and proxied by our own site. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={promotion.image_url} alt="" loading="lazy" decoding="async" />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
