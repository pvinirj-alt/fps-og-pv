@echo off
cd /d "%~dp0"
if not exist .env (
  echo Execute install.cmd e preencha o arquivo .env primeiro.
  pause
  exit /b 1
)
call npm.cmd start
pause
