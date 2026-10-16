"""
main.py
-------
Punto de entrada del backend (FastAPI). Actúa como la capa "Controller"
del patrón MVC: recibe peticiones HTTP, valida datos con los esquemas de
`models.py` y delega el trabajo real a los repositorios de `database.py`.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import DatabaseManager, JugadorRepository, PartidaRepository, ConfiguracionRepository
from models import RegistroJugador, PartidaIn, ConfiguracionIn

app = FastAPI(title="Space Invaders Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia única (Singleton) compartida por todos los repositorios
db = DatabaseManager()
jugadores_repo = JugadorRepository(db)
partidas_repo = PartidaRepository(db)
config_repo = ConfiguracionRepository(db)


# --------------------------------------------------------------------------
# Jugadores
# --------------------------------------------------------------------------

@app.post("/api/jugadores/registro")
def registrar_jugador(datos: RegistroJugador):
    nombre = datos.nombre_usuario.strip()
    if not nombre:
        raise HTTPException(400, "El nombre de usuario no puede estar vacío")
    jugador = jugadores_repo.crear_o_obtener(nombre)
    return dict(jugador)


@app.get("/api/jugadores/{nombre_usuario}")
def obtener_jugador(nombre_usuario: str):
    jugador = jugadores_repo.obtener_por_nombre(nombre_usuario)
    if not jugador:
        raise HTTPException(404, "Jugador no encontrado")
    stats = jugadores_repo.estadisticas(jugador["id"])
    return {**dict(jugador), "estadisticas": stats}


@app.get("/api/jugadores/{jugador_id}/partidas")
def historial_partidas(jugador_id: int):
    return partidas_repo.historial_por_jugador(jugador_id)


# --------------------------------------------------------------------------
# Partidas / Puntuaciones
# --------------------------------------------------------------------------

@app.post("/api/partidas")
def guardar_partida(partida: PartidaIn):
    jugador = jugadores_repo.obtener_por_id(partida.jugador_id)
    if not jugador:
        raise HTTPException(404, "Jugador no encontrado")
    partida_id = partidas_repo.guardar(
        jugador_id=partida.jugador_id,
        puntuacion=partida.puntuacion,
        nivel_alcanzado=partida.nivel_alcanzado,
        duracion_segundos=partida.duracion_segundos,
        dificultad=partida.dificultad,
        finalizada=partida.finalizada,
    )
    return {"id": partida_id, "guardado": True}


@app.get("/api/leaderboard")
def leaderboard(limite: int = 10):
    return partidas_repo.top_leaderboard(limite)


# --------------------------------------------------------------------------
# Configuraciones
# --------------------------------------------------------------------------

@app.get("/api/configuraciones/{jugador_id}")
def obtener_configuracion(jugador_id: int):
    config = config_repo.obtener(jugador_id)
    if not config:
        raise HTTPException(404, "Configuración no encontrada")
    return config


@app.put("/api/configuraciones/{jugador_id}")
def actualizar_configuracion(jugador_id: int, datos: ConfiguracionIn):
    if not jugadores_repo.obtener_por_id(jugador_id):
        raise HTTPException(404, "Jugador no encontrado")
    config_repo.actualizar(
        jugador_id,
        datos.dificultad_preferida,
        datos.sonido_activo,
        datos.controles_personalizados,
    )
    return {"actualizado": True}


# --------------------------------------------------------------------------
# Frontend estático (sirve /frontend directamente desde el mismo servidor)
# --------------------------------------------------------------------------

frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
