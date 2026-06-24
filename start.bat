@echo off
cd /d "%~dp0"
echo.
echo  ErrorLab — CPA study companion
echo  http://localhost:8734
echo.
python -m http.server 8734 --bind 127.0.0.1
