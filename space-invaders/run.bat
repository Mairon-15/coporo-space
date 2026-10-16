@echo off
REM Ejecuta el juego con un solo comando: crea el entorno virtual si no existe,
REM instala dependencias y levanta el servidor.

cd /d "%~dp0backend"

if not exist venv (
    echo Creando entorno virtual...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt

echo.
echo Servidor listo -^> abre http://localhost:8000 en tu navegador
echo.

uvicorn main:app --reload --port 8000
