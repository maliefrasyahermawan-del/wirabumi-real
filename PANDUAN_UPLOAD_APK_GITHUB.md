# Panduan Upload APK BUMIRA ke GitHub Release

GitHub Release dipakai untuk membagikan APK tanpa membebani tautan file lokal. Setiap aset release memiliki URL unduhan sendiri dan tetap mengikuti akses repository: bila repository private, hanya akun GitHub yang diberi akses yang dapat mengunduhnya.

## 1. Bangun APK release

Dari folder `bumira_mobile`, jalankan:

```powershell
flutter build apk --release --target-platform android-arm64
```

Hasilnya ada di:

```text
build\app\outputs\flutter-apk\app-release.apk
```

Target `android-arm64` cocok untuk mayoritas ponsel Android modern dan menghasilkan APK yang lebih kecil. Untuk APK yang mencakup beberapa arsitektur, gunakan `flutter build apk --release` tanpa parameter target.

## 2. Unggah ke GitHub Release

Pastikan GitHub CLI sudah login dengan `gh auth login`, lalu dari folder proyek jalankan:

```powershell
gh release create v0.1.0-alpha `
  "bumira_mobile\build\app\outputs\flutter-apk\app-release.apk#BUMIRA-v0.1.0-arm64-release.apk" `
  --repo maliefrasyahermawan-del/Logicodix_Econ `
  --target master `
  --title "BUMIRA v0.1.0 Alpha" `
  --notes "APK Android BUMIRA untuk pengujian UI/UX." `
  --prerelease
```

Ganti tag `v0.1.0-alpha` untuk setiap versi baru, misalnya `v0.1.1-alpha`. GitHub akan membuat halaman release dan tautan unduhan aset otomatis.

## 3. Ambil tautan unduhan langsung

```powershell
gh release view v0.1.0-alpha --repo maliefrasyahermawan-del/Logicodix_Econ --json url,assets
```

Bagikan URL aset APK yang tampil. Penerima harus masuk ke akun GitHub yang memiliki akses ke repository private `Logicodix_Econ`.

