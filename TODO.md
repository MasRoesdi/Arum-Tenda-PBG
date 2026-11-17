# Fitur proposal yang belum terpenuhi

Diperiksa terhadap proposal IUM revisi (*Peningkatan Jangkauan Pasar Arum Tenda Purbalingga*), bagian solusi tiga pilar dan tahap Design/Develop. Yang sudah ada di sistem tidak dicantumkan di sini.

## Simulasi Tenda (`/simulasi`) - IMPORTANCE : HIGH

Mengganti blok CSS pratinjau menjadi **Interactive Multi-Layer Tent Photo Visualizer** berbasis HTML5 Canvas (HSL Luminance Preservation) dengan preconfigured layer komponen tenda.

- [ ] **Multi-Layer Canvas Visualizer:** Ganti pratinjau blok CSS dengan engine HTML5 Canvas menggunakan koordinat poligon relatif terkonfigurasi (`config/tentTemplates.ts`) untuk tiap komponen tenda (Plafon Serut, Rumbai/Pilar, Tirai Dinding, Sarung Kursi) sesuai tipe tenda yang dipilih (Kerut/Serut VIP, Transparan, Blukat, Piramid).
- [ ] **Pewarnaan Realistik (HSL Luminance) & Kombinasi Warna Siap Pakai:** Implementasikan perubahan warna berbasis Hue yang mempertahankan lipatan & bayangan kain asli, lengkap dengan *preset* kombinasi 2 warna siap pakai: **Maroon-Gold**, **Mocca-Cream**, **Navy-Silver**, **Rose-Gold**, **Emerald-Gold**, serta *custom color picker* per komponen.
- [ ] **Mode Pencahayaan Siang & Malam (Lampu Kristal & Fairy Lights):** Tambahkan toggle suasana **Siang** (cahaya natural cerah) dan **Malam** (atmosfer redup dengan efek pendar cahaya hangat pada lampu kristal gantung & *fairy lights*).

## Reservasi WhatsApp - IMPORTANCE : LOW

Kontak, katalog, dan beranda hanya membuka `wa.me` dengan nomor contoh `6281234567890` dan teks umum. Detail produk merangkum nama barang, spesifikasi, warna, jumlah, dan estimasi, tetapi bukan data survei.

- [ ] Formulir booking jadwal survei lokasi dan konsultasi
- [ ] Isian: nama pemesan, tanggal acara, model tenda, lokasi hajatan, dan preferensi warna dari simulasi
- [ ] Draf pesan WhatsApp terstruktur yang menggabungkan isian itu dan terbuka ke nomor pengelola yang sebenarnya
- [ ] Ganti nomor contoh `6281234567890` di seluruh situs (beranda, katalog, kontak, header, JSON-LD)
- [ ] Integrasi formulir ke WhatsApp Gateway API, sesuai tahap Develop proposal (saat ini hanya tautan `wa.me`)

## Etalase Instagram (`/galeri` & `app/api/cron/sync-instagram`) - IMPORTANCE : HIGH

Menampilkan dokumentasi foto dan video Reels dari `@arumtendapbg` secara otomatis dengan penyimpanan permanen di Supabase Storage agar link CDN Instagram tidak kedaluwarsa.

- [ ] **Skema Database & Penyimpanan Permanen (`sharp` + Supabase Storage):** Perbarui tabel `gallery_items` untuk menyimpan `media_type` (`IMAGE` | `VIDEO`) dan `video_url`. Pada `app/api/cron/sync-instagram/route.ts`, konversi thumbnail/foto ke format `.webp` (via `sharp`) dan simpan file `.mp4` video Reels ke Supabase Storage (`bucket: gallery`) agar tidak terkena *expired CDN URL*.
- [ ] **Pemutar Video Reels di Galeri (`/galeri`):** Perbarui komponen kartu galeri dan lightbox modal agar mendukung pemutaran video Reels (`<video controls playsInline preload="metadata" poster={image_url}>` atau embed modal) lengkap dengan badge indikator ikon Play untuk item bertipe `VIDEO`.
- [ ] **Jadwal Sinkronisasi Otomatis & Environment Setup:** Tambahkan konfigurasi `vercel.json` cron (`0 0 * * *` ke `/api/cron/sync-instagram`) serta dokumentasi setup `INSTAGRAM_ACCESS_TOKEN` (Long-Lived Token 60 hari) dan `CRON_SECRET`.

## Katalog dan harga resmi mitra - IMPORTANCE : MEDIUM

Pricelist memakai harga seed/contoh (misalnya Tenda Roder Rp 85.000/m²) plus baris tambahan yang dikode di klien. Foto produk tenda masih Unsplash. Galeri barang inventaris sudah ada, tetapi tidak membawa harga.

- [ ] Paket dan spesifikasi resmi: tenda plafon serut VIP, tenda transparan fairy light, tenda blukat renda brokat Jawa, tenda sarnafil piramida
- [ ] Harga transparan untuk perlengkapan yang disebut proposal: kursi futura cover pita, meja prasmanan, panggung pelaminan, blower misting
- [ ] Ganti foto produk contoh Unsplash dengan dokumentasi milik mitra
- [ ] Hapus editor katalog `localStorage` di halaman publik supaya harga yang tampil tidak menyimpang dari data admin