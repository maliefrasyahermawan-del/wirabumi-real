$ErrorActionPreference = 'SilentlyContinue'
$ProjectRoot = $PSScriptRoot
$LogDir = Join-Path $ProjectRoot '.wirabumi-run'
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
  $title = "W I R A B U M I"
  $sub = "Pembukuan & Kesiapan KUR untuk UMKM Solo Raya"
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
    Write-Host "     $label GAGAL menyala (timeout). Cek log di folder .wirabumi-run" -ForegroundColor Red
    return $false
  }
}

function Start-Wirabumi {
  Write-Host ""
  Write-Host "  Menyalakan Website WIRABUMI..." -ForegroundColor Yellow
  Write-Host ""

  Write-Host "  -> Memeriksa PostgreSQL (port $PgPort)..." -ForegroundColor DarkGray
  if (Get-PortOwner $PgPort) {
    Write-Host "     PostgreSQL aktif." -ForegroundColor Green
  } else {
    Write-Host "     PostgreSQL TIDAK terdeteksi. Pastikan service Postgres menyala." -ForegroundColor Red
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

function Stop-Wirabumi {
  Write-Host ""
  Write-Host "  Mematikan Website WIRABUMI..." -ForegroundColor Yellow
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

$options = @('Nyalakan Website WIRABUMI', 'Matikan Website WIRABUMI', 'Keluar')
$selected = 0
Show-Menu $options $selected

while ($true) {
  $key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
  switch ($key.VirtualKeyCode) {
    38 { if ($selected -gt 0) { $selected-- }; Show-Menu $options $selected }
    40 { if ($selected -lt $options.Count - 1) { $selected++ }; Show-Menu $options $selected }
    13 {
      switch ($selected) {
        0 { Start-Wirabumi }
        1 { Stop-Wirabumi }
        2 { Write-Host ""; Write-Host "  Sampai jumpa!" -ForegroundColor Cyan; Write-Host ""; Start-Sleep -Milliseconds 500; exit }
      }
      Show-Menu $options $selected
    }
  }
}
