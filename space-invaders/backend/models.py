"""
models.py
---------
Esquemas Pydantic: definen y validan la forma de los datos que entran y
salen de la API (capa "Model" del patrón MVC).
"""

from pydantic import BaseModel, Field
from typing import Optional


class RegistroJugador(BaseModel):
    nombre_usuario: str = Field(..., min_length=3, max_length=50)


class JugadorOut(BaseModel):
    id: int
    nombre_usuario: str
    fecha_registro: str
    avatar_url: Optional[str] = None


class PartidaIn(BaseModel):
    jugador_id: int
    puntuacion: int = Field(..., ge=0)
    nivel_alcanzado: int = Field(1, ge=1)
    duracion_segundos: int = Field(0, ge=0)
    dificultad: str = Field("medio", pattern="^(facil|medio|dificil)$")
    finalizada: bool = True


class ConfiguracionIn(BaseModel):
    dificultad_preferida: str = Field("medio", pattern="^(facil|medio|dificil)$")
    sonido_activo: bool = True
    controles_personalizados: Optional[str] = None
