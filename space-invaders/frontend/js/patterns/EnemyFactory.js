/**
 * EnemyFactory.js
 * ---------------
 * Patrón Factory Method: centraliza la creación de los distintos tipos de
 * invasor. Cada fila de la grilla usa un "tipo" con su propio valor de
 * puntos, tamaño y color, sin que el resto del código necesite conocer
 * los detalles de construcción.
 */
import { Invader } from "../entities/Invader.js";

// Definición de los tipos de invasor por fila (de arriba hacia abajo)
const TIPOS = [
  { tipo: "octopus", puntos: 30, color: "#FF3864", ancho: 32, alto: 22 },
  { tipo: "crab", puntos: 20, color: "#4CFFB0", ancho: 32, alto: 22 },
  { tipo: "crab", puntos: 20, color: "#4CFFB0", ancho: 32, alto: 22 },
  { tipo: "squid", puntos: 10, color: "#FFC857", ancho: 32, alto: 22 },
  { tipo: "squid", puntos: 10, color: "#FFC857", ancho: 32, alto: 22 },
];

export class EnemyFactory {
  static crearParaFila(fila, x, y) {
    const definicion = TIPOS[fila % TIPOS.length];
    return new Invader({ x, y, ...definicion });
  }

  static filas() {
    return TIPOS.length;
  }
}
