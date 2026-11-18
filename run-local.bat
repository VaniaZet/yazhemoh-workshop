@echo off
cd /d "%~dp0"
echo Open http://localhost:8000 in your browser.
py -3 --version >nul 2>&1
if errorlevel 1 goto python_fallback
py -3 scripts\serve.py
goto end
:python_fallback
python scripts\serve.py
:end
pause
