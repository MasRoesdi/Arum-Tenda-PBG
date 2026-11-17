# Token Efficiency & Concise Execution Protocol

Patuhi aturan efisiensi token berikut pada setiap respons, pembacaan file, dan modifikasi kode:

## 1. Output & Komunikasi (Hemat Output Token)
- **Zero Fluff:** Langsung eksekusi atau berikan jawaban inti. Dilarang menulis kalimat pembuka/penutup basa-basi (seperti *"Tentu, saya akan membantu..."*, *"Berikut adalah kode yang diminta..."*, atau *"Semoga membantu"*).
- **Minimal Explanation:** Hanya jelaskan *mengapa* suatu perubahan dilakukan jika ada keputusan arsitektural penting atau potensi *breaking change*. Jangan menjelaskan cara kerja kode standar yang sudah jelas terbaca.
- **Structured Bullet Points:** Gunakan poin-poin singkat maksimal 1–2 baris per poin untuk ringkasan perubahan.

## 2. Strategi Modifikasi Kode (Diff & Targeted Edits)
- **Gunakan Diff / Search-Replace:** Jangan pernah mencetak ulang seluruh isi file jika perubahan hanya terjadi pada sebagian baris. Gunakan tool edit berbasis baris/blok (`edit_file` / `replace_content`) atau tampilkan hanya blok fungsi yang berubah dengan penanda konteks `// ... existing code ...`.
- **Satu File, Satu Tujuan:** Hindari membuat file abstraksi/wrapper yang tidak perlu jika logika hanya dipakai di satu tempat.
- **Hapus Kode Mati (Dead Code):** Saat merefaktor, langsung hapus import yang tidak terpakai, komentar bawaan template, dan fungsi usang agar tidak ikut terbaca di konteks berikutnya.

## 3. Manajemen Konteks & File Reading (Hemat Input Token)
- **Baca File Secara Selektif:** Gunakan `grep` / `codebase_search` untuk menemukan baris spesifik sebelum membuka file. Jika file berukuran >300 baris, baca hanya rentang baris (`start_line` - `end_line`) yang relevan.
- **Abaikan File Generasi & Aset:** Jangan pernah membaca isi `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, folder `.next/`, `dist/`, `node_modules/`, atau string Base64/SVG mentah yang panjang.
- **Batasi Output Terminal:** Saat menjalankan perintah test atau build, gunakan flag quiet/minimal (misal: `npm test -- --silent` atau `tail -n 30`) agar log panjang tidak memenuhi jendela konteks.

## 4. Eksekusi Bertahap (Prevent Retry Loops)
- **Verifikasi Tipe & Linter Sekaligus:** Jalankan `tsc --noEmit` atau linter setelah menyelesaikan satu kelompok fitur, bukan setiap kali mengedit satu baris kecil.
- **Jangan Menebak API/Path:** Cek struktur folder (`list_dir`) atau definisi tipe terlebih dahulu sebelum menulis import agar tidak membuang token untuk memperbaiki error `Module not found`.