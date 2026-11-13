
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Category = {
  id: string;
  name_en: string;
};

type Product = {
  id: string;
  name_en: string;
  price: number;
  is_active: boolean;
};

export default function ProductsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [nameEn, setNameEn] = useState("");
  const [nameMm, setNameMm] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionMm, setDescriptionMm] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error: roleError } =
        await supabase.rpc("is_admin");

      if (roleError || isAdmin !== true) {
        router.replace("/admin/login");
        return;
      }

      if (!active) return;
      setAuthorized(true);

      const [categoryResult, productResult] = await Promise.all([
        supabase.from("categories").select("id,name_en"),
        supabase
          .from("products")
          .select("id,name_en,price,is_active")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      if (categoryResult.error || productResult.error) {
        setError("Failed to load product data.");
      } else {
        setCategories(categoryResult.data || []);
        setProducts(productResult.data || []);
      }

      setLoading(false);
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleAddProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const parsedPrice = Number(price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Please enter a valid price.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase
      .from("products")
      .insert({
        name_en: nameEn.trim(),
        name_mm: nameMm.trim(),
        price: parsedPrice,
        category_id: categoryId,
        description_en: descriptionEn.trim(),
        description_mm: descriptionMm.trim(),
        is_active: true,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const { data, error: refreshError } = await supabase
      .from("products")
      .select("id,name_en,price,is_active")
      .order("created_at", { ascending: false });

    if (refreshError) {
      setError("Product saved, but list refresh failed.");
    } else {
      setProducts(data || []);
    }

    setNameEn("");
    setNameMm("");
    setPrice("");
    setCategoryId("");
    setDescriptionEn("");
    setDescriptionMm("");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="p-6">
        Checking admin access...
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-blue-700">
          UNITSHOP Product Management
        </h1>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        <form
          onSubmit={handleAddProduct}
          className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Add Product</h2>

          <input
            required
            placeholder="Product Name (English)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <input
            placeholder="Product Name (Myanmar)"
            value={nameMm}
            onChange={(e) => setNameMm(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <input
            required
            type="number"
            min="0"
            placeholder="Selling Price (Ks)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_en}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Description (English)"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <textarea
            placeholder="Description (Myanmar)"
            value={descriptionMm}
            onChange={(e) => setDescriptionMm(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Product"}
          </button>
        </form>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Products ({products.length})
          </h2>

          {products.length === 0 ? (
            <p className="text-slate-500">No products yet.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 border-b py-3"
                >
                  <div>
                    <p className="font-medium">{product.name_en}</p>
                    <p className="text-sm text-slate-500">
                      {Number(product.price).toLocaleString()} Ks
                    </p>
                  </div>

                  <span className="text-sm">
                    {product.is_active ? "Available" : "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
