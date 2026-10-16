import { Player } from "./entities/Player.js";
import { Barrier } from "./entities/Barrier.js";
import { Bullet } from "./entities/Bullet.js";
import { EnemyFactory } from "./patterns/EnemyFactory.js";
import { obtenerEstrategia } from "./patterns/DifficultyStrategy.js";
import { eventBus } from "./patterns/EventBus.js";

const COLS = 8;

// Aspecto por nivel (solo visual). El nivel 1 conserva el aspecto original; los
// siguientes ciclan por esta lista. fondo: color del canvas · suelo: línea del
// suelo · acento: color del indicador "NIVEL N".
const TEMAS_NIVEL = [
  { fondo: "#05070c", suelo: "rgba(76,255,176,0.35)", acento: "#4CFFB0" },
  { fondo: "#0b0618", suelo: "rgba(180,120,255,0.40)", acento: "#B478FF" },
  { fondo: "#041420", suelo: "rgba(80,200,255,0.40)", acento: "#50C8FF" },
  { fondo: "#1a0710", suelo: "rgba(255,90,120,0.40)", acento: "#FF5A78" },
  { fondo: "#0f1404", suelo: "rgba(255,200,87,0.40)", acento: "#FFC857" },
];
const DURACION_BANNER_NIVEL = 1.6; // segundos que se muestra "NIVEL N" al empezar cada nivel

function temaDeNivel(nivel) {
  return TEMAS_NIVEL[(nivel - 1) % TEMAS_NIVEL.length];
}

export class GameEngine {
  constructor(canvas, dificultad = "medio", nave = "nave1") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ancho = canvas.width;
    this.alto = canvas.height;

    this.dificultad = dificultad;
    this.estrategia = obtenerEstrategia(dificultad);
    this.nave = nave; // skin elegida en la pantalla inicial (solo visual)
    this.ctx.imageSmoothingEnabled = false; // sprites pixel-art nítidos

    this.reiniciar();
    this._teclas = {};
    this._ultimoTiempo = null;
    this._animId = null;
    this._tiempoJugado = 0;

    this._bindControles();
  }

  reiniciar() {
    this.puntuacion = 0;
    this.nivel = 1;
    this.jugador = new Player({ x: this.ancho / 2 - 18, y: this.alto - 50, anchoCanvas: this.ancho, skin: this.nave });
    this.jugador.vidas = this.estrategia.vidas;
    this.proyectilesJugador = [];
    this.proyectilesEnemigos = [];
    this.enemigosDestruidosTotal = 0;
    this.terminado = false;
    this._generarNivel();
  }

  _generarNivel() {
    this.invasores = [];
    const filas = EnemyFactory.filas();
    const espacioX = 44;
    const espacioY = 34;
    const offsetX = (this.ancho - COLS * espacioX) / 2;
    const offsetY = 40;
    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < COLS; c++) {
        this.invasores.push(
          EnemyFactory.crearParaFila(f, offsetX + c * espacioX, offsetY + f * espacioY)
        );
      }
    }
    this.direccionGrilla = 1;
    // Parámetros finales del nivel: base de la dificultad + modificador de nivel
    this.parametrosNivel = this.estrategia.paraNivel(this.nivel);
    this.velocidadGrilla = this.parametrosNivel.velocidadGrilla;
    this.tema = temaDeNivel(this.nivel);
    this._inicioNivel = performance.now(); // para el indicador "NIVEL N" (se dibuja en el loop)
    this.bajarGrillaPendiente = 0;

    this.barreras = [1, 2, 3].map(
      (i) => new Barrier({ x: (this.ancho / 4) * i - 30, y: this.alto - 130 })
    );
  }

  _bindControles() {
    window.addEventListener("keydown", (e) => (this._teclas[e.code] = true));
    window.addEventListener("keyup", (e) => (this._teclas[e.code] = false));
  }

  disparoManual() {
    if (this.jugador.vivo && this.jugador.puedeDisparar() && !this.terminado) {
      this.proyectilesJugador.push(this.jugador.disparar());
      eventBus.emit("disparo");
    }
  }

  moverManual(direccion) {
    this._direccionExterna = direccion;
  }

  iniciar() {
    this._ultimoTiempo = performance.now();
    const loop = (t) => {
      const dt = Math.min((t - this._ultimoTiempo) / 1000, 0.05);
      this._ultimoTiempo = t;
      if (!this.terminado) {
        this._tiempoJugado += dt;
        this._actualizar(dt);
      }
      this._dibujar();
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  detener() {
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  // ------------------------------------------------------------------
  // Lógica de actualización
  // ------------------------------------------------------------------
  _actualizar(dt) {
    // --- Movimiento del jugador ---
    let dir = 0;
    if (this._teclas["ArrowLeft"] || this._teclas["KeyA"]) dir -= 1;
    if (this._teclas["ArrowRight"] || this._teclas["KeyD"]) dir += 1;
    if (this._direccionExterna) dir = this._direccionExterna;
    this.jugador.mover(dir, dt);
    this.jugador.actualizarCooldown(dt);
    if (this._teclas["Space"]) this.disparoManual();

    // --- Movimiento de la grilla de invasores ---
    this._moverGrilla(dt);

    // --- Disparo aleatorio de invasores ---
    for (const inv of this.invasores) {
      if (!inv.vivo) continue;
      if (Math.random() < this.parametrosNivel.probabilidadDisparo * dt * 60) {
        this.proyectilesEnemigos.push(
          new Bullet({
            x: inv.x + inv.ancho / 2 - 2,
            y: inv.y + inv.alto,
            velocidadY: 260,
            color: "#FF3864",
            esDelJugador: false,
          })
        );
      }
    }

    // --- Actualizar proyectiles ---
    this._actualizarProyectiles(dt);

    // --- Colisiones ---
    this._detectarColisiones();

    // --- Condiciones de victoria/derrota ---
    this._chequearFinDeNivel();
  }

  _moverGrilla(dt) {
    const vivos = this.invasores.filter((i) => i.vivo);
    if (vivos.length === 0) return;

    let tocaBorde = false;
    for (const inv of vivos) {
      inv.x += this.direccionGrilla * this.velocidadGrilla * dt;
    }
    const minX = Math.min(...vivos.map((i) => i.x));
    const maxX = Math.max(...vivos.map((i) => i.x + i.ancho));
    if (minX < 10 || maxX > this.ancho - 10) tocaBorde = true;

    if (tocaBorde) {
      this.direccionGrilla *= -1;
      for (const inv of vivos) inv.y += 18;
    }

    // Frame de animación simple según el tiempo
    const frame = Math.floor(performance.now() / 400) % 2;
    for (const inv of vivos) inv.frame = frame;

    // Derrota si un invasor llega al nivel del suelo
    const limiteSuelo = this.jugador.y - 6;
    if (vivos.some((i) => i.y + i.alto >= limiteSuelo)) {
      this._finalizarPartida(false);
    }
  }

  _actualizarProyectiles(dt) {
    for (const b of this.proyectilesJugador) b.actualizar(dt);
    for (const b of this.proyectilesEnemigos) b.actualizar(dt);
    this.proyectilesJugador = this.proyectilesJugador.filter(
      (b) => b.vivo && !b.fueraDePantalla(this.alto)
    );
    this.proyectilesEnemigos = this.proyectilesEnemigos.filter(
      (b) => b.vivo && !b.fueraDePantalla(this.alto)
    );
  }

  _detectarColisiones() {
    // Proyectil jugador -> invasor
    for (const bala of this.proyectilesJugador) {
      if (!bala.vivo) continue;
      for (const inv of this.invasores) {
        if (inv.vivo && bala.colisionaCon(inv)) {
          inv.vivo = false;
          bala.vivo = false;
          this.puntuacion += inv.puntos;
          this.enemigosDestruidosTotal += 1;
          this.velocidadGrilla *= this.parametrosNivel.factorAceleracion;
          eventBus.emit("score", this.puntuacion);
          eventBus.emit("explosion");
          break;
        }
      }
      for (const barrera of this.barreras) {
        if (bala.vivo && barrera.impactoEn(bala.x, bala.y)) bala.vivo = false;
      }
    }

    // Proyectil enemigo -> jugador
    for (const bala of this.proyectilesEnemigos) {
      if (!bala.vivo) continue;
      for (const barrera of this.barreras) {
        if (bala.vivo && barrera.impactoEn(bala.x, bala.y)) bala.vivo = false;
      }
      if (bala.vivo && bala.colisionaCon(this.jugador)) {
        bala.vivo = false;
        this.jugador.vidas -= 1;
        eventBus.emit("vidaPerdida", this.jugador.vidas);
        if (this.jugador.vidas <= 0) {
          this._finalizarPartida(false);
        }
      }
    }
  }

  _chequearFinDeNivel() {
    if (this.terminado) return;
    if (this.invasores.every((i) => !i.vivo)) {
      this.nivel += 1;
      eventBus.emit("nivelSubido", this.nivel);
      this._generarNivel();
    }
  }

  _finalizarPartida(gano) {
    this.terminado = true;
    eventBus.emit("gameOver", {
      gano,
      puntuacion: this.puntuacion,
      nivel: this.nivel,
      duracion: Math.round(this._tiempoJugado),
      dificultad: this.dificultad,
    });
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  _dibujar() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.ancho, this.alto);
    ctx.fillStyle = this.tema.fondo;
    ctx.fillRect(0, 0, this.ancho, this.alto);

    for (const b of this.barreras) b.dibujar(ctx);
    for (const inv of this.invasores) if (inv.vivo) inv.dibujar(ctx);
    for (const bala of this.proyectilesJugador) bala.dibujar(ctx);
    ctx.fillStyle = "#FF3864";
    for (const bala of this.proyectilesEnemigos) bala.dibujar(ctx);
    if (this.jugador.vivo) this.jugador.dibujar(ctx);

    // Línea de suelo
    ctx.strokeStyle = this.tema.suelo;
    ctx.beginPath();
    ctx.moveTo(0, this.alto - 22);
    ctx.lineTo(this.ancho, this.alto - 22);
    ctx.stroke();

    // Indicador de nivel: se desvanece solo (usa el reloj del loop, sin timers)
    const seg = (performance.now() - this._inicioNivel) / 1000;
    if (seg < DURACION_BANNER_NIVEL) {
      ctx.globalAlpha = Math.min(1, (DURACION_BANNER_NIVEL - seg) / 0.5);
      ctx.fillStyle = this.tema.acento;
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(`NIVEL ${this.nivel}`, this.ancho / 2, this.alto / 2);
      ctx.globalAlpha = 1;
    }
  }
}
