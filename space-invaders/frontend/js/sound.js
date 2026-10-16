/**
 * sound.js
 * --------
 * Efectos de sonido sintetizados con Web Audio API (sin archivos externos).
 * Respeta la preferencia `sonido_activo` guardada en la base de datos
 * (tabla `configuraciones`).
 */
let ctxAudio = null;
let activo = true;

function obtenerContexto() {
  if (!ctxAudio) ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
  if (ctxAudio.state === "suspended") ctxAudio.resume();
  return ctxAudio;
}

function tono({ frecuencia, duracion, tipo = "square", volumenInicial = 0.15 }) {
  if (!activo) return;
  const ctx = obtenerContexto();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, ctx.currentTime);
  gain.gain.setValueAtTime(volumenInicial, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duracion);
}

export const sound = {
  setActivo(valor) { activo = valor; },
  isActivo() { return activo; },
  disparo() { tono({ frecuencia: 880, duracion: 0.08, tipo: "square", volumenInicial: 0.08 }); },
  explosion() { tono({ frecuencia: 140, duracion: 0.18, tipo: "sawtooth", volumenInicial: 0.18 }); },
  vidaPerdida() { tono({ frecuencia: 220, duracion: 0.3, tipo: "triangle", volumenInicial: 0.2 }); },
  nivelSubido() { tono({ frecuencia: 660, duracion: 0.25, tipo: "sine", volumenInicial: 0.15 }); },
  gameOver() {
    if (!activo) return;
    [330, 260, 190, 120].forEach((f, i) =>
      setTimeout(() => tono({ frecuencia: f, duracion: 0.35, tipo: "sawtooth", volumenInicial: 0.18 }), i * 140)
    );
  },
};
