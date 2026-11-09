@echo off
title Bulk WA Sender v1.0 - Rust Core Edition
color 0B
cd /d "%~dp0"

echo ========================================================
echo   BULK WA SENDER v1.0 - RUST CORE EDITION
echo   Design ^& Craft by schrist. (https://schrist.cyou)
echo ========================================================
echo.

:: 1. Preparing environment and cleaning legacy port locks
echo [*] Initializing runtime environment...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3847 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im Bulk_WA_Sender.exe >nul 2>&1
taskkill /f /im app.exe >nul 2>&1

:: 2. Launching Desktop Application (Native Rust Core manages silent sidecar lifecycle & clean shutdown)
echo [*] Launching Bulk WA Sender desktop client...

if exist "Bulk_WA_Sender.exe" (
  start "" "Bulk_WA_Sender.exe"
) else if exist "app.exe" (
  start "" "app.exe"
) else if exist "src-tauri\target\release\app.exe" (
  start "" "src-tauri\target\release\app.exe"
) else if exist "src-tauri\target\debug\app.exe" (
  start "" "src-tauri\target\debug\app.exe"
) else (
  echo [*] Native binary not found, starting development sidecar + browser fallback...
  start "WhatsApp Engine Sidecar" /min node sidecar\server.js
  timeout /t 1 /nobreak >nul
  if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
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
)

echo.
echo ========================================================
echo   Bulk WA Sender v1.0 launched successfully!
echo   This window will close automatically...
echo ========================================================
timeout /t 2 /nobreak >nul
exit

