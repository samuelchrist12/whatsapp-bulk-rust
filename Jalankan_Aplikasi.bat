@echo off
title Bulk WA Sender - Rust Core Edition
color 0B
cd /d "%~dp0"

echo ========================================================
echo   BULK WA SENDER - RUST CORE EDITION
echo   Design ^& Craft by schrist. (https://schrist.cyou)
echo ========================================================
echo.

:: 1. Memeriksa & membebaskan port jika ada sesi sebelumnya
echo [*] Menyiapkan lingkungan sistem...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3847 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im Bulk_WA_Sender.exe >nul 2>&1
taskkill /f /im app.exe >nul 2>&1

:: 2. Menjalankan engine WhatsApp di latar belakang
echo [*] Memulai WhatsApp Engine Sidecar...
start "WhatsApp Engine Sidecar" /min node sidecar\server.js

:: 3. Meluncurkan Aplikasi Desktop
echo [*] Meluncurkan aplikasi...
timeout /t 1 /nobreak >nul

if exist "Bulk_WA_Sender.exe" (
  start "" "Bulk_WA_Sender.exe"
) else if exist "app.exe" (
  start "" "app.exe"
) else if exist "src-tauri\target\release\app.exe" (
  start "" "src-tauri\target\release\app.exe"
) else if exist "src-tauri\target\debug\app.exe" (
  start "" "src-tauri\target\debug\app.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0ui/index.html"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0ui/index.html"
) else if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0ui/index.html"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0ui/index.html"
) else (
  start "" "ui\index.html"
)

echo.
echo ========================================================
echo   Bulk WA Sender siap digunakan!
echo   Jendela ini akan tertutup otomatis...
echo ========================================================
timeout /t 2 /nobreak >nul
exit
