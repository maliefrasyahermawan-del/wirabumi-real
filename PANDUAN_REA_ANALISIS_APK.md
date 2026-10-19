# Panduan REA untuk analisis APK Android

Panduan ini memakai [REA](https://github.com/morluto/rea), alat CLI/MCP untuk reverse engineering lokal. Gunakan hanya pada APK yang kamu miliki atau berwenang untuk analisis.

## Prasyarat

- Node.js 22.19+, 24.11+, atau 26+ dan npm.
- Untuk inventaris APK dan identifikasi Flutter: tidak perlu Android Studio atau emulator.
- Untuk manifest Android dan dekompilasi class: full JDK 17+ serta `jadx-headless-mcp`.

Periksa Node:

```powershell
node --version
npm --version
```

Jalankan REA tanpa instalasi global:

```powershell
npm exec --yes --package=rea-agents@latest -- rea --version
npm exec --yes --package=rea-agents@latest -- rea --help
```

Untuk memakainya rutin, instal global:

```powershell
npm install --global rea-agents
rea --help
```

## Analisis aman tanpa menjalankan APK

Gunakan path absolut pada Windows:

```powershell
$apk = 'D:\folder\aplikasi.apk'

# Validasi/inventaris artefak
rea inspect-artifact $apk --format json

# Deteksi Flutter, ABI, hash snapshot, engine
rea identify-flutter-build $apk --format json

# Baca string-pool Dart AOT dari APK Flutter arm64
rea inspect-dart-aot $apk --abi arm64-v8a --format json
```

Ketiga perintah tersebut membaca snapshot lokal APK. Perintah ini tidak memasang atau mengeksekusi aplikasi.

## Menyiapkan analisis manifest dan class Android

REA membutuhkan JDK penuh dan JAR JADX yang dipatok versinya. Setelah JDK tersedia, unduh JAR dan verifikasi hash-nya:

```powershell
$jar = Join-Path $HOME '.local\share\rea\android\jadx-headless-mcp-0.7.1-all.jar'
New-Item -ItemType Directory -Force (Split-Path $jar) | Out-Null
Invoke-WebRequest -Uri 'https://github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1/jadx-headless-mcp-0.7.1-all.jar' -OutFile $jar
if ((Get-FileHash -Algorithm SHA256 $jar).Hash.ToLowerInvariant() -ne '6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75') { throw 'Hash JADX tidak cocok' }

$env:REA_JADX_MCP_JAR = $jar
$env:JAVA_HOME = 'D:\tools\jdk-21' # sesuaikan dengan folder JDK
rea doctor
```

Lalu jalankan:

```powershell
rea inspect-android-package $apk --format json
rea search-android-classes $apk MainActivity --format json
rea inspect-android-class $apk com.contoh.app.MainActivity --format json
rea inspect-android-method $apk com.contoh.app.MainActivity onCreate --format json
```

Jika memeriksa method yang namanya sama lebih dari sekali, panggil `inspect-android-class` dahulu untuk memilih `--overload-index` yang benar.

## Analisis melalui Codex/agent

REA dapat didaftarkan sebagai MCP untuk agent:

```powershell
npx rea-agents setup
```

Perintah setup mengubah konfigurasi agent, jadi baca perubahan yang diajukan sebelum menyetujui dan restart agent setelahnya. Sesudah aktif, permintaan yang baik berbentuk:

> Analisis APK ini secara statis. Petakan layar dan fungsi, sertakan bukti path/class/string, nyatakan batasannya, dan jangan jalankan atau pasang APK.

## Cara membaca hasil

- `observed` berarti fakta teramati dari berkas.
- Path `package:...` pada APK Flutter biasanya mengungkap modul/layer proyek lama.
- String UI dan nama class adalah petunjuk fungsi; konfirmasi alur UX dengan menjalankan APK pada perangkat jika diperlukan.
- Flutter release membawa Dart AOT, bukan source Dart. REA dapat menginventaris, mencari string, dan memetakan struktur, tetapi tidak menjanjikan pemulihan source asli.
- Jangan menyalin kode, asset, atau identitas aplikasi lain. Gunakan hasilnya sebagai referensi untuk membangun implementasi BUMIRA sendiri.

## Rekam analisis Wirabumi

Hasil khusus APK lama tersimpan di [ANALISIS_APK_WIRABUMI.md](ANALISIS_APK_WIRABUMI.md). Analisis dilakukan dengan REA 6.7.0 dan hash APK dicatat agar hasil dapat direproduksi pada berkas yang sama.
