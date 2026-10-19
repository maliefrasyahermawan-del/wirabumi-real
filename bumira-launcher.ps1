$ErrorActionPreference = 'SilentlyContinue'
$ProjectRoot = $PSScriptRoot
$LogDir = Join-Path $ProjectRoot '.bumira-run'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$BackendPort = 4001
$FrontendPort = 5173
$PgPort = 5432
$Url = "http://localhost:$FrontendPort"

function Get-PortOwner($port) {
  return (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
}

function Show-Banner {
  $width = 58
  $border = ('=' * $width)
  Write-Host ""
  Write-Host "  +$border+" -ForegroundColor Cyan
  Write-Host ("  |" + (" " * $width) + "|") -ForegroundColor Cyan
  $title = "B U M I R A"
  $sub = "Pembukuan & Kesiapan KUR untuk UMKM Indonesia"
  $titlePad = [math]::Floor(($width - $title.Length) / 2)
  $subPad = [math]::Floor(($width - $sub.Length) / 2)
  Write-Host ("  |" + (" " * $titlePad) + $title + (" " * ($width - $titlePad - $title.Length)) + "|") -ForegroundColor White
  Write-Host ("  |" + (" " * $subPad) + $sub + (" " * ($width - $subPad - $sub.Length)) + "|") -ForegroundColor DarkGray
  Write-Host ("  |" + (" " * $width) + "|") -ForegroundColor Cyan
  Write-Host "  +$border+" -ForegroundColor Cyan
  Write-Host ""

  $beUp = [bool](Get-PortOwner $BackendPort)
  $feUp = [bool](Get-PortOwner $FrontendPort)
  Write-Host "  Status:  " -NoNewline -ForegroundColor DarkGray
  Write-Host "Backend " -NoNewline -ForegroundColor DarkGray
  Write-Host $(if ($beUp) { "[AKTIF]" } else { "[MATI]" }) -NoNewline -ForegroundColor $(if ($beUp) { "Green" } else { "DarkRed" })
  Write-Host "   Frontend " -NoNewline -ForegroundColor DarkGray
  Write-Host $(if ($feUp) { "[AKTIF]" } else { "[MATI]" }) -ForegroundColor $(if ($feUp) { "Green" } else { "DarkRed" })
  Write-Host ""
}

function Show-Menu($options, $selected) {
  Clear-Host
  Show-Banner
  for ($i = 0; $i -lt $options.Count; $i++) {
    if ($i -eq $selected) {
      Write-Host "   > $($options[$i])" -ForegroundColor Black -BackgroundColor Cyan
    } else {
      Write-Host "     $($options[$i])" -ForegroundColor White
    }
  }
  Write-Host ""
  Write-Host "  (panah atas/bawah untuk pilih, Enter untuk konfirmasi)" -ForegroundColor DarkGray
}

function Wait-ForPort($port, $label, $timeoutMs = 15000) {
  $waited = 0
  while (-not (Get-PortOwner $port) -and $waited -lt $timeoutMs) {
    Start-Sleep -Milliseconds 250
    $waited += 250
    Write-Host "." -NoNewline -ForegroundColor DarkGray
  }
  Write-Host ""
  if (Get-PortOwner $port) {
    Write-Host "     $label aktif di http://localhost:$port" -ForegroundColor Green
    return $true
  } else {
    Write-Host "     $label GAGAL menyala (timeout). Cek log di folder .bumira-run" -ForegroundColor Red
    return $false
  }
}

function Start-BUMIRA {
  Write-Host ""
  Write-Host "  Menyalakan Website BUMIRA..." -ForegroundColor Yellow
  Write-Host ""

  Write-Host "  -> Memeriksa PostgreSQL (port $PgPort)..." -ForegroundColor DarkGray
  $pgReady = [bool](Get-PortOwner $PgPort)

  if (-not $pgReady) {
    Write-Host "     PostgreSQL tidak terdeteksi, mencoba menyalakan service..." -ForegroundColor DarkGray
    $pgService = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
      try {
        Start-Service -Name $pgService.Name -ErrorAction Stop
        Write-Host "     Menunggu PostgreSQL menyala" -NoNewline -ForegroundColor DarkGray
        $waited = 0
        while (-not (Get-PortOwner $PgPort) -and $waited -lt 10000) {
          Start-Sleep -Milliseconds 300
          $waited += 300
          Write-Host "." -NoNewline -ForegroundColor DarkGray
        }
        Write-Host ""
        $pgReady = [bool](Get-PortOwner $PgPort)
      } catch {
        Write-Host "     Tidak bisa menyalakan service '$($pgService.Name)' otomatis (coba jalankan start.bat sebagai Administrator)." -ForegroundColor Red
      }
    } else {
      Write-Host "     Tidak ditemukan service PostgreSQL di komputer ini - install PostgreSQL dulu (lihat README.md)." -ForegroundColor Red
    }
  }

  $dbReady = $false
  if ($pgReady) {
    Write-Host "     PostgreSQL aktif." -ForegroundColor Green

    $envPath = Join-Path $ProjectRoot '.env'
    if (-not (Test-Path $envPath)) {
      Write-Host "  -> File .env belum ada, membuat otomatis dari .env.example..." -ForegroundColor DarkGray
      $envExample = Get-Content (Join-Path $ProjectRoot '.env.example') -Raw
      $devPassword = 'bumira_dev_only'
      $jwtSecret = ([guid]::NewGuid().ToString('N')) + ([guid]::NewGuid().ToString('N'))
      $envContent = ($envExample -replace 'CHANGE_ME', $devPassword) -replace 'JWT_SECRET=', "JWT_SECRET=$jwtSecret"
      Set-Content -Path $envPath -Value $envContent -Encoding utf8 -NoNewline
      Write-Host "     .env dibuat (password database default: $devPassword)." -ForegroundColor Green
    }

    Write-Host "  -> Memeriksa struktur database 'bumira'..." -ForegroundColor DarkGray
    & node (Join-Path $ProjectRoot 'server\scripts\ensure-db.js')
    if ($LASTEXITCODE -eq 0) {
      Write-Host "     Schema database siap." -ForegroundColor Green

      & node (Join-Path $ProjectRoot 'server\scripts\migrate.js') | Out-Null

      Write-Host "  -> Memeriksa / Membuat Akun Testing di Database..." -ForegroundColor DarkGray
      & node (Join-Path $ProjectRoot 'server\scripts\seed.js') | Out-Null
      Write-Host "     Akun testing (Mockup) siap digunakan." -ForegroundColor Green
      $dbReady = $true
    } else {
      Write-Host ""
      Write-Host "     Database/role 'bumira_app' belum ada di PostgreSQL. Jalankan sekali (lewat psql):" -ForegroundColor Red
      Write-Host "       CREATE ROLE bumira_app WITH LOGIN PASSWORD '<sesuai DATABASE_URL di .env>';" -ForegroundColor Yellow
      Write-Host "       CREATE DATABASE bumira OWNER bumira_app;" -ForegroundColor Yellow
      Write-Host "     Detail lengkap: README.md bagian 'Quick setup for judges / reviewers'." -ForegroundColor DarkGray
    }
  } else {
    Write-Host "     PostgreSQL TIDAK aktif - tidak bisa lanjut tanpa database." -ForegroundColor Red
  }

  if (-not $dbReady) {
    Write-Host ""
    Write-Host "  Tekan tombol apa saja untuk kembali ke menu..." -ForegroundColor DarkGray
    [void][System.Console]::ReadKey($true)
    return
  }

  if (Get-PortOwner $BackendPort) {
    Write-Host "  -> Backend (Express) sudah aktif, dilewati." -ForegroundColor Green
  } else {
    Write-Host "  -> Menyalakan backend (Express)..." -ForegroundColor DarkGray -NoNewline
    Write-Host ""
    Start-Process -FilePath "npm.cmd" -ArgumentList "run","server" -WorkingDirectory $ProjectRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $LogDir 'backend.out.log') -RedirectStandardError (Join-Path $LogDir 'backend.err.log')
    Write-Host "     " -NoNewline
    Wait-ForPort $BackendPort "Backend" | Out-Null
  }

  if (Get-PortOwner $FrontendPort) {
    Write-Host "  -> Frontend (Vite) sudah aktif, dilewati." -ForegroundColor Green
  } else {
    Write-Host "  -> Menyalakan frontend (Vite)..." -ForegroundColor DarkGray
    Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $ProjectRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $LogDir 'frontend.out.log') -RedirectStandardError (Join-Path $LogDir 'frontend.err.log')
    Write-Host "     " -NoNewline
    Wait-ForPort $FrontendPort "Frontend" | Out-Null
  }

  Write-Host ""
  if (Get-PortOwner $FrontendPort) {
    Write-Host "  Website siap diakses:" -ForegroundColor Cyan
    $esc = [char]27
    $hyperlink = $esc + ']8;;' + $Url + $esc + '\' + $Url + $esc + ']8;;' + $esc + '\'
    Write-Host ("     " + $hyperlink) -ForegroundColor Blue
    Start-Process $Url
  } else {
    Write-Host "  Website belum bisa diakses - cek pesan error di atas." -ForegroundColor Red
  }

  Write-Host ""
  Write-Host "  Tekan tombol apa saja untuk kembali ke menu..." -ForegroundColor DarkGray
  [void][System.Console]::ReadKey($true)
}

function Stop-BUMIRA {
  Write-Host ""
  Write-Host "  Mematikan Website BUMIRA..." -ForegroundColor Yellow
  Write-Host ""
  $stoppedAny = $false

  $fePid = Get-PortOwner $FrontendPort
  if ($fePid) {
    Write-Host "  -> Menghentikan frontend (Vite)..." -ForegroundColor DarkGray
    Stop-Process -Id $fePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
    Write-Host "     Frontend dihentikan." -ForegroundColor Green
    $stoppedAny = $true
  }

  $bePid = Get-PortOwner $BackendPort
  if ($bePid) {
    Write-Host "  -> Menghentikan backend (Express)..." -ForegroundColor DarkGray
    Stop-Process -Id $bePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
    Write-Host "     Backend dihentikan." -ForegroundColor Green
    $stoppedAny = $true
  }

  Write-Host ""
  if ($stoppedAny) {
    Write-Host "  Website berhasil dimatikan." -ForegroundColor Green
  } else {
    Write-Host "  Website memang belum menyala." -ForegroundColor DarkGray
  }
  Write-Host ""
  Write-Host "  Tekan tombol apa saja untuk kembali ke menu..." -ForegroundColor DarkGray
  [void][System.Console]::ReadKey($true)
}

$options = @('Nyalakan Website BUMIRA', 'Matikan Website BUMIRA', 'Keluar')
$selected = 0
Show-Menu $options $selected

while ($true) {
  $key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
  switch ($key.VirtualKeyCode) {
    38 { if ($selected -gt 0) { $selected-- }; Show-Menu $options $selected }
    40 { if ($selected -lt $options.Count - 1) { $selected++ }; Show-Menu $options $selected }
    13 {
      switch ($selected) {
        0 { Start-BUMIRA }
        1 { Stop-BUMIRA }
        2 { Write-Host ""; Write-Host "  Sampai jumpa!" -ForegroundColor Cyan; Write-Host ""; Start-Sleep -Milliseconds 500; exit }
      }
      Show-Menu $options $selected
    }
  }
}
