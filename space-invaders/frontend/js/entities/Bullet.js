import { Entity } from "./Entity.js";

export class Bullet extends Entity {
  constructor({ x, y, velocidadY, color, esDelJugador }) {
    super({ x, y, ancho: 4, alto: 12, color });
    this.velocidadY = velocidadY;
    this.esDelJugador = esDelJugador;
  }

  actualizar(dt) {
    this.y += this.velocidadY * dt;
  }

  fueraDePantalla(altoCanvas) {
    return this.y < -20 || this.y > altoCanvas + 20;
  }
}
