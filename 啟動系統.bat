@echo off
chcp 65001 >nul
title 合約簽核管理系統

echo ========================================
echo   合約簽核管理系統 - 啟動中...
echo ========================================
echo.

:: 取得 bat 所在目錄（專案根目錄）
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

:: 啟動後端
echo [1/3] 啟動後端 (port 8000)...
start "Backend - FastAPI" cmd /k "cd /d "%ROOT%\backend" && venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: 啟動前端
echo [2/3] 啟動前端 (port 5173)...
start "Frontend - Vite" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"

:: 等待服務啟動
echo [3/3] 等待服務啟動（5 秒）...
timeout /t 5 /nobreak >nul

:: 開啟瀏覽器
echo 開啟瀏覽器 http://localhost:5173
start http://localhost:5173

echo.
echo ========================================
echo   系統已啟動！
echo   後端 API：http://localhost:8000/docs
echo   前端介面：http://localhost:5173
echo ========================================
