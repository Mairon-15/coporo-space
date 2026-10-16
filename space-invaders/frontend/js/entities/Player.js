import { Entity } from "./Entity.js";
import { Bullet } from "./Bullet.js";
import { SpriteManager } from "../SpriteManager.js";

export class Player extends Entity {
  constructor({ x, y, anchoCanvas, skin = "nave1" }) {
    super({ x, y, ancho: 36, alto: 20, color: "#4CFFB0" });
    this.velocidad = 260; // px/segundo
    this.anchoCanvas = anchoCanvas;
    this.cooldownDisparo = 0;
    this.vidas = 3;
    this.skin = skin; // solo apariencia: no altera el comportamiento
  }

  mover(direccion, dt) {
    this.x += direccion * this.velocidad * dt;
    this.x = Math.max(4, Math.min(this.anchoCanvas - this.ancho - 4, this.x));
  }

  actualizarCooldown(dt) {
    if (this.cooldownDisparo > 0) this.cooldownDisparo -= dt;
  }

  puedeDisparar() {
    return this.cooldownDisparo <= 0;
  }

  disparar() {
    this.cooldownDisparo = 0.45; // límite: un proyectil propio a la vez (aprox.)
    return new Bullet({
      x: this.x + this.ancho / 2 - 2,
      y: this.y - 10,
      velocidadY: -420,
      color: "#E8FFF3",
      esDelJugador: true,
    });
  }

  dibujar(ctx) {
    // Sprite local si ya está cargado; si no, se usa el dibujo geométrico original
    const sprite = SpriteManager.obtener(this.skin);
    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.ancho, this.alto);
      return;
    }
    // Fallback: nave estilo "cañón" simple, fiel a la silueta clásica del arcade
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y + 10, this.ancho, 10);
    ctx.fillRect(this.x + this.ancho / 2 - 4, this.y, 8, 12);
    ctx.fillRect(this.x + 6, this.y + 6, this.ancho - 12, 6);
  }
}
