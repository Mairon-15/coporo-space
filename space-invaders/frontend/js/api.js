/**
 * api.js
 * ------
 * Pequeña capa de acceso a la API REST del backend. Mantiene el resto del
 * frontend libre de detalles de `fetch`, URLs o manejo de errores HTTP.
 */
const BASE_URL = ""; // mismo origen: el backend sirve también el frontend

async function solicitar(path, opciones = {}) {
  try {
    const resp = await fetch(BASE_URL + path, {
      headers: { "Content-Type": "application/json" },
      ...opciones,
    });
    if (!resp.ok) {
      const detalle = await resp.json().catch(() => ({}));
      throw new Error(detalle.detail || `Error HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.error("Error de red/API:", err);
    throw err;
  }
}

export const api = {
  registrarJugador: (nombre_usuario) =>
    solicitar("/api/jugadores/registro", {
      method: "POST",
      body: JSON.stringify({ nombre_usuario }),
    }),

  obtenerJugador: (nombre) => solicitar(`/api/jugadores/${encodeURIComponent(nombre)}`),

  historialPartidas: (jugadorId) => solicitar(`/api/jugadores/${jugadorId}/partidas`),

  guardarPartida: (partida) =>
    solicitar("/api/partidas", { method: "POST", body: JSON.stringify(partida) }),

  leaderboard: (limite = 10) => solicitar(`/api/leaderboard?limite=${limite}`),

  obtenerConfiguracion: (jugadorId) => solicitar(`/api/configuraciones/${jugadorId}`),

  actualizarConfiguracion: (jugadorId, config) =>
    solicitar(`/api/configuraciones/${jugadorId}`, {
      method: "PUT",
      body: JSON.stringify(config),
    }),
};
