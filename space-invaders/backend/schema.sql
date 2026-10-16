CREATE TABLE IF NOT EXISTS jugadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    avatar_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS partidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jugador_id INTEGER NOT NULL,
    puntuacion INTEGER NOT NULL DEFAULT 0,
    nivel_alcanzado INTEGER DEFAULT 1,
    duracion_segundos INTEGER,
    dificultad VARCHAR(20) DEFAULT 'medio',
    fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizada BOOLEAN DEFAULT 0,
    FOREIGN KEY (jugador_id) REFERENCES jugadores(id)
);

CREATE TABLE IF NOT EXISTS configuraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jugador_id INTEGER NOT NULL,
    dificultad_preferida VARCHAR(20) DEFAULT 'medio',
    sonido_activo BOOLEAN DEFAULT 1,
    controles_personalizados TEXT,
    FOREIGN KEY (jugador_id) REFERENCES jugadores(id)
);

CREATE INDEX IF NOT EXISTS idx_partidas_jugador ON partidas(jugador_id);
CREATE INDEX IF NOT EXISTS idx_partidas_puntuacion ON partidas(puntuacion DESC);
