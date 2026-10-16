import { Entity } from "./Entity.js";

/**
 * Barrera formada por una grilla interna de "bloques" que se van
 * desgastando al recibir impactos, tal como los bunkers del arcade
 * original.
 */
export class Barrier extends Entity {
  constructor({ x, y }) {
    super({ x, y, ancho: 60, alto: 36, color: "#4CFFB0" });
    this.cols = 10;
    this.rows = 6;
    this.bloqueAncho = this.ancho / this.cols;
    this.bloqueAlto = this.alto / this.rows;
    this.bloques = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // Silueta tipo "bunker" clásico: hueco en la base central
        const esHueco = r >= this.rows - 2 && c > 3 && c < 6;
        this.bloques.push({ c, r, vivo: !esHueco });
      }
    }
  }

  impactoEn(px, py) {
    for (const b of this.bloques) {
      if (!b.vivo) continue;
      const bx = this.x + b.c * this.bloqueAncho;
      const by = this.y + b.r * this.bloqueAlto;
      if (
        px >= bx && px <= bx + this.bloqueAncho &&
        py >= by && py <= by + this.bloqueAlto
      ) {
        b.vivo = false;
        return true;
      }
    }
    return false;
  }

  dibujar(ctx) {
    ctx.fillStyle = this.color;
    for (const b of this.bloques) {
      if (!b.vivo) continue;
      ctx.fillRect(
        this.x + b.c * this.bloqueAncho,
        this.y + b.r * this.bloqueAlto,
        this.bloqueAncho + 0.5,
        this.bloqueAlto + 0.5
      );
    }
  }
}
