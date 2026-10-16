/**
 * DifficultyStrategy.js
 * ---------------------
 * Patrón Strategy: encapsula los parámetros de comportamiento del juego
 * (velocidad inicial de la grilla, probabilidad de disparo enemigo,
 * incremento de velocidad por enemigo destruido) para cada nivel de
 * dificultad. El GameEngine solo conoce la interfaz común, no los valores
 * concretos de cada estrategia.
 *
 * Progresión por nivel: la dificultad global elegida fija los parámetros BASE
 * (nivel 1 = 100 %); `paraNivel(n)` les aplica encima un modificador gradual.
 * Todos los números de esa progresión viven en PROGRESION_NIVEL.
 */

// Modificadores de progresión, aplicados por cada nivel superado (nivel 1 = sin cambio).
export const PROGRESION_NIVEL = {
  velocidad: 0.18,    // +18 % de velocidad de grilla por nivel (valor que ya usaba el juego)
  disparo: 0.08,      // +8 % de probabilidad de disparo enemigo por nivel
  aceleracion: 0.001,  // se suma al factor de aceleración por invasor destruido
  pasosMaximos: 7,    // disparo y aceleración dejan de crecer tras 7 niveles de progresión (nivel 8)
};

class EstrategiaBase {
  constructor({ velocidadInicial, probabilidadDisparo, factorAceleracion, vidas }) {
    this.velocidadInicial = velocidadInicial;
    this.probabilidadDisparo = probabilidadDisparo;
    this.factorAceleracion = factorAceleracion;
    this.vidas = vidas;
  }

  /**
   * Parámetros finales para un nivel: base de la dificultad + modificador de nivel.
   * Nivel 1 devuelve exactamente los valores base.
   */
  paraNivel(nivel) {
    const pasos = Math.max(0, nivel - 1);
    const pasosTope = Math.min(pasos, PROGRESION_NIVEL.pasosMaximos);
    return {
      velocidadGrilla: this.velocidadInicial * (1 + pasos * PROGRESION_NIVEL.velocidad),
      probabilidadDisparo: this.probabilidadDisparo * (1 + pasosTope * PROGRESION_NIVEL.disparo),
      factorAceleracion: this.factorAceleracion + pasosTope * PROGRESION_NIVEL.aceleracion,
    };
  }
}

export const ESTRATEGIAS = {
  facil: new EstrategiaBase({
    velocidadInicial: 22,
    probabilidadDisparo: 0.0025,
    factorAceleracion: 1.02,
    vidas: 4,
  }),
  medio: new EstrategiaBase({
    velocidadInicial: 32,
    probabilidadDisparo: 0.0045,
    factorAceleracion: 1.035,
    vidas: 3,
  }),
  dificil: new EstrategiaBase({
    velocidadInicial: 46,
    probabilidadDisparo: 0.007,
    factorAceleracion: 1.05,
    vidas: 2,
  }),
};

export function obtenerEstrategia(nombre) {
  return ESTRATEGIAS[nombre] || ESTRATEGIAS.medio;
}
