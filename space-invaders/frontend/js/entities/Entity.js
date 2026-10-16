/**
 * Entity.js
 * ---------
 * Clase base de la que heredan todas las entidades del juego (Jugador,
 * Invasor, Proyectil, Barrera). Aplica el principio POO de herencia:
 * cada subclase reutiliza posición/tamaño/colisión y solo redefine su
 * propio dibujo y comportamiento.
 */
export class Entity {
  constructor({ x, y, ancho, alto, color = "#FFFFFF" }) {
    this.x = x;
    this.y = y;
    this.ancho = ancho;
    this.alto = alto;
    this.color = color;
    this.vivo = true;
  }

  colisionaCon(otra) {
    return (
      this.vivo &&
      otra.vivo &&
      this.x < otra.x + otra.ancho &&
      this.x + this.ancho > otra.x &&
      this.y < otra.y + otra.alto &&
      this.y + this.alto > otra.y
    );
  }

  dibujar(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.ancho, this.alto);
  }
}
