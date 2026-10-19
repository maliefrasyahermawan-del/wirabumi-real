# Analisis APK Wirabumi

## Artefak yang dianalisis

- Berkas: `D:\Portofolio Alif 2\Project 77 - Logicodix Hackaton\Benchmark\wirabumi_mobile.apk`
- Ukuran: 34.074.194 byte
- SHA-256: `5b37eefa5354cec4f903b4b136aea6ef1abf916d92da69285eb09677e8acfd54`
- Metode: inspeksi statis lokal menggunakan REA 6.7.0 dan inventaris ZIP. APK tidak dijalankan, tidak dipasang, dan tidak diubah.

## Kesimpulan utama

Ini adalah aplikasi Android **Flutter release** sungguhan, bukan web yang dibungkus. APK hanya membawa ABI `arm64-v8a`, dengan `libapp.so` berisi Dart AOT terkompilasi dan `libflutter.so` sebagai engine. Karena kode Dart telah dikompilasi AOT, APK dapat dipetakan fungsi dan struktur layarnya, tetapi tidak dapat dikembalikan menjadi source Flutter asli yang siap dibangun ulang secara byte-identik.

REA mengonfirmasi Flutter, manifest APK tunggal, dan `libapp.so` sebesar 8.455.056 byte. Snapshot hash Flutter yang teramati adalah `ace654289f5abc240509fc941453ebc5`.

## Peta layar yang teramati

| Area | Layar atau komponen yang teramati | Fungsi |
| --- | --- | --- |
| Masuk | Splash, onboarding, login, daftar, lupa kata sandi | Akses akun dan pengenalan aplikasi |
| Beranda | `BerandaScreen`, dashboard provider | Ringkasan kondisi usaha |
| Pembukuan | Pembukuan, entri manual, foto OCR, tempel chat | Pencatatan transaksi cepat |
| Laporan | Pengeluaran, laba-rugi, pembuat PDF | Rekap keuangan dan ekspor PDF |
| Kelayakan KUR | Gauge skor, kartu faktor, narasi skor, PDF KUR | Skor 0–100 dan kesiapan pembiayaan |
| Asisten | Chatbot, konteks chat, pembuat jawaban AI | Tanya-jawab keuangan usaha |
| Profil | Profil usaha, avatar | Pengaturan identitas usaha |
| Pendukung | Notifikasi, lencana, quest, ulasan, cara kerja, tentang | Retensi dan bantuan pengguna |
| Dinkop | `DinkopScreen` | Integrasi atau informasi layanan koperasi/UMKM |

## Fungsi yang benar-benar ada dalam APK

1. **Pencatatan transaksi dan pengeluaran.** Artefak memuat model `Transaction` dan `Expense`, repository lokal, provider daftar transaksi/pengeluaran, serta entri manual.
2. **Scan struk dengan OCR.** Ada `foto_ocr_screen`, `ocr_service`, parser struk, izin kamera, `image_picker`, dan model ML Kit OCR di dalam APK. Teks yang tertanam menyebut hasil OCR mentah, tingkat keyakinan, dan kemungkinan unduhan model OCR melalui Google Play Services.
3. **Input transaksi lewat bahasa percakapan.** Ada `tempel_chat_screen`, `chat_parser`, dan `ai_chat_parser`, sehingga pengguna dapat menempel kalimat lalu aplikasi mencoba mengubahnya menjadi transaksi.
4. **Laporan laba rugi dan PDF.** `laba_rugi_provider` dan `laba_rugi_pdf_builder` menunjukkan perhitungan serta ekspor laporan laba-rugi; teks aplikasi menyebut struktur SAK EMKM.
5. **Skor kelayakan KUR.** `scoring_service`, `score_gauge`, dan `kur_pdf_builder` menunjukkan skor dan laporan kesiapan KUR. Copy yang ditemukan menyatakan empat faktor: konsistensi, volume, pelanggan tetap, dan legalitas.
6. **Asisten AI.** Ada client Groq dan endpoint `https://api.groq.com/openai/v1`, pembuat narasi skor, serta chatbot. Endpoint ini adalah bukti integrasi AI, bukan bukti bahwa layanan atau kuncinya saat ini aktif.
7. **Penyimpanan lokal.** Artefak memuat Sqflite, Shared Preferences, secure token storage, dan repository lokal untuk akun, chat, transaksi, serta pengeluaran.
8. **Data demo.** Ada `demo_data_seeder` dan teks akun contoh **Batik Kliwon Jaya** yang menyiapkan transaksi serta pengeluaran untuk mencoba fitur.

## Arsitektur yang teramati

- Flutter + Dart AOT, Material UI, GoRouter, dan Riverpod.
- SQLite/Sqflite untuk data aplikasi lokal.
- ML Kit Google OCR, kamera, dan pemilih gambar.
- Dio/HTTP serta Groq-compatible AI endpoint.
- Pembuatan PDF dan URL launcher.
- `arm64-v8a` saja; APK ini tidak membawa binary x86/x86_64 untuk emulator Intel secara langsung.

## Implikasi untuk BUMIRA

APK ini adalah referensi yang kuat untuk pengalaman Android BUMIRA: pola mobile-first, bottom navigation, catat transaksi melalui tiga jalur (manual, scan struk, teks chat), laporan, dan skor kesiapan usaha. Yang boleh dibangun ulang adalah **fungsi dan pengalaman produk** berdasarkan temuan ini; jangan menyalin asset, kode, atau identitas Wirabumi secara mentah.

Prioritas rebuild BUMIRA yang disarankan:

1. Beranda ringkas dan input transaksi satu tangan.
2. Catat transaksi manual lalu scan struk.
3. Ringkasan laba-rugi dan insight.
4. Skor kesiapan usaha BUMIRA dan rencana aksi.
5. Mira sebagai asisten keuangan, setelah arus data dasarnya stabil.

## Batas analisis

- Manifest terdekompilasi dan class/method Java belum diambil karena komputer ini belum memiliki full JDK dan `jadx-headless-mcp`, yang dibutuhkan REA untuk modul Android.
- REA tidak menjalankan APK. Alur interaksi visual, API live, hasil OCR pada perangkat, dan login aktif perlu diuji melalui perangkat/emulator Android bila ingin divalidasi.
- String dan path sumber yang muncul di `libapp.so` adalah bukti struktur/fungsi, namun bukan source Dart yang dapat dikompilasi ulang.
