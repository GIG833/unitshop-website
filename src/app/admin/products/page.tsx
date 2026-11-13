D
ဟုတ်ပြီဗျ 😁✅ Commit လုပ်ပြီးပြီလို့ ယူဆပြီး ဆက်သွားမယ်နော်။

Step 58 — Vercel Deployment စစ်မယ်

Vercel Dashboard ကိုဖွင့်ပါ။

unitshop-website Project ကိုဝင်ပါ။

Deployments ကိုနှိပ်ပါ။

နောက်ဆုံး Deployment ရဲ့ Status ကိုကြည့်ပါ။

Ready ဖြစ်နေပြီလား၊ Building ဖြစ်နေသေးလားဗျ?

အဲ့ဒါလေးပြောပေးပါ။ ပြီးရင် Admin Login ကို ပြန်စမ်းကြမယ်ဗျ။

Ready
အဆင်ပြေပြီဗျ 😁✅ Vercel Deployment = Ready ဖြစ်ပြီဆိုတော့ Admin Login ကို ပြန်စမ်းကြည့်မယ်နော်။

Step 59 — Admin Login စမ်းမယ်
Chrome မှာ New Incognito Window ဖွင့်ပါ။

ဒီ Link ကိုဝင်ပါ။

https://unitshop-website.vercel.app/admin/login

Admin Email နဲ့ Password ထည့်ပြီး Sign In နှိပ်ပါ။

10 စက္ကန့်လောက် စောင့်ကြည့်ပါ။

ဘယ်လိုပေါ်လာလဲဗျ?

A — Admin Dashboard ပေါ်လာတယ်။

B — Checking admin access... မှာ ရပ်နေတယ်။

C — Login Page ကိုပဲ ပြန်ရောက်တယ်။

D — Error Message ပေါ်တယ်။

A / B / C / D တစ်ခုလေးပဲ ပြန်ပြောပေးပါဗျ။ အဲ့ဒီရလဒ်အတိုင်း နောက်တစ်ဆင့် ဆက်ပြင်ကြမယ်။

Dashboard ပေါ်ပါတယ်
အောင်မြင်ပြီဗျ! 🎉😁

UNITSHOP Admin Login အလုပ်လုပ်သွားပြီ။

Incognito မှာ Login ဝင်ပြီး Dashboard ပေါ်လာတယ်ဆိုတော့ အရင်ကဖြစ်နေတဲ့ Login ပြဿနာကို ဖြေရှင်းနိုင်ခဲ့ပါပြီ။

နောက်တစ်ဆင့် — Step 60
အခု Admin Dashboard ကနေ Product Management စလုပ်ကြမယ်ဗျ။

ဒါပေမဲ့ အရင်ဆုံး Security ကို တစ်ချက်စစ်ချင်ပါတယ်။

Dashboard ပေါ်နေတဲ့ Incognito Window မှာ Address Bar ကိုနှိပ်ပါ။

/admin/login နေရာကို ပြန်သွားပါ။

Login Form ပြန်ပေါ်လား၊ Dashboard ကို အလိုအလျောက် ပြန်ရောက်လား ကြည့်ပေးပါ။

ရလဒ်လေးပြောပေးပါဗျ။ ပြီးရင် Product Add / Edit / Delete လုပ်နိုင်တဲ့ Admin Dashboard ကို ဆက်တည်ဆောက်ကြမယ်။

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Category = { id: number; name_en: string };
type Product = {
  id: number;
  name_en: string;
  name_mm: string | null;
  price: number;
  category_id: number;
  description_en: string | null;
  description_mm: string | null;
  image_url: string | null;
  is_active: boolean;
};

const fields = "id,name_en,name_mm,price,category_id,description_en,description_mm,image_url,is_active";

export default function ProductsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
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
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.replace("/admin/login");
          return;
        }
        const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
        if (roleError || isAdmin !== true) {
          router.replace("/admin/login");
          return;
        }
        if (!active) return;
        setAuthorized(true);
        const [categoryResult, productResult] = await Promise.all([
          supabase.from("categories").select("id,name_en").order("name_en"),
          supabase.from("products").select(fields).order("created_at", { ascending: false }),
        ]);
        if (!active) return;
        if (categoryResult.error) throw categoryResult.error;
        if (productResult.error) throw productResult.error;
        setCategories(categoryResult.data || []);
        setProducts((productResult.data || []) as Product[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load product data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, [router]);

  async function refreshProducts() {
    const { data, error: refreshError } = await supabase
      .from("products")
      .select(fields)
      .order("created_at", { ascending: false });
    if (refreshError) throw refreshError;
    setProducts((data || []) as Product[]);
  }

  function resetForm() {
    setEditingId(null);
    setNameEn("");
    setNameMm("");
    setPrice("");
    setCategoryId("");
    setDescriptionEn("");
    setDescriptionMm("");
    setPhoto(null);
    setFileInputKey((key) => key + 1);
  }




