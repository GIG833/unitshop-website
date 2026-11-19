"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Promotion = {
  id: number;
  title_en: string;
  title_mm: string | null;
  body_en: string | null;
  body_mm: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const fields = "id,title_en,title_mm,body_en,body_mm,image_url,sort_order,is_active";

export default function PromotionsAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleMm, setTitleMm] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyMm, setBodyMm] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [enabled, setEnabled] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data.user) { router.replace("/admin/login"); return; }
        const { data: admin, error: roleError } = await supabase.rpc("is_admin");
        if (roleError || admin !== true) { router.replace("/admin/login"); return; }
        if (!active) return;
        setAuthorized(true);
        const response = await supabase.from("promotions").select(fields)
          .order("sort_order").order("id", { ascending: false });
        if (!active) return;
        if (response.error) throw response.error;
        setPromotions(response.data ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load promotions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, [router]);

  async function refresh() {
    const { data, error: fetchError } = await supabase.from("promotions")
      .select(fields).order("sort_order").order("id", { ascending: false });
    if (fetchError) throw fetchError;
    setPromotions(data ?? []);
  }

  function clearForm() {
    setEditing(null);
    setTitleEn(""); setTitleMm(""); setBodyEn(""); setBodyMm("");
    setSortOrder("0"); setEnabled(false); setPhoto(null);
    setImageUrl(null); setFileKey((value) => value + 1);
  }

  function edit(promotion: Promotion) {
    if (busy) return;
    setEditing(promotion.id);
    setTitleEn(promotion.title_en);
    setTitleMm(promotion.title_mm ?? "");
    setBodyEn(promotion.body_en ?? "");
    setBodyMm(promotion.body_mm ?? "");
    setSortOrder(String(promotion.sort_order));
    setEnabled(promotion.is_active);
    setImageUrl(promotion.image_url);
    setPhoto(null); setFileKey((value) => value + 1);
    setError(""); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = event.target.files?.[0] ?? null;
    if (file && (!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024)) {
      setPhoto(null);
      event.target.value = "";
      setError("Choose a JPG, PNG or WebP image smaller than 5 MB.");
      return;
    }
    setPhoto(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    const position = Number(sortOrder);
    if (!titleEn.trim() || titleEn.trim().length > 120 || titleMm.length > 120 ||
      bodyEn.length > 320 || bodyMm.length > 320 ||
      !Number.isInteger(position) || position < 0 || position > 1000) {
      setError("Check the headline, text length and display order (0–1000).");
      return;
    }
    setBusy(true);
    let newPath: string | null = null;
    try {
      let uploadedUrl = imageUrl;
      if (photo) {
        const extension = photo.type === "image/png" ? "png" :
          photo.type === "image/webp" ? "webp" : "jpg";
        newPath = `promotions/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images").upload(newPath, photo, {
            contentType: photo.type, upsert: false,
          });
        if (uploadError) throw uploadError;
        uploadedUrl = supabase.storage.from("product-images")
          .getPublicUrl(newPath).data.publicUrl;
      }
      const values = {
        title_en: titleEn.trim(),
        title_mm: titleMm.trim() || null,
        body_en: bodyEn.trim() || null,
        body_mm: bodyMm.trim() || null,
        image_url: uploadedUrl,
        sort_order: position,
        is_active: enabled,
      };
      const response = editing === null
        ? await supabase.from("promotions").insert(values).select("id").single()
        : await supabase.from("promotions").update(values).eq("id", editing).select("id").single();
      if (response.error) throw response.error;
      clearForm();
      setMessage("Promotion saved. Enabled offers appear on the homepage.");
      try { await refresh(); }
      catch { setError("Saved, but the list could not refresh. Reload to see changes."); }
    } catch (err) {
      // Only clean a new image if its database save failed; never delete existing images.
      if (newPath) await supabase.storage.from("product-images").remove([newPath]);
      setError(err instanceof Error ? err.message : "Unable to save promotion.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(promotion: Promotion) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: updateError } = await supabase.from("promotions")
        .update({ is_active: !promotion.is_active }).eq("id", promotion.id);
      if (updateError) throw updateError;
      await refresh();
      setMessage(promotion.is_active ? "Promotion hidden from customers." : "Promotion published.");
      if (editing === promotion.id) setEnabled(!promotion.is_active);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update promotion.");
    } finally { setBusy(false); }
  }

  async function remove(promotion: Promotion) {
    if (busy || !window.confirm(`Delete "${promotion.title_en}"? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: deleteError } = await supabase.from("promotions")
        .delete().eq("id", promotion.id);
      if (deleteError) throw deleteError;
      if (editing === promotion.id) clearForm();
      await refresh();
      setMessage("Promotion deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete promotion.");
    } finally { setBusy(false); }
  }

  if (loading) return <main className="p-6">Checking admin access...</main>;
  if (!authorized) return null;

  const input = "w-full rounded-lg border border-slate-300 p-3";
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm text-blue-700">← Admin Dashboard</Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Promotion Banners</h1>
            <p className="mt-1 text-sm text-slate-600">
              Display only. Checkout, product prices and order totals never change.
            </p>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="rounded-lg border bg-white px-4 py-2 text-sm text-blue-700">
            View Website
          </a>
        </div>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-blue-700">{message}</p>}

        <form onSubmit={save} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{editing === null ? "Create Promotion" : "Edit Promotion"}</h2>
          <p className="text-sm text-slate-500">Offers are drafts until you enable them. Do not advertise an unapproved discount.</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Headline (English) *</span>
            <input required maxLength={120} value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. November Special Offers" className={input} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Headline (Myanmar, optional)</span>
            <input maxLength={120} value={titleMm}
              onChange={(e) => setTitleMm(e.target.value)} className={input} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Description (English, optional)</span>
            <textarea maxLength={320} rows={2} value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)} className={input}/>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Description (Myanmar, optional)</span>
            <textarea maxLength={320} rows={2} value={bodyMm}
              onChange={(e) => setBodyMm(e.target.value)} className={input}/>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Banner Photo (optional)</span>
            <input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={selectPhoto} className={input}/>
            <span className="block text-xs text-slate-500">
              JPG, PNG or WebP, maximum 5 MB. Leave blank to keep the current image; text-only banners also work.
            </span>
            {imageUrl && !photo && (
              // Admin-uploaded existing image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Current banner" className="mt-2 h-28 w-auto rounded-lg object-contain"/>
            )}
            {photo && <span className="text-xs text-blue-700">New photo: {photo.name}</span>}
          </label>
          <div className="flex flex-wrap items-center gap-6">
            <label className="space-y-1">
              <span className="block text-sm font-medium">Display order (0 first)</span>
              <input type="number" min={0} max={1000} step={1} value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-36 rounded-lg border border-slate-300 p-3" />
            </label>
            <label className="flex items-center gap-2 pt-5 text-sm font-medium">
              <input type="checkbox" checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5"/>
              Show on Website
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? "Saving..." : editing === null ? "Add Promotion" : "Save Changes"}
            </button>
            {editing !== null && <button disabled={busy} type="button"
              onClick={clearForm} className="rounded-lg border px-5 py-3 text-slate-700">
              Cancel Edit
            </button>}
          </div>
        </form>

        <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Your Promotions ({promotions.length})</h2>
          {promotions.length === 0 && <p className="text-sm text-slate-500">No promotion yet. Add one above; it will stay hidden until enabled.</p>}
          {promotions.map((promotion) => (
            <article key={promotion.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {promotion.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={promotion.image_url} alt="" className="h-16 w-20 rounded-lg object-cover"/>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{promotion.title_en}</p>
                  {promotion.title_mm && <p className="text-sm text-slate-600">{promotion.title_mm}</p>}
                  <p className="text-xs text-slate-500">
                    Order {promotion.sort_order} · {promotion.is_active ? "Visible on website" : "Hidden draft"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} type="button" onClick={() => edit(promotion)}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Edit</button>
                <button disabled={busy} type="button" onClick={() => void toggle(promotion)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${promotion.is_active ? "bg-slate-600" : "bg-green-700"}`}>
                  {promotion.is_active ? "Hide" : "Publish"}
                </button>
                <button disabled={busy} type="button" onClick={() => void remove(promotion)}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">Delete</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
