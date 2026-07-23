@echo off
title WIRABUMI System Start

echo [1/5] Memeriksa dan menginstal dependencies...
call npm install

echo [2/5] Menjalankan Database Migration (Memperbarui skema DB)...
call npm run db:migrate

echo [3/5] Menjalankan Database Seeder (Menyiapkan Akun Testing)...
call npm run db:seed

echo [4/5] Menyalakan Backend (Express) di window baru...
start "WIRABUMI Backend" cmd /c "npm run server"

echo [4/4] Menyalakan Frontend (Vite) di window baru...
start "WIRABUMI Frontend" cmd /c "npm run dev"

echo.
echo ===================================================
echo WIRABUMI System sedang dijalankan di window terpisah!
echo ===================================================
echo.
pause
