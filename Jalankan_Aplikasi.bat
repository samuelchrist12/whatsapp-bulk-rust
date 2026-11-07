@echo off
title Bulk WA Sender - by schrist.
color 0A
cd /d "%~dp0"

echo ========================================================
echo   BULK WA SENDER - STANDALONE EDITION
echo   Design & Craft by schrist.
echo ========================================================
echo.

:: 1. Bebaskan port 3847 dan bersihkan proses lama
echo [1/3] Menyiapkan environment...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3847 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im app.exe >nul 2>&1

:: 2. Jalankan WhatsApp Engine Sidecar di latar belakang
echo [2/3] Menjalankan WhatsApp Engine Sidecar...
start "WhatsApp Engine Sidecar" /min node sidecar\server.js

:: 3. Hitung dimensi & posisi tengah layar (78% Lebar, 88% Tinggi)
set "WIN_W=1500"
set "WIN_H=920"
set "WIN_X=210"
set "WIN_Y=80"
for /f "tokens=1-4" %%a in ('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $w=[Math]::Min(1560, [int]($s.Width*0.78)); $h=[Math]::Min(940, [int]($s.Height*0.88)); $x=[Math]::Max(0, [int](($s.Width-$w)/2)); $y=[Math]::Max(0, [int](($s.Height-$h)/2)); Write-Output \"$w $h $x $y\""') do (
  set "WIN_W=%%a"
  set "WIN_H=%%b"
  set "WIN_X=%%c"
  set "WIN_Y=%%d"
)

:: 4. Jalankan Desktop UI di posisi tengah layar
echo [3/3] Membuka Antarmuka Aplikasi di tengah layar (%WIN_W%x%WIN_H%)...
timeout /t 2 /nobreak >nul

if exist "Bulk_WA_Sender.exe" (
  echo [Info] Menjalankan Desktop Native App (Bulk_WA_Sender.exe)...
  start "" "Bulk_WA_Sender.exe"
) else if exist "app.exe" (
  echo [Info] Menjalankan Desktop Native App (app.exe)...
  start "" "app.exe"
) else if exist "src-tauri\target\release\app.exe" (
  echo [Info] Menjalankan Desktop Native App (src-tauri\target\release\app.exe)...
  start "" "src-tauri\target\release\app.exe"
) else if exist "src-tauri\target\debug\app.exe" (
  echo [Info] Menjalankan Desktop Native App (src-tauri\target\debug\app.exe)...
  start "" "src-tauri\target\debug\app.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  echo [Info] Membuka jendela aplikasi via Microsoft Edge...
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0ui/index.html" --window-size=%WIN_W%,%WIN_H% --window-position=%WIN_X%,%WIN_Y%
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  echo [Info] Membuka jendela aplikasi via Microsoft Edge...
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0ui/index.html" --window-size=%WIN_W%,%WIN_H% --window-position=%WIN_X%,%WIN_Y%
) else if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" (
  echo [Info] Membuka jendela aplikasi via Microsoft Edge...
  start "" "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0ui/index.html" --window-size=%WIN_W%,%WIN_H% --window-position=%WIN_X%,%WIN_Y%
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  echo [Info] Membuka jendela aplikasi via Google Chrome...
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0ui/index.html" --window-size=%WIN_W%,%WIN_H% --window-position=%WIN_X%,%WIN_Y%
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  echo [Info] Membuka jendela aplikasi via Google Chrome...
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0ui/index.html" --window-size=%WIN_W%,%WIN_H% --window-position=%WIN_X%,%WIN_Y%
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
  echo [Info] Membuka jendela aplikasi via Google Chrome...
  start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0ui/index.html" --window-size=%WIN_W%,%WIN_H% --window-position=%WIN_X%,%WIN_Y%
) else (
  echo [Info] Membuka jendela aplikasi via browser default...
  start "" "ui\index.html"
)

echo.
echo ========================================================
echo   Aplikasi berhasil dijalankan!
echo   Jendela console ini dapat diminimalkan (jangan ditutup).
echo ========================================================
pause
