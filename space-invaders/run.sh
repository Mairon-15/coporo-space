#!/usr/bin/env bash
# Ejecuta el juego con un solo comando: crea el entorno virtual si no existe,
# instala dependencias y levanta el servidor.
set -e

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "Creando entorno virtual..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo ""
echo "Servidor listo -> abre http://localhost:8000 en tu navegador"
echo ""

uvicorn main:app --reload --port 8000
