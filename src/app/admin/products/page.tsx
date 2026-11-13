
Pasted text.txt
Document
ရပါပြီဗျ 😁✅

ပို့ပေးထားတဲ့ page.tsx Code အပြည့်အစုံကို စစ်ပြီးပါပြီ။

လက်ရှိ Product Photo Upload အလုပ်လုပ်နေတဲ့ Code မှန်ပါတယ်။ အဲဒီ Function ကို မပျက်စေဘဲ ဆက်တည်ဆောက်သွားပါမယ်။

Step 86 — Code စစ်ဆေးပြီးပါပြီ
လက်ရှိ Code မှာ—

Admin Login စစ်ဆေးမှု ✅

Product အသစ်ထည့်ခြင်း ✅

Product Photo Upload ✅

Product List ပြသခြင်း ✅

Supabase Database ချိတ်ဆက်မှု ✅

တို့ ပါဝင်နေပါတယ်။

နောက်ထပ် Edit Product / Delete Product / Available–Unavailable Function သုံးခု ထည့်ဖို့ ကျန်ပါတယ်။

Step 87 — GitHub Edit Mode ဖွင့်မယ်
GitHub မှာ src/app/admin/products/page.tsx ကိုဖွင့်ပါ။

ညာဘက်အပေါ်က  Edit ကိုနှိပ်ပါ။

လက်ရှိ Code ကို မဖျက်သေးပါနဲ့။

Edit Mode ရောက်နေပြီဆိုရင် Ready လို့ ပြောပေးပါဗျ။

နောက်တစ်ဆင့်မှာ Product Edit / Delete / Availability ပါတဲ့ Code အသစ်ကို အပြည့်အစုံပေးပြီး တစ်ခါတည်း အစားထိုးကြမယ်။

rdy
အဆင်ပြေပြီဗျ 😁✅ Step 87 — Ready!

အခု UNITSHOP Admin Dashboard မှာ Product Management Function သုံးခုကို ထည့်ကြမယ်။

Edit — Product အမည်၊ ဈေးနှုန်း၊ Category၊ Description နဲ့ Photo ပြင်နိုင်မယ်။

Available / Unavailable — Product ရောင်းချနိုင်မှုကို ပြောင်းနိုင်မယ်။

Delete — အတည်ပြုပြီးမှ Product ဖျက်နိုင်မယ်။

လက်ရှိအလုပ်လုပ်နေတဲ့ Photo Upload, Admin Login နဲ့ Supabase Connection တွေကိုလည်း ဆက်ထိန်းထားပါမယ်။

GitHub Edit Mode မှာရှိနေတဲ့ Code အဟောင်းကို အစားထိုးဖို့ Code အသစ်ကို ပြင်ဆင်ပေးထားပါတယ်။

Step 88 — Code အသစ်ထည့်မယ်
အောက်က File မှာ အစားထိုးဖို့ page.tsx Code အပြည့်အစုံ ပါပါတယ်။

UNITSHOP Product Management Code

လုပ်ရမယ့်အဆင့်တွေက—

အပေါ်က File ကို Download လုပ်ပါ။

File ကို Notepad သို့မဟုတ် VS Code နဲ့ ဖွင့်ပါ။

Code အားလုံးကို Ctrl + A → Ctrl + C လုပ်ပါ။

GitHub ရဲ့ src/app/admin/products/page.tsx Edit Mode ထဲမှာ Code အဟောင်းအားလုံးကို အစားထိုး Paste လုပ်ပါ။

Commit changes ကိုနှိပ်ပါ။

Commit Message ကို Add product edit delete and availability controls လို့ရေးနိုင်ပါတယ်။

သတိပြုရန်: Delete က Database ထဲက Product Record ကို အပြီးဖျက်မှာပါ။ Photo File ကိုတော့ လောလောဆယ် Storage ထဲမှာ ထိန်းထားပါတယ်။ Availability Button က is_active ကို ပြောင်းမှာဖြစ်ပြီး Customer Website နဲ့ ချိတ်ဆက်ပြီးမှ Customer ဘက်မှာလည်း အကျိုးသက်ရောက်ပါမယ်။

Commit ပြီးရင် Done လို့ ပြောပေးပါဗျ။ နောက်တစ်ဆင့်မှာ Vercel Deployment ကိုစစ်ပြီး Edit / Availability / Delete ကို TEST Product တွေနဲ့ စမ်းကြမယ်။


unitshop-products-page.tsx
Code
    setPhoto(file);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || busyId !== null) return;
    setError("");
    setSuccess("");
    const parsedPrice = Number(price);
    if (!nameEn.trim() || !categoryId) {
      setError("Product name and category are required.");
      return;
    }
    if (!price.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (editingId === null && !photo) {
      setError("Please select a product photo.");
      return;
    }
    setSaving(true);
    let uploadedPath: string | null = null;
    let databaseSaved = false;
    try {
      let imageUrl: string | undefined;
      if (photo) {
        const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        const filePath = `products/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = filePath;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
      const values = {
        name_en: nameEn.trim(),
        name_mm: nameMm.trim(),
        price: parsedPrice,
        category_id: Number(categoryId),
        description_en: descriptionEn.trim(),
        description_mm: descriptionMm.trim(),
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };
      if (editingId !== null) {
        const { error: updateError } = await supabase.from("products").update(values).eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("products").insert({ ...values, is_active: true });
        if (insertError) throw insertError;
      }
      databaseSaved = true;
      const message = editingId !== null ? "Product updated successfully!" : "Product added successfully!";
      resetForm();
      setSuccess(message);
      try { await refreshProducts(); }
      catch { setError("Saved successfully, but list refresh failed. Please reload the page."); }
    } catch (err) {
      if (uploadedPath && !databaseSaved) {
        await supabase.storage.from("product-images").remove([uploadedPath]);
      }
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(product: Product) {
    if (saving || busyId !== null) return;
    setBusyId(product.id);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);
      if (updateError) throw updateError;
      setProducts((current) => current.map((item) =>
        item.id === product.id ? { ...item, is_active: !product.is_active } : item
      ));
      setSuccess("Availability updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(product: Product) {
    if (saving || busyId !== null) return;
    if (!window.confirm(`Permanently delete "${product.name_en}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    setError("");
    setSuccess("");
    try {
      const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
      if (deleteError) throw deleteError;
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (editingId === product.id) resetForm();
      setSuccess("Product deleted successfully!");
      // Keep the stored image for now to avoid deleting an image used elsewhere.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <main className="p-6">Checking admin access...</main>;
  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-blue-700">UNITSHOP Product Management</h1>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {success && <p className="rounded-lg bg-green-50 p-3 text-green-700">{success}</p>}
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId !== null ? "Edit Product" : "Add Product"}</h2>
            {editingId !== null && (
              <button type="button" onClick={resetForm} disabled={saving} className="rounded-lg border px-3 py-2 text-sm">Cancel Edit</button>
            )}
          </div>
          <input required placeholder="Product Name (English)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full rounded-lg border p-3" />
          <input placeholder="Product Name (Myanmar)" value={nameMm} onChange={(e) => setNameMm(e.target.value)} className="w-full rounded-lg border p-3" />
          <input required type="number" min="0" placeholder="Selling Price (Ks)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border p-3" />
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border p-3">
            <option value="">Select Category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name_en}</option>)}
          </select>
          <textarea placeholder="Description (English)" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} className="w-full rounded-lg border p-3" />
          <textarea placeholder="Description (Myanmar)" value={descriptionMm} onChange={(e) => setDescriptionMm(e.target.value)} className="w-full rounded-lg border p-3" />
          <div className="space-y-2">
            <label className="block text-sm font-medium">Product Photo {editingId !== null && "(optional — leave blank to keep existing photo)"}</label>
            <input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} required={editingId === null} className="w-full rounded-lg border p-3" />
            <p className="text-xs text-slate-500">JPG, PNG or WebP. Maximum 5 MB.</p>
            {photo && <p className="text-sm text-blue-700">Selected: {photo.name}</p>}
          </div>
          <button type="submit" disabled={saving || busyId !== null} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">
            {saving ? "Saving..." : editingId !== null ? "Save Changes" : "Add Product"}
          </button>
        </form>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Products ({products.length})</h2>
          {products.length === 0 ? <p className="text-slate-500">No products yet.</p> : (
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex flex-col gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.image_url ? <img src={product.image_url} alt={product.name_en} className="h-16 w-16 shrink-0 rounded-lg border object-cover" /> : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">No image</div>
                    )}
                    <div className="min-w-0">
                      <p className="break-words font-medium">{product.name_en}</p>
                      <p className="text-sm text-slate-500">{Number(product.price).toLocaleString()} Ks</p>
                      <p className={`text-sm ${product.is_active ? "text-green-700" : "text-amber-700"}`}>




