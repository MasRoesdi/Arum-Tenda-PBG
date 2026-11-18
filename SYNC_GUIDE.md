# Panduan Setup & Eksekusi Sinkronisasi Instagram (@arumtendapbg)

Dokumen ini menjelaskan tata cara penyiapan, konfigurasi, dan eksekusi fitur sinkronisasi otomatis etalase Instagram (Foto & Video Reels) untuk Arum Tenda Purbalingga.

---

## 1. Arsitektur & Cara Kerja Fitur

1. **Pengambilan Feed Meta Graph API:**
   Endpoint `/api/cron/sync-instagram` memanggil API resmi Meta Graph API (`https://graph.instagram.com/me/media`) untuk mengambil 25 postingan terbaru (foto, carousel, dan video Reels).
2. **Penyimpanan Media Permanen (Mencegah Expired CDN URL):**
   - **Foto & Thumbnail:** Diunduh, dioptimasi ke lebar maksimal `1200px`, dan dikonversi ke format `.webp` (`quality: 82`) menggunakan `sharp`, lalu disimpan ke Supabase Storage bucket `gallery` (`ig-{id}.webp`).
   - **Video Reels:** File `.mp4` asli diunduh (dengan batas ukuran maksimal 25MB agar aman dari limit memori serverless), lalu diunggah ke Supabase Storage bucket `gallery` (`ig-{id}.mp4`).
3. **Database Supabase (`public.gallery_items`):**
   Postingan disimpan atau diperbarui dengan kolom `media_type` (`IMAGE` atau `VIDEO`) serta `video_url` (URL publik permanen Supabase Storage).
4. **Tampilan UI Galeri (`/galeri`):**
   - Menampilkan badge **Reels** dengan ikon Play di pojok kanan atas kartu video.
   - Lightbox modal memutar video HTML5 secara langsung (`<video controls autoPlay playsInline poster={...}>`) dengan tag jenis tenda dan tombol langsung ke Instagram.

---

## 2. Setup Database Supabase

Jalankan script migrasi SQL berikut di **Supabase Dashboard > SQL Editor**:

File: `supabase/migrations/update_gallery_media.sql`

```sql
-- 1. Tambah kolom media_type dan video_url
ALTER TABLE public.gallery_items
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'IMAGE',
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Buat bucket storage 'gallery'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    true,
    26214400, -- 25 MB batas file
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Kebijakan RLS storage
DROP POLICY IF EXISTS "Public can view gallery media" ON storage.objects;
CREATE POLICY "Public can view gallery media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated admin can upload gallery media" ON storage.objects;
CREATE POLICY "Authenticated admin can upload gallery media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated admin can update gallery media" ON storage.objects;
CREATE POLICY "Authenticated admin can update gallery media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated admin can delete gallery media" ON storage.objects;
CREATE POLICY "Authenticated admin can delete gallery media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery');
```

---

## 3. Mendapatkan Instagram Access Token (Long-Lived 60 Hari)

Instagram Graph API memerlukan Access Token yang valid untuk membaca feed `@arumtendapbg`:

1. Buka [Meta for Developers](https://developers.facebook.com/) dan masuk dengan akun Facebook yang terhubung ke Instagram `@arumtendapbg`.
2. Buat Aplikasi baru (tipe: **Consumer** atau **Business**).
3. Tambahkan produk **Instagram Basic Display** atau **Instagram Graph API**.
4. Masuk ke **Instagram Basic Display > User Token Generator** dan tambahkan akun `@arumtendapbg` sebagai *Instagram Tester*.
5. Terima undangan tester di akun Instagram (@arumtendapbg) melalui: **Settings > Apps and Websites > Tester Invitations**.
6. Kembali ke Meta Developer Dashboard, klik **Generate Token** untuk mendapatkan Short-Lived Token.
7. Tukarkan Short-Lived Token menjadi **Long-Lived Token (berlaku 60 hari)** dengan memanggil URL ini di browser atau curl:

```bash
https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={YOUR_APP_SECRET}&access_token={SHORT_LIVED_TOKEN}
```

Salin nilai `access_token` yang dihasilkan ke dalam file `.env.local` sebagai `INSTAGRAM_ACCESS_TOKEN`.

> **Tips Refresh Token:** Sebelum 60 hari kedaluwarsa, token dapat diperpanjang secara otomatis selama 60 hari lagi dengan memanggil:
> `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={CURRENT_LONG_LIVED_TOKEN}`

---

## 4. Konfigurasi Environment Variables

Pastikan variabel berikut ada di file `.env.local` (dan di **Vercel Project Settings > Environment Variables**):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...

# Pengaman Cron Endpoint
CRON_SECRET=masroesdi

# Token Instagram Graph API (Long-Lived)
INSTAGRAM_ACCESS_TOKEN=IGQ...
```

---

## 5. Cara Menjalankan & Menguji Sinkronisasi

### A. Uji Coba Manual via Browser / URL Query
Buka URL berikut di browser Anda:
```
http://localhost:3000/api/cron/sync-instagram?secret=masroesdi
```

### B. Uji Coba Manual via Terminal (cURL / PowerShell)

**Menggunakan cURL:**
```bash
curl -X POST \
  -H "Authorization: Bearer masroesdi" \
  http://localhost:3000/api/cron/sync-instagram
```

**Menggunakan PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/cron/sync-instagram?secret=masroesdi" -Method GET
```

### Contoh Respons Berhasil (HTTP 200):
```json
{
  "success": true,
  "message": "Berhasil menyinkronkan 15 item dari Instagram (3 baru, 12 diperbarui).",
  "count": 15,
  "newItems": 3,
  "updatedItems": 12
}
```

Setelah sinkronisasi berhasil, cache halaman `/galeri` dan `/` otomatis diperbarui (*on-demand revalidation*).

---

## 6. Jadwal Otomatisasi di Vercel Cron

Konfigurasi telah aktif di file `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-instagram",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- **Jadwal:** Dijalankan setiap hari pukul **00:00 UTC (07:00 WIB)**.
- **Autentikasi Otomatis:** Vercel Cron secara otomatis menyertakan header `Authorization: Bearer <CRON_SECRET>` saat memanggil endpoint.
- **Monitoring:** Riwayat eksekusi dapat dipantau langsung di tab **Vercel Dashboard > Project > Settings > Cron Jobs**.
