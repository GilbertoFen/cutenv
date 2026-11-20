#!/bin/bash
cd "$(dirname "$0")"
echo "==================================================="
echo "    INICIANDO AGENTE DE IMPRESION TERMICA POS"
echo "==================================================="
echo ""
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado."
    echo "Instálalo desde https://nodejs.org"
    exit 1
fi
node server.js

