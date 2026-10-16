# Cóporo Space — Space Invaders Web

Clon funcional de Space Invaders con arquitectura cliente-servidor, persistencia
de partidas/leaderboard y una identidad visual propia de gabinete arcade CRT.

## Stack elegido

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | **Python + FastAPI** | Tipado con Pydantic, documentación automática (`/docs`), async nativo |
| Base de datos | **SQLite** | Portable, cero configuración, ideal para este alcance |
| Frontend | **Vanilla JS (ES Modules) + Canvas API** | El juego necesita un bucle de render a 60 FPS con control fino de píxeles; Canvas es la opción más directa y ligera para eso, sin overhead de un framework de componentes |

> **Nota sobre Flet y WASM (sección 7.2 del brief):** se evaluaron ambas rutas
> y se optó por Canvas + FastAPI en su lugar. Flet renderiza sobre Flutter y
> añade una capa intermedia pesada para un juego 2D simple. Compilar la lógica
> del juego a WASM vía Pyodide/Brython fue descartado para el bucle de juego
> en tiempo real: Pyodide carga un intérprete CPython completo (~10 MB+) en el
> navegador y tiene overhead de marshalling entre Python y el DOM/Canvas en
> cada frame, lo que perjudica la fluidez de un juego de acción. La lógica
> "core" (colisiones, grilla, puntuación) sí vive aislada en módulos JS puros
> (`GameEngine.js`, `entities/`) sin dependencias del backend — cumpliendo el
> espíritu del requisito ("lógica ejecutándose en el cliente sin conexión
> constante al servidor") sin pagar el costo de rendimiento de WASM.

## Estructura del proyecto

```
space-invaders/
├── backend/
│   ├── main.py              # Rutas FastAPI (Controller)
│   ├── database.py          # DatabaseManager (Singleton) + Repositorios
│   ├── models.py             # Esquemas Pydantic (Model)
│   ├── schema.sql            # Esquema relacional (3 tablas)
│   └── requirements.txt
└── frontend/
    ├── index.html             # Pantallas: inicio / juego / game over / leaderboard
    ├── css/style.css          # Identidad visual "gabinete CRT"
    └── js/
        ├── main.js            # Orquesta pantallas, controles y llamadas a la API
        ├── api.js              # Cliente REST
        ├── GameEngine.js       # Bucle de juego, colisiones, estados
        ├── entities/           # Entity, Player, Invader, Bullet, Barrier (POO)
        └── patterns/           # EventBus (Observer), EnemyFactory (Factory),
                                 # DifficultyStrategy (Strategy)
```

## Patrones de diseño aplicados

- **Singleton** — `DatabaseManager` en `database.py`: una sola instancia de
  conexión/inicialización de esquema para toda la app.
- **Repository** — `JugadorRepository`, `PartidaRepository`,
  `ConfiguracionRepository`: aíslan el SQL de las rutas de FastAPI.
- **Factory Method** — `EnemyFactory.crearParaFila()`: construye cada tipo de
  invasor (octopus/crab/squid) con su valor de puntos y forma, sin que
  `GameEngine` conozca los detalles.
- **Observer** — `EventBus`: `GameEngine` emite `score`, `vidaPerdida`,
  `nivelSubido`, `gameOver`; `main.js` se suscribe para actualizar el HUD y
  enviar la partida al backend, sin acoplarse al motor del juego.
- **Strategy** — `DifficultyStrategy.js`: cada dificultad (fácil/medio/difícil)
  encapsula su propia velocidad inicial, probabilidad de disparo enemigo,
  factor de aceleración y vidas iniciales.

## Modelo de datos

Las tres tablas (`jugadores`, `partidas`, `configuraciones`) están definidas
en `backend/schema.sql` exactamente según el esquema relacional solicitado,
con claves foráneas hacia `jugadores`.

## Cómo ejecutar

**Opción rápida (recomendada):** desde la raíz del proyecto, un solo comando:

```bash
# macOS / Linux
./run.sh

# Windows (CMD)
run.bat

# Windows (PowerShell)
.\run.ps1
```

> En PowerShell, si `run.ps1` da un error de "la ejecución de scripts está
> deshabilitada", ejecuta una vez `Set-ExecutionPolicy -Scope Process
> -ExecutionPolicy Bypass` y vuelve a intentarlo.

Esto crea el entorno virtual, instala las dependencias y levanta el servidor
automáticamente.

**Opción manual:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Abre `http://localhost:8000` — el propio backend sirve el frontend estático
en la misma URL (evita problemas de CORS). La documentación interactiva de la
API queda disponible en `http://localhost:8000/docs`.

## Arquitectura

```
┌─────────────────────┐        HTTP / JSON        ┌──────────────────────┐
│      FRONTEND        │ ─────────────────────────▶ │       BACKEND         │
│  (navegador, JS ES6)  │ ◀───────────────────────── │   FastAPI (Python)    │
│                       │                             │                       │
│  main.js (Controller) │                             │  main.py (Controller)│
│  GameEngine.js        │                             │  models.py (Model)    │
│  entities/ (Model)     │                             │  database.py          │
│  patterns/             │                             │   (Model/Repository)  │
└─────────────────────┘                             └──────────┬────────────┘
                                                                  │
                                                                  ▼
                                                      ┌──────────────────────┐
                                                      │   SQLite (archivo)    │
                                                      │  jugadores/partidas/   │
                                                      │   configuraciones      │
                                                      └──────────────────────┘
```

## Mecánicas y requisitos funcionales

- Nave con movimiento horizontal (teclado, botones táctiles o arrastre sobre
  el canvas) y disparo único (espacio / clic / tap).
- Grilla de invasores que rebota en los bordes, desciende un nivel y acelera
  con cada enemigo destruido.
- Disparo aleatorio de invasores hacia abajo.
- Barreras/bunkers destructibles bloque a bloque.
- Victoria al destruir toda la grilla (sube de nivel); derrota al agotar
  vidas o si un invasor alcanza el suelo.
- Puntuación por tipo de invasor, niveles con dificultad creciente.
- Efectos de sonido (disparo, explosión, vida perdida, nivel, game over)
  sintetizados con Web Audio API, controlables desde el checkbox de sonido.
- Registro de jugador (nombre único), estadísticas de perfil (partidas
  jugadas, mejor puntuación, tiempo total), historial de partidas propio y
  leaderboard Top 10, todo persistido en SQLite.
- Configuración de dificultad y sonido guardada por jugador: al volver a
  escribir un nombre existente, se precargan sus preferencias.

## Posibles extensiones

- WebSocket para un leaderboard en vivo entre pestañas/jugadores simultáneos.
- Configuración de controles personalizados (columna `controles_personalizados`
  ya preparada como JSON en la base de datos, aún sin UI para editarla).
- Despliegue público (Render/Railway/Vercel/Cloudflare Tunnel).
