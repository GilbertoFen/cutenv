@echo off
title Agente Local de Impresion POS
cd /d "%~dp0"
echo ===================================================
echo     INICIANDO AGENTE DE IMPRESION TERMICA POS
echo ===================================================
echo.
echo Puerto: 5001
echo Verificando instalacion de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en esta computadora.
    echo Por favor descargue e instale Node.js desde https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo Node.js detectado correctamente.
echo Iniciando servicio de impresion...
node server.js
pause

