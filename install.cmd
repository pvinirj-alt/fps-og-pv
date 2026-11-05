@echo off
cd /d "%~dp0"
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
  echo Instale o Node.js 24 ou superior e tente novamente.
  pause
  exit /b 1
)
call npm.cmd ci --ignore-scripts
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist .env copy /y .env.example .env >nul
echo Instalado. Coloque o novo token em .env e abra iniciar.cmd.
pause
