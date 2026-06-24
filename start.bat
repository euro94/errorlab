@echo off
cd /d "%~dp0"
echo.
echo  ErrorLab — CPA study companion
echo  Tailscale: https://yaro.tail6a3c7a.ts.net:8734
echo  Local:     http://localhost:8734
echo.
python -m http.server 8734 --bind 127.0.0.1
