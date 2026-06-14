@echo off
chcp 65001 >nul
title 🛑 Jojo — إيقاف المنظومة

echo إيقاف جميع خدمات Jojo...

taskkill /F /FI "WINDOWTITLE eq 🔧 Operations API :3000" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq 📋 CRM API :3001" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq 🌐 Frontend :5173" >nul 2>&1

:: إيقاف العمليات على المنافذ
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

echo ✅ تم إيقاف المنظومة.
timeout /t 2 /nobreak >nul
