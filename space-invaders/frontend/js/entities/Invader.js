import { Entity } from "./Entity.js";
import { SpriteManager } from "../SpriteManager.js";

export class Invader extends Entity {
  constructor({ x, y, ancho, alto, color, tipo, puntos }) {
    super({ x, y, ancho, alto, color });
    this.tipo = tipo;
    this.puntos = puntos;
    this.frame = 0;
    this._clavesSprite = [`${tipo}-0`, `${tipo}-1`]; // una por frame de animación
  }

  dibujar(ctx) {
    // Sprite local (2 frames por tipo) si ya está cargado; si no, dibujo original
    const sprite = SpriteManager.obtener(this._clavesSprite[this.frame]);
    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.ancho, this.alto);
      return;
    }
    // Fallback: silueta simple tipo "pixel art" que alterna entre dos frames
    ctx.fillStyle = this.color;
    const w = this.ancho;
    const h = this.alto;
    const paso = w / 8;
    ctx.fillRect(this.x + paso * 2, this.y, paso * 4, h * 0.3);
    ctx.fillRect(this.x, this.y + h * 0.3, w, h * 0.4);
    ctx.fillRect(this.x + paso, this.y + h * 0.7, paso * 1.5, h * 0.3);
    ctx.fillRect(this.x + w - paso * 2.5, this.y + h * 0.7, paso * 1.5, h * 0.3);
    if (this.frame === 1) {
      ctx.fillRect(this.x - paso * 0.5, this.y + h * 0.5, paso, h * 0.3);
      ctx.fillRect(this.x + w - paso * 0.5, this.y + h * 0.5, paso, h * 0.3);
    }
  }
}
