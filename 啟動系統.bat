@echo off
title Contract Management System

echo ========================================
echo   Starting Contract Management System
echo ========================================
echo.

echo [1/3] Starting Backend (port 8000)...
powershell -NoProfile -Command "Start-Process '%~dp0backend\start_backend.bat'"

echo [2/3] Starting Frontend (port 5173)...
powershell -NoProfile -Command "Start-Process '%~dp0frontend\start_frontend.bat'"

echo [3/3] Waiting 10 seconds for services to start...
timeout /t 10 /nobreak >nul

echo Opening browser at http://localhost:5173
start http://localhost:5173

echo.
echo ========================================
echo   Backend API : http://localhost:8000/docs
echo   Frontend    : http://localhost:5173
echo ========================================
pause
