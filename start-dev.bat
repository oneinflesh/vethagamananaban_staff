@echo off
setlocal
set "APP_DIR=%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%src\main\shell\createDevShortcut.ps1" -LauncherPath "%~f0"
if errorlevel 1 echo Warning: Could not create the desktop shortcut.

where git >nul 2>&1
if errorlevel 1 (
  echo Git is not available on PATH.
  pause
  exit /b 1
)

echo Checking for updates...
git -C "%APP_DIR%" pull --ff-only
if errorlevel 1 (
  echo Update failed. The dev server was not started.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm is not available on PATH.
  pause
  exit /b 1
)

pushd "%APP_DIR%"
call npm run dev
set "APP_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %APP_EXIT_CODE%
