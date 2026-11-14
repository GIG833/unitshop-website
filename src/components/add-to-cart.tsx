"use client";
import Link from "next/link";
import { useState } from "react";
import { loadProduct } from "@/features/catalog/data";
import { useCart } from "@/features/cart/use-cart";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
export function AddToCart({
  productId,
  locale,
}: {
  productId: number;
  locale: Locale;
}) {
  const cart = useCart();
  const [status, setStatus] = useState<
    "idle" | "adding" | "added" | "unavailable" | "error" | "limit"
  >("idle");
  const t = dictionaries[locale];
  async function add() {
    if (status === "adding") return;
    setStatus("adding");
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const product = await loadProduct(supabase, String(productId));
      if (!product) {
        setStatus("unavailable");
        return;
      }
      try {
        cart.add(product);
      } catch {
        setStatus("limit");
        return;
      }
      setStatus("added");
    } catch {
      setStatus("error");
    }
  }
  return (
    <div className="cart-actions">
      <button
        className="button-primary"
        disabled={!cart.ready || status === "adding"}
        onClick={add}
      >
        {status === "adding" ? t.cartChecking : t.addToCart}
      </button>
      <Link className="text-link" href={`/cart?lang=${locale}`}>
        {t.viewCart}
      </Link>
      <p
        role={
          status === "error" || status === "unavailable" ? "alert" : "status"
        }
      >
        {status === "added"
          ? t.cartAdded
          : status === "error"
            ? t.cartError
            : status === "unavailable"
              ? t.cartUnavailable
              : status === "limit"
                ? t.cartLimit
                : ""}
      </p>
      {cart.storageError && <p role="alert">{t.cartStorageError}</p>}
    </div>
  );
}
