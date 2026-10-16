/**
 * EventBus.js
 * -----------
 * Patrón Observer: un canal central de eventos al que distintas partes de
 * la aplicación (HUD, sonido, motor del juego, pantallas) se suscriben sin
 * conocerse entre sí. El GameEngine emite eventos ("score", "vidaPerdida",
 * "gameOver", "nivelSubido") y cualquier suscriptor reacciona.
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(evento, callback) {
    if (!this._listeners.has(evento)) this._listeners.set(evento, new Set());
    this._listeners.get(evento).add(callback);
    return () => this._listeners.get(evento).delete(callback);
  }

  emit(evento, payload) {
    const suscriptores = this._listeners.get(evento);
    if (!suscriptores) return;
    for (const cb of suscriptores) cb(payload);
  }
}

// Instancia compartida por toda la aplicación
export const eventBus = new EventBus();
