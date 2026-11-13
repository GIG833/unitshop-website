"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Category = {
  id: number;
  name_en: string;
};

type Product = {
  id: number;
  name_en: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
};

export default function ProductsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [nameEn, setNameEn] = useState("");
  const [nameMm, setNameMm] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionMm, setDescriptionMm] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
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
          supabase
            .from("categories")
            .select("id,name_en")
            .order("name_en"),
          supabase
            .from("products")
            .select("id,name_en,price,image_url,is_active")
            .order("created_at", { ascending: false }),
        ]);

        if (!active) return;

        if (categoryResult.error) {
          setError(categoryResult.error.message);
        } else if (productResult.error) {
          setError(productResult.error.message);
        } else {
          setCategories(categoryResult.data || []);
          setProducts(productResult.data || []);
        }
      } catch {
        if (active) setError("Failed to load product data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0] || null;

    if (!file) {
      setPhoto(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      setPhoto(null);
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      setPhoto(null);
      e.target.value = "";
      return;
    }

    setPhoto(file);
  }

  async function handleAddProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    setError("");
    setSuccess("");

    const parsedPrice = Number(price);

    if (!nameEn.trim() || !categoryId) {
      setError("Product name and category are required.");
      return;
    }

    if (
      !price.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      setError("Please enter a valid price.");
      return;
    }

    if (!photo) {
      setError("Please select a product photo.");
      return;
    }

    setSaving(true);

    let uploadedPath: string | null = null;

    try {
      const extension = photo.type === "image/png"
        ? "png"
        : photo.type === "image/webp"
          ? "webp"
          : "jpg";

      const filePath = `products/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPath = filePath;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("products")
        .insert({
          name_en: nameEn.trim(),
          name_mm: nameMm.trim(),
          price: parsedPrice,
          category_id: Number(categoryId),
          description_en: descriptionEn.trim(),
          description_mm: descriptionMm.trim(),
          image_url: urlData.publicUrl,
          is_active: true,
        });

      if (insertError) throw insertError;

      setSuccess("Product added successfully!");

      setNameEn("");
      setNameMm("");
      setPrice("");
      setCategoryId("");
      setDescriptionEn("");
      setDescriptionMm("");
      setPhoto(null);
      setFileInputKey((key) => key + 1);

      const { data, error: refreshError } = await supabase
        .from("products")
        .select("id,name_en,price,image_url,is_active")
        .order("created_at", { ascending: false });

      if (refreshError) {
        setError("Product saved, but list refresh failed.");
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      if (uploadedPath) {
        await supabase.storage
          .from("product-images")
          .remove([uploadedPath]);
      }

      setError(
        err instanceof Error ? err.message : "Failed to add product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(product: Product) {
    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const newStatus = !product.is_active;

    try {
      const { data, error: updateError } = await supabase
        .from("products")
        .update({ is_active: newStatus })
        .eq("id", product.id)
        .select("id,is_active")
        .single();

      if (updateError) throw updateError;

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, is_active: data.is_active }
            : item
        )
      );

      setSuccess("Product availability updated!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update availability."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6">Checking admin access...</main>;
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-blue-700">
          UNITSHOP Product Management
        </h1>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg bg-green-50 p-3 text-green-700">
            {success}
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

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Product Photo
            </label>
            <input
              key={fileInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              required
              className="w-full rounded-lg border p-3"
            />
            <p className="text-xs text-slate-500">
              JPG, PNG or WebP. Maximum 5 MB.
            </p>
            {photo && (
              <p className="text-sm text-blue-700">
                Selected: {photo.name}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Uploading & Saving..." : "Add Product"}
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
                  className="flex items-center justify-between gap-4 border-b py-3"
                >
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name_en}
                        className="h-16 w-16 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                        No image
                      </div>
                    )}

                    <div>
                      <p className="font-medium">{product.name_en}</p>
                      <p className="text-sm text-slate-500">
                        {Number(product.price).toLocaleString()} Ks
                      </p>
                    </div>
                  </div>

                 
<button
  type="button"
  onClick={() => toggleAvailability(product)}
  disabled={saving}
  className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
    product.is_active
      ? "bg-green-600"
      : "bg-red-600"
  }`}
>
  {product.is_active ? "Available" : "Unavailable"}
</button>

                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}




