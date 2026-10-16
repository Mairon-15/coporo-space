import { GameEngine } from "./GameEngine.js";
import { eventBus } from "./patterns/EventBus.js";
import { api } from "./api.js";
import { sound } from "./sound.js";

// ---------------------------------------------------------------------
// Referencias a elementos del DOM
// ---------------------------------------------------------------------
const pantallas = {
  inicio: document.getElementById("pantalla-inicio"),
  juego: document.getElementById("pantalla-juego"),
  gameover: document.getElementById("pantalla-gameover"),
  leaderboard: document.getElementById("pantalla-leaderboard"),
  historial: document.getElementById("pantalla-historial"),
};

function mostrarPantalla(nombre) {
  for (const key in pantallas) {
    pantallas[key].classList.toggle("oculto", key !== nombre);
  }
}

const formJugador = document.getElementById("form-jugador");
const perfilInfo = document.getElementById("perfil-info");
const canvas = document.getElementById("canvas-juego");
const hudPuntos = document.getElementById("hud-puntos");
const hudNivel = document.getElementById("hud-nivel");
const hudVidas = document.getElementById("hud-vidas");
const gameoverTitulo = document.getElementById("gameover-titulo");
const gameoverResumen = document.getElementById("gameover-resumen");
const leaderboardCuerpo = document.getElementById("leaderboard-cuerpo");
const historialCuerpo = document.getElementById("historial-cuerpo");
const inputSonido = document.getElementById("input-sonido");
const btnVerHistorial = document.getElementById("btn-ver-historial");

// ---------------------------------------------------------------------
// Estado de sesión (en memoria, sin autenticación compleja)
// ---------------------------------------------------------------------
let jugadorActual = null; // { id, nombre_usuario }
let dificultadSeleccionada = "medio";
let naveSeleccionada = "nave1"; // solo en memoria; se conserva al "Jugar de nuevo"
let motor = null;

// ---------------------------------------------------------------------
// Registro / selección de jugador
// ---------------------------------------------------------------------
const inputNombre = document.getElementById("input-nombre");

// Al salir del campo de nombre, si el jugador ya existe, se cargan sus
// preferencias guardadas (dificultad y sonido) y sus estadísticas.
inputNombre.addEventListener("blur", async () => {
  const nombre = inputNombre.value.trim();
  if (nombre.length < 3) return;
  const perfil = await api.obtenerJugador(nombre).catch(() => null);
  if (!perfil) return;
  perfilInfo.textContent =
    `Partidas: ${perfil.estadisticas.partidas_jugadas} · ` +
    `Mejor puntuación: ${perfil.estadisticas.mejor_puntuacion} · ` +
    `Tiempo total: ${perfil.estadisticas.tiempo_total}s`;
  perfilInfo.classList.remove("oculto");

  const config = await api.obtenerConfiguracion(perfil.id).catch(() => null);
  if (config) {
    const radio = formJugador.querySelector(`input[name="dificultad"][value="${config.dificultad_preferida}"]`);
    if (radio) radio.checked = true;
    inputSonido.checked = !!config.sonido_activo;
  }
});

formJugador.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("input-nombre").value.trim();
  dificultadSeleccionada = formJugador.querySelector('input[name="dificultad"]:checked').value;
  naveSeleccionada = formJugador.querySelector('input[name="nave"]:checked')?.value ?? "nave1";
  if (nombre.length < 3) return;

  sound.setActivo(inputSonido.checked);

  try {
    const jugador = await api.registrarJugador(nombre);
    jugadorActual = jugador;
    btnVerHistorial.classList.remove("oculto");

    // Persistir la preferencia elegida para la próxima sesión
    api.actualizarConfiguracion(jugador.id, {
      dificultad_preferida: dificultadSeleccionada,
      sonido_activo: inputSonido.checked,
      controles_personalizados: null,
    }).catch(() => {});

    iniciarPartida();
  } catch (err) {
    alert("No fue posible conectar con el servidor. Verifica el backend.");
  }
});

function iniciarPartida() {
  mostrarPantalla("juego");
  if (motor) motor.detener();
  motor = new GameEngine(canvas, dificultadSeleccionada, naveSeleccionada);
  hudPuntos.textContent = "0";
  hudNivel.textContent = "1";
  hudVidas.textContent = String(motor.jugador.vidas);
  motor.iniciar();
}

// ---------------------------------------------------------------------
// Eventos del motor (Observer) -> actualización del HUD y fin de partida
// ---------------------------------------------------------------------
eventBus.on("score", (p) => (hudPuntos.textContent = String(p)));
eventBus.on("nivelSubido", (n) => { hudNivel.textContent = String(n); sound.nivelSubido(); });
eventBus.on("vidaPerdida", (v) => { hudVidas.textContent = String(Math.max(v, 0)); sound.vidaPerdida(); });
eventBus.on("disparo", () => sound.disparo());
eventBus.on("explosion", () => sound.explosion());

eventBus.on("gameOver", async (resumen) => {
  motor.detener();
  sound.gameOver();
  gameoverTitulo.textContent = "GAME OVER";
  gameoverResumen.textContent =
    `Puntuación: ${resumen.puntuacion} · Nivel alcanzado: ${resumen.nivel} · ` +
    `Tiempo: ${resumen.duracion}s · Dificultad: ${resumen.dificultad}`;
  mostrarPantalla("gameover");

  if (jugadorActual) {
    try {
      await api.guardarPartida({
        jugador_id: jugadorActual.id,
        puntuacion: resumen.puntuacion,
        nivel_alcanzado: resumen.nivel,
        duracion_segundos: resumen.duracion,
        dificultad: resumen.dificultad,
        finalizada: true,
      });
    } catch (err) {
      console.error("No se pudo guardar la partida:", err);
    }
  }
});

// ---------------------------------------------------------------------
// Controles táctiles / mouse
// ---------------------------------------------------------------------
const btnIzq = document.getElementById("btn-izquierda");
const btnDer = document.getElementById("btn-derecha");
const btnDisparo = document.getElementById("btn-disparo");

function ligarBotonMovimiento(btn, direccion) {
  const activar = (ev) => { ev.preventDefault(); if (motor) motor.moverManual(direccion); };
  const desactivar = (ev) => { ev.preventDefault(); if (motor) motor.moverManual(0); };
  btn.addEventListener("mousedown", activar);
  btn.addEventListener("touchstart", activar, { passive: false });
  btn.addEventListener("mouseup", desactivar);
  btn.addEventListener("mouseleave", desactivar);
  btn.addEventListener("touchend", desactivar);
}
ligarBotonMovimiento(btnIzq, -1);
ligarBotonMovimiento(btnDer, 1);
btnDisparo.addEventListener("click", () => motor && motor.disparoManual());
btnDisparo.addEventListener("touchstart", (e) => { e.preventDefault(); motor && motor.disparoManual(); }, { passive: false });

// Arrastre horizontal directamente sobre el canvas
let arrastrando = false;
canvas.addEventListener("pointerdown", () => (arrastrando = true));
window.addEventListener("pointerup", () => (arrastrando = false));
canvas.addEventListener("pointermove", (e) => {
  if (!arrastrando || !motor) return;
  const rect = canvas.getBoundingClientRect();
  const escala = canvas.width / rect.width;
  const xCanvas = (e.clientX - rect.left) * escala;
  motor.jugador.x = Math.max(4, Math.min(motor.ancho - motor.jugador.ancho - 4, xCanvas - motor.jugador.ancho / 2));
});

// ---------------------------------------------------------------------
// Navegación entre pantallas
// ---------------------------------------------------------------------
document.getElementById("btn-jugar-de-nuevo").addEventListener("click", iniciarPartida);
document.getElementById("btn-volver-inicio").addEventListener("click", () => mostrarPantalla("inicio"));

document.getElementById("btn-ver-leaderboard").addEventListener("click", async () => {
  await cargarLeaderboard();
  mostrarPantalla("leaderboard");
});
document.getElementById("btn-cerrar-leaderboard").addEventListener("click", () => mostrarPantalla("inicio"));

btnVerHistorial.addEventListener("click", async () => {
  await cargarHistorial();
  mostrarPantalla("historial");
});
document.getElementById("btn-cerrar-historial").addEventListener("click", () => mostrarPantalla("inicio"));

async function cargarHistorial() {
  if (!jugadorActual) return;
  historialCuerpo.innerHTML = "<tr><td colspan='5'>Cargando…</td></tr>";
  try {
    const partidas = await api.historialPartidas(jugadorActual.id);
    historialCuerpo.innerHTML = partidas.length
      ? partidas.map((p) => `
          <tr>
            <td>${p.fecha_partida}</td>
            <td>${p.puntuacion}</td>
            <td>${p.nivel_alcanzado}</td>
            <td>${p.dificultad}</td>
            <td>${p.duracion_segundos ?? "-"}</td>
          </tr>`).join("")
      : "<tr><td colspan='5'>Todavía no tienes partidas registradas</td></tr>";
  } catch (err) {
    historialCuerpo.innerHTML = "<tr><td colspan='5'>No se pudo cargar el historial</td></tr>";
  }
}

async function cargarLeaderboard() {
  leaderboardCuerpo.innerHTML = "<tr><td colspan='5'>Cargando…</td></tr>";
  try {
    const datos = await api.leaderboard(10);
    leaderboardCuerpo.innerHTML = datos.length
      ? datos.map((d, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escaparHTML(d.nombre_usuario)}</td>
            <td>${d.puntuacion}</td>
            <td>${d.nivel_alcanzado}</td>
            <td>${d.dificultad}</td>
          </tr>`).join("")
      : "<tr><td colspan='5'>Sin registros todavía</td></tr>";
  } catch (err) {
    leaderboardCuerpo.innerHTML = "<tr><td colspan='5'>No se pudo cargar (¿backend activo?)</td></tr>";
  }
}

function escaparHTML(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
