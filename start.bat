@echo off
title WIRABUMI System Start

echo [1/4] Memeriksa dan menginstal dependencies...
call npm install

echo [2/4] Menjalankan Database Seeder (Menyiapkan Akun Testing)...
call npm run db:seed

echo [3/4] Menyalakan Backend (Express) di window baru...
start "WIRABUMI Backend" cmd /c "npm run server"

echo [4/4] Menyalakan Frontend (Vite) di window baru...
start "WIRABUMI Frontend" cmd /c "npm run dev"

echo.
echo ===================================================
echo WIRABUMI System sedang dijalankan di window terpisah!
echo ===================================================
echo.
pause
