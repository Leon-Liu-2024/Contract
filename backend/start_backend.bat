@echo off
title Backend - FastAPI (port 8000)
cd /d "%~dp0"
echo Starting FastAPI backend...
echo Directory: %CD%
echo.
venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
