@echo off
echo ========================================
echo   24h Pflege App - Build Script
echo ========================================
echo.

echo [1/3] Building React frontend...
call npm run build:renderer
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Windows Installer...
call npm run build:installer
if %errorlevel% neq 0 (
    echo ERROR: Installer build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Building Portable Version...
call npm run build:portable
if %errorlevel% neq 0 (
    echo ERROR: Portable build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build completed successfully!
echo ========================================
echo.
echo Files created in 'releases' folder:
echo - 24StundenPflege Setup 1.0.2.exe (Installer)
echo - 24StundenPflege 1.0.2.exe (Portable)
echo.
echo The installer version will:
echo - Install to Program Files
echo - Create desktop shortcut
echo - Add to Start Menu
echo - Start much faster than portable version
echo.
pause
