# Task: Upgrade Etalase Instagram (`app/api/cron/sync-instagram` & `/galeri`)

Perbarui fitur sinkronisasi Instagram dan halaman `/galeri` agar:
1. Mendukung penyimpanan dan pemutaran video **Instagram Reels** (bukan sekadar thumbnail statis).
2. Mengunduh thumbnail/foto lalu mengonversinya menjadi `.webp` (menggunakan `sharp`) serta menyimpan video `.mp4` ke **Supabase Storage** agar URL media permanen (tidak rusak saat CDN Instagram kedaluwarsa).
3. Memiliki konfigurasi jadwal otomatis (**Vercel Cron**) untuk rute `/api/cron/sync-instagram`.

---

## 1. Perubahan Database (Supabase SQL Migration)

Buatkan file migrasi SQL (`supabase/migrations/update_gallery_media.sql`) untuk menambahkan kolom tipe media dan URL video pada tabel `gallery_items`:

    ALTER TABLE public.gallery_items
    ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'IMAGE',
    ADD COLUMN IF NOT EXISTS video_url TEXT;

---

## 2. Pembaruan Route Handler (`src/app/api/cron/sync-instagram/route.ts`)

Perbarui logika di dalam `handleSync` pada `route.ts` yang sudah ada:
- **Install Dependency:** Pastikan `sharp` terpasang di `package.json` (`npm install sharp`).
- **Fungsi Helper Storage (`persistMediaToStorage`):**
  1. **Untuk Gambar / Thumbnail (`imageUrl`):** Unduh buffer dari `media_url` (atau `thumbnail_url` jika `VIDEO`), ubah ukurannya maksimal lebar `1200px`, konversi ke format `.webp` (`quality: 82`) menggunakan `sharp`, lalu unggah ke Supabase Storage bucket `gallery` dengan nama `ig-${item.id}.webp` (`upsert: true`). Ambil `publicUrl`-nya.
  2. **Untuk Video Reels (`item.media_type === 'VIDEO'`):** Jika `item.media_url` tersedia, unduh buffer video `.mp4` dari `item.media_url` dan unggah ke bucket `gallery` dengan nama `ig-${item.id}.mp4` (`contentType: 'video/mp4'`, `upsert: true`). Ambil `publicUrl`-nya sebagai `videoUrl`. *(Beri pengecekan ukuran maksimal 25MB agar aman di batas memori serverless).*
- **Simpan ke Database (`gallery_items`):**
  - Simpan `media_type: item.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE'`, `image_url: permanentWebpUrl`, dan `video_url: permanentVideoUrl` pada operasi `insert` maupun `update`.

---

## 3. Pembaruan UI Galeri & Pemutar Video Reels (`/galeri`)

Perbarui komponen galeri (dan komponen showcase Instagram di halaman utama jika ada) agar menampilkan foto dan video secara interaktif:
- **Kartu Item Galeri:**
  - Tetap gunakan `image_url` (`.webp`) sebagai gambar utama kartu agar loading halaman tetap cepat.
  - Jika `item.media_type === 'VIDEO'`, tampilkan badge/ikon **Play Reels** di pojok atau tengah kartu sebagai penanda visual bahwa item tersebut adalah video.
- **Modal / Lightbox Pemutar Media:**
  - Saat pengguna mengeklik kartu galeri, buka modal detail/lightbox.
  - Jika `media_type === 'VIDEO'` dan `video_url` ada: render elemen HTML5 `<video src={item.video_url} poster={item.image_url} controls autoPlay playsInline className="max-h-[80vh] w-auto rounded-lg" />`.
  - Jika `media_type === 'IMAGE'`: tampilkan foto resolusi penuh.
  - Sertakan judul/caption, badge tipe tenda (`tent_type`), serta tautan opsional *"Lihat di Instagram"* (`instagram_url`).

---

## 4. Konfigurasi Jadwal Cron Otomatis (`vercel.json`)

Buat atau perbarui file `vercel.json` di root proyek agar endpoint `/api/cron/sync-instagram` dieksekusi otomatis setiap hari pada pukul 00:00 UTC (07:00 WIB):

    {
      "crons": [
        {
          "path": "/api/cron/sync-instagram",
          "schedule": "0 0 * * *"
        }
      ]
    }

Pastikan juga `next.config.ts` / `next.config.mjs` mengizinkan domain hostname Supabase Storage (`*.supabase.co`) dan CDN Instagram (`*.cdninstagram.com`) di dalam `images.remotePatterns`.