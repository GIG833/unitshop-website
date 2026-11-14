"use client";
import { useState } from "react";
import Link from "next/link";
import {
  formatPrice,
  localizedText,
  type Product,
} from "@/features/catalog/data";
import type { Locale } from "@/lib/i18n/dictionaries";

export function ProductCard({
  product,
  category,
  locale,
  noImage,
}: {
  product: Product;
  category: string;
  locale: Locale;
  noImage: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const name = localizedText(product.name_en, product.name_mm, locale);
  const description = localizedText(
    product.description_en,
    product.description_mm,
    locale,
  );
  return (
    <article className="product-card">
      <Link
        className="product-card-link"
        href={`/products/${product.id}?lang=${locale}`}
        prefetch={false}
      >
        <div className="product-image">
          {product.image_url && failedImage !== product.image_url ? (
            // Existing Supabase public image URLs need no new Next.js remote-host configuration.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={name}
              width={240}
              height={190}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedImage(product.image_url)}
            />
          ) : (
            <span className="image-unavailable">{noImage}</span>
          )}
        </div>
        <div className="product-copy">
          <p className="product-category">{category}</p>
          <h3>{name}</h3>
          <p className="product-price">{formatPrice(product.price, locale)}</p>
          {description && <p className="product-description">{description}</p>}
        </div>
      </Link>
    </article>
  );
}
