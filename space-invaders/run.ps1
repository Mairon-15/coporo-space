# Ejecuta el juego con un solo comando en PowerShell.
# Activa el entorno virtual (creandolo si no existe) e instala dependencias
# solo si hace falta, luego levanta el servidor.

Set-Location -Path (Join-Path $PSScriptRoot "backend")

if (-not (Test-Path "venv")) {
    Write-Host "Creando entorno virtual..."
    python -m venv venv
}

& ".\venv\Scripts\Activate.ps1"

pip install -q -r requirements.txt

Write-Host ""
Write-Host "Servidor listo -> abre http://localhost:8000 en tu navegador"
Write-Host ""

uvicorn main:app --reload --port 8000
