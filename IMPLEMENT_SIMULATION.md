# Task: Upgrade Silk Fabric Studio (`/simulasi`) ke Multi-Layer Photo Tent Visualizer

Ubah implementasi simulator di rute `/simulasi` (yang sebelumnya hanya menumpuk blok CSS di atas foto Unsplash) menjadi **Interactive Multi-Layer Tent Visualizer** berbasis HTML5 Canvas dengan konfigurasi layer komponen tenda statis dan kontrol pencahayaan Siang/Malam.

---

## 1. Spesifikasi Fitur & Arsitektur

### A. Multi-Layer Photo Canvas Engine (Tanpa AI & Tanpa Backend)
- **Tipe Tenda:** Dukung pemilihan model tenda (**Kerut / Serut VIP**, **Transparan**, **Blukat**, **Piramid**). Setiap tipe tenda merujuk pada foto dasar resolusi tinggi dan konfigurasi layer poligonnya masing-masing.
- **Preconfigured Layers:** File konfigurasi statis `src/config/tentTemplates.ts` yang memetakan area komponen tenda menggunakan **koordinat poligon relatif (`0.0` - `1.0`)** dan nilai `feather` (blur tepi dalam `px`), seperti:
  1. `plafon` (Kain Plafon Serut / Utama — *Warna Primer*)
  2. `aksen_rumbai` (Layer Rumbai Kedua / Balutan Pilar — *Warna Sekunder*)
  3. `tirai_dinding` (Tirai Dinding Samping & Belakang)
  4. `sarung_kursi` (Sarung & Pita Kursi)
- **Kunci Interaksi User:** Pengguna **tidak boleh** mengedit titik koordinat, kuas, atau poligon. Pengguna hanya berinteraksi dengan pemilihan tipe tenda, preset warna, color picker/slider per komponen, toggle layer, dan mode pencahayaan.

### B. Algoritma Pewarnaan Realistik (HSL Luminance Preservation)
Jangan menimpa foto dengan warna solid. Buat utility `src/utils/colorMath.ts` untuk memproses piksel `ImageData` menggunakan konversi **RGB $\rightarrow$ HSL $\rightarrow$ RGB**:
1. Hitung *Perceived Luminance* dari foto asli: `origLum = (0.299 * R + 0.587 * G + 0.114 * B) / 255`.
2. Sesuaikan luminance agar lipatan kain putih/terang tetap bertekstur alami saat diberi warna pekat: `adjustedLum = Math.min(1, origLum * (0.45 + targetL * 0.85))`.
3. Gabungkan `Hue` dari warna target pengguna dan `Saturation` dari tingkat kepekatan ke `adjustedLum`, lalu konversi kembali ke RGB.
4. Terapkan *alpha blending* berdasarkan mask offscreen canvas yang sudah dihaluskan tepinya (`ctx.filter = blur(${feather}px)`).

### C. Kombinasi Warna Siap Pakai (Preset 2-Warna) + Custom
Sediakan tombol *Quick Preset* kombinasi 2 warna yang langsung menerapkan warna Primer (Plafon/Tirai) dan warna Sekunder (Rumbai/Pilar/Pita) secara bersamaan, sekaligus tetap menyediakan *custom color picker* dan slider intensitas (`10% - 100%`) untuk tiap layer:
- **Maroon-Gold:** Primer `#800020` (Maroon) + Sekunder `#D4AF37` (Gold)
- **Mocca-Cream:** Primer `#836953` (Mocca) + Sekunder `#FFFDD0` (Cream)
- **Navy-Silver:** Primer `#1E3A8A` (Navy) + Sekunder `#C0C0C0` (Silver)
- **Rose-Gold:** Primer `#B76E79` (Rose) + Sekunder `#E5C158` (Warm Gold)
- **Emerald-Gold:** Primer `#046307` (Emerald) + Sekunder `#D4AF37` (Gold)

### D. Mode Pencahayaan Siang & Malam (Lampu Kristal & Fairy Lights)
Tambahkan toggle mode **Siang (Daylight)** vs **Malam (Evening/Warm Glow)**:
- **Mode Siang:** Render foto dan warna kain dalam kecerahan natural normal.
- **Mode Malam:** Gelapkan atmosfer keseluruhan kanvas secara halus (menggunakan layer *multiply/brightness* pada gambar dasar) dan aktifkan **layer pendar cahaya (radial gradient `screen` / `lighter` blend mode)** pada titik-titik koordinat lampu kristal gantung (*chandelier*) dan untaian *fairy lights* yang sudah didefinisikan di konfigurasi template, sehingga lampu terlihat menyala hangat di atas kain berwarna.

---

## 2. Struktur File & Implementasi Next.js (App Router + TypeScript + Tailwind)

1. **`src/types/simulator.ts`**
   - Interface `TentTypeId` (`'kerut-vip' | 'transparan' | 'blukat' | 'piramid'`).
   - Interface `LayerPolygonConfig` (id, name, role: `'primary' | 'secondary' | 'accent'`, polygons, feather, defaultColor, defaultIntensity, defaultEnabled).
   - Interface `LightPointConfig` (x, y, radius, type: `'chandelier' | 'fairylight'`, color).
   - Interface `TentTemplateConfig` (id, name, description, imageUrl, layers, lightPoints).

2. **`src/config/tentTemplates.ts`**
   - Definisikan konfigurasi lengkap untuk keempat tipe tenda beserta koordinat poligon relatifnya dan titik lampu kristal/fairy lights. Pastikan path gambar mengarah ke `/images/tents/...` di folder `public/`.
   - Definisikan konstanta `COLOR_PRESETS` (Maroon-Gold, Mocca-Cream, Navy-Silver, Rose-Gold, Emerald-Gold).

3. **`src/utils/colorMath.ts`**
   - Pure functions untuk `hexToHsl`, `hslToRgb`, dan rendering komposisi canvas.

4. **`src/components/simulator/TentCanvasPreview.tsx`**
   - Komponen `"use client"` yang mengelola `<canvas>` utama dan offscreen mask canvas.
   - Cache offscreen mask setiap kali template tenda berubah agar perubahan warna/slider berjalan mulus 60fps.
   - Tambahkan fitur tombol tahan **"Lihat Foto Asli (Before/After)"**, tombol **"Reset Warna"**, dan tombol **"Unduh Hasil Desain (.PNG)"**.

5. **`src/app/simulasi/page.tsx`**
   - Gabungkan seluruh komponen dengan tata letak responsif modern (Preview Canvas sticky di kiri/atas, Panel Konfigurator Tipe Tenda + Preset Warna + Pencahayaan Siang/Malam + Kontrol Layer Individual di kanan/bawah).

---

## 3. Catatan Performa & Keamanan Canvas
- Gunakan `crossOrigin="anonymous"` saat memuat objek `new Image()` agar fungsi `canvas.toDataURL()` untuk mengunduh gambar tidak terkena *Tainted Canvas SecurityError*.
- Pastikan ukuran kanvas responsif mengikuti container menggunakan CSS (`w-full h-auto`), sementara resolusi internal `canvas.width` dan `canvas.height` mengikuti dimensi asli foto (atau maksimal lebar `1200px` untuk menjaga kecepatan pemrosesan piksel di perangkat mobile).