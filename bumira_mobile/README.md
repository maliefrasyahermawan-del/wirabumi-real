# BUMIRA Mobile

Aplikasi Flutter Android untuk BUMIRA: **Bangun Usaha Mikro dengan Insight, Rencana, dan Arah**.

## Menjalankan

1. Instal Flutter SDK stable dan Android Studio (atau Android SDK command-line tools).
2. Dari folder ini jalankan:

```powershell
flutter pub get
flutter run
```

Untuk membuat APK release:

```powershell
flutter build apk --release
```

Untuk APK ringan yang cocok dengan mayoritas HP Android modern (arm64):

```powershell
flutter build apk --release --target-platform android-arm64
```

Panduan membagikan APK melalui GitHub Release ada di [PANDUAN_UPLOAD_APK_GITHUB.md](../PANDUAN_UPLOAD_APK_GITHUB.md).

Saat pertama kali membuka proyek pada mesin baru, jalankan `flutter create .` untuk membuat folder Android standar Flutter. Perintah itu mempertahankan `lib/main.dart` dan `pubspec.yaml` di proyek ini.

## Lingkup versi awal

- UI Android mobile-first: bottom navigation, tombol tambah transaksi, kartu ringkasan, insight, dan Mira.
- Data transaksi sementara berada di memori aplikasi agar prototipe dapat dicoba tanpa server.
- Integrasi API BUMIRA, OCR kamera, autentikasi, dan database lokal adalah tahap berikutnya. Arsitektur UI tidak bergantung pada UI React lama.
- Tema BUMIRA memakai kuning cerah `#FFD51E` sebagai CTA, putih sebagai background utama, cream `#FFF1CF` untuk informasi pendukung, dan teks arang `#252525` untuk kontras yang nyaman.
