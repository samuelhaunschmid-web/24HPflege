@echo off
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "C:\Users\samue\Desktop\24HPflege"
echo Starting 24-Stunden-Pflege App...
echo.
echo Installing dependencies if needed...
call npm install
echo.
echo Installing renderer dependencies...
cd renderer
call npm install
cd ..
echo.
echo Starting development server...
call npm run dev
pause
