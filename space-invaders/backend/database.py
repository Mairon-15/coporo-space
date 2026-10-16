"""
database.py
-----------
Capa de acceso a datos del juego.

Patrones de diseño aplicados aquí:
- Singleton: una única instancia de conexión a la base de datos para toda
  la aplicación (DatabaseManager).
- Repository: las clases *Repository* abstraen las operaciones CRUD sobre
  cada tabla, de forma que el resto del backend (rutas de FastAPI) nunca
  escribe SQL directamente ni conoce el motor de base de datos usado.
"""

import sqlite3
from pathlib import Path
from typing import Optional
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "space_invaders.db"


class DatabaseManager:
    """Singleton: garantiza una única conexión/administrador de la base de datos."""

    _instance: Optional["DatabaseManager"] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, db_path: Path = DB_PATH):
        if self._initialized:
            return
        self.db_path = db_path
        self._init_schema()
        self._initialized = True

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @contextmanager
    def get_cursor(self):
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self):
        schema_path = Path(__file__).parent / "schema.sql"
        with self.get_cursor() as cur:
            cur.executescript(schema_path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Repositorios (patrón Repository)
# ---------------------------------------------------------------------------

class JugadorRepository:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def crear_o_obtener(self, nombre_usuario: str) -> sqlite3.Row:
        with self.db.get_cursor() as cur:
            cur.execute(
                "SELECT * FROM jugadores WHERE nombre_usuario = ?", (nombre_usuario,)
            )
            row = cur.fetchone()
            if row:
                return row
            cur.execute(
                "INSERT INTO jugadores (nombre_usuario) VALUES (?)", (nombre_usuario,)
            )
            nuevo_id = cur.lastrowid
            cur.execute(
                "INSERT INTO configuraciones (jugador_id) VALUES (?)", (nuevo_id,)
            )
            cur.execute("SELECT * FROM jugadores WHERE id = ?", (nuevo_id,))
            return cur.fetchone()

    def obtener_por_nombre(self, nombre_usuario: str) -> Optional[sqlite3.Row]:
        with self.db.get_cursor() as cur:
            cur.execute(
                "SELECT * FROM jugadores WHERE nombre_usuario = ?", (nombre_usuario,)
            )
            return cur.fetchone()

    def obtener_por_id(self, jugador_id: int) -> Optional[sqlite3.Row]:
        with self.db.get_cursor() as cur:
            cur.execute("SELECT * FROM jugadores WHERE id = ?", (jugador_id,))
            return cur.fetchone()

    def estadisticas(self, jugador_id: int) -> dict:
        with self.db.get_cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS partidas_jugadas,
                       COALESCE(MAX(puntuacion), 0) AS mejor_puntuacion,
                       COALESCE(SUM(duracion_segundos), 0) AS tiempo_total
                FROM partidas WHERE jugador_id = ? AND finalizada = 1
                """,
                (jugador_id,),
            )
            return dict(cur.fetchone())


class PartidaRepository:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def guardar(self, jugador_id: int, puntuacion: int, nivel_alcanzado: int,
                duracion_segundos: int, dificultad: str, finalizada: bool) -> int:
        with self.db.get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO partidas
                    (jugador_id, puntuacion, nivel_alcanzado, duracion_segundos,
                     dificultad, finalizada)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (jugador_id, puntuacion, nivel_alcanzado, duracion_segundos,
                 dificultad, finalizada),
            )
            return cur.lastrowid

    def historial_por_jugador(self, jugador_id: int, limite: int = 20):
        with self.db.get_cursor() as cur:
            cur.execute(
                """
                SELECT * FROM partidas WHERE jugador_id = ?
                ORDER BY fecha_partida DESC LIMIT ?
                """,
                (jugador_id, limite),
            )
            return [dict(r) for r in cur.fetchall()]

    def top_leaderboard(self, limite: int = 10):
        with self.db.get_cursor() as cur:
            cur.execute(
                """
                SELECT p.puntuacion, p.nivel_alcanzado, p.dificultad, p.fecha_partida,
                       j.nombre_usuario
                FROM partidas p
                JOIN jugadores j ON j.id = p.jugador_id
                WHERE p.finalizada = 1
                ORDER BY p.puntuacion DESC
                LIMIT ?
                """,
                (limite,),
            )
            return [dict(r) for r in cur.fetchall()]


class ConfiguracionRepository:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def obtener(self, jugador_id: int) -> Optional[dict]:
        with self.db.get_cursor() as cur:
            cur.execute(
                "SELECT * FROM configuraciones WHERE jugador_id = ?", (jugador_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def actualizar(self, jugador_id: int, dificultad_preferida: str,
                    sonido_activo: bool, controles_personalizados: Optional[str]):
        with self.db.get_cursor() as cur:
            cur.execute(
                """
                UPDATE configuraciones
                SET dificultad_preferida = ?, sonido_activo = ?, controles_personalizados = ?
                WHERE jugador_id = ?
                """,
                (dificultad_preferida, sonido_activo, controles_personalizados, jugador_id),
            )
