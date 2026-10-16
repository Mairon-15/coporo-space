/**
 * SpriteManager.js
 * ----------------
 * Carga UNA sola vez los sprites locales (frontend/assets/sprites/*.svg) y los
 * entrega a las entidades. No dibuja ni conoce la lógica del juego.
 *
 * Fallback seguro: si un sprite todavía no terminó de cargar (la carga es
 * asíncrona) o falló, `obtener()` devuelve null y la entidad usa su dibujo
 * geométrico original. Así el juego nunca se rompe por un recurso ausente.
 */

// Ruta resuelta respecto a este módulo (js/ -> ../assets/sprites/), de modo que
// funciona igual servido desde "/" por FastAPI o desde cualquier subcarpeta.
const BASE = new URL("../assets/sprites/", import.meta.url);

// clave -> archivo. Invasores: "<tipo>-<frame>"; naves: "nave1".."nave3".
const ARCHIVOS = {
  nave1: "nave1.svg",
  nave2: "nave2.svg",
  nave3: "nave3.svg",
  "octopus-0": "octopus-0.svg",
  "octopus-1": "octopus-1.svg",
  "crab-0": "crab-0.svg",
  "crab-1": "crab-1.svg",
  "squid-0": "squid-0.svg",
  "squid-1": "squid-1.svg",
};

const sprites = new Map();

function precargar() {
  if (typeof Image === "undefined") return; // entorno sin DOM (p. ej. pruebas en Node)
  for (const [clave, archivo] of Object.entries(ARCHIVOS)) {
    const img = new Image();
    img.src = new URL(archivo, BASE).href;
    sprites.set(clave, img);
  }
}
precargar();

export const SpriteManager = {
  /** Devuelve la imagen lista para dibujar, o null si no está disponible. */
  obtener(clave) {
    const img = sprites.get(clave);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  },
};
