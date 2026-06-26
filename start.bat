@echo off
cd /d "%~dp0"
echo.
echo  ErrorLab — CPA study companion
echo  Tailscale: https://yaro.tail6a3c7a.ts.net:8735
echo  Local:     http://localhost:8735
echo.
python server.py 8735
