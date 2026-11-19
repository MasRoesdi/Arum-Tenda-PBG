# Fitur proposal yang belum terpenuhi

Diperiksa terhadap proposal IUM revisi (*Peningkatan Jangkauan Pasar Arum Tenda Purbalingga*), bagian solusi tiga pilar dan tahap Design/Develop. Yang sudah ada di sistem tidak dicantumkan di sini.

## Reservasi WhatsApp - IMPORTANCE : LOW (ABAIKAN BAGIAN INI)

Kontak, katalog, dan beranda hanya membuka `wa.me` dengan nomor contoh `6281234567890` dan teks umum. Detail produk merangkum nama barang, spesifikasi, warna, jumlah, dan estimasi, tetapi bukan data survei.

- [ ] Formulir booking jadwal survei lokasi dan konsultasi
- [ ] Isian: nama pemesan, tanggal acara, model tenda, lokasi hajatan, dan preferensi warna dari simulasi
- [ ] Draf pesan WhatsApp terstruktur yang menggabungkan isian itu dan terbuka ke nomor pengelola yang sebenarnya
- [ ] Ganti nomor contoh `6281234567890` di seluruh situs (beranda, katalog, kontak, header, JSON-LD)
- [ ] Integrasi formulir ke WhatsApp Gateway API, sesuai tahap Develop proposal (saat ini hanya tautan `wa.me`)

## Katalog dan harga resmi mitra - IMPORTANCE : MEDIUM (ABAIKAN BAGIAN INI)

Pricelist memakai harga seed/contoh (misalnya Tenda Roder Rp 85.000/m²) plus baris tambahan yang dikode di klien. Foto produk tenda masih Unsplash. Galeri barang inventaris sudah ada, tetapi tidak membawa harga.

- [ ] Paket dan spesifikasi resmi: tenda plafon serut VIP, tenda transparan fairy light, tenda blukat renda brokat Jawa, tenda sarnafil piramida
- [ ] Harga transparan untuk perlengkapan yang disebut proposal: kursi futura cover pita, meja prasmanan, panggung pelaminan, blower misting
- [ ] Ganti foto produk contoh Unsplash dengan dokumentasi milik mitra
- [ ] Hapus editor katalog `localStorage` di halaman publik supaya harga yang tampil tidak menyimpang dari data admin