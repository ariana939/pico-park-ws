import Elysia from "elysia";
import os from "os";
import { Nivel2 } from "../niveles/nivel2";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// ─── Estado global de sala ────────────────────────────────────────────────────
const MAX_JUGADORES = 4;

// Mapa de id WS → datos del jugador (color, índice)
const sala = new Map<
  string,
  { id: string; color: string; indice: number; wsRef: any }
>();

const COLORES = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

// ─── Instancia del nivel 2 ───────────────────────────────────────────────────
// La función broadcast se conecta después de crear la app
let nivel2: Nivel2 | null = null;

// Referencia a todos los websockets activos para broadcast manual
const conexionesActivas = new Map<string, any>();

function broadcastSala(canal: string, datos: object) {
  const msg = JSON.stringify(datos);
  for (const ws of conexionesActivas.values()) {
    try {
      ws.send(msg);
    } catch (_) {
      // ws cerrado, ignorar
    }
  }
}

// Inicializar el nivel 2 con la función de broadcast
nivel2 = new Nivel2(broadcastSala);
nivel2.iniciar();

// ─── App Elysia ───────────────────────────────────────────────────────────────
export const app = new Elysia();

// Servir el frontend del host como HTML estático
app.get("/", () => {
  return new Response(Bun.file("./host-juego/index.html"), {
    headers: { "Content-Type": "text/html" },
  });
});

// Endpoint para obtener la IP (útil para el QR del frontend)
app.get("/ip", () => {
  const ip = getLocalIP();
  return { ip, puerto: 3000, url: `ws://${ip}:3000/ws` };
});

app.onStart(({ server }) => {
  const ip = getLocalIP();
  const port = server?.port ?? 3000;
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🎮  PICO PARK — Servidor corriendo");
  console.log(`  🌐  Red:     http://${ip}:${port}  ← Abrir en la PC host`);
  console.log(`  📱  QR/IP:   ${ip}:${port}         ← IP para los celulares`);
  console.log(`  👥  Sala:    0 / ${MAX_JUGADORES} jugadores`);
  console.log("═══════════════════════════════════════════════════════════");
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
app.ws("/ws", {
  open(ws) {
    // ── Hot-join: rechazar si sala llena ────────────────────────────────────
    if (sala.size >= MAX_JUGADORES) {
      console.log(`[RECHAZADO] Sala llena (${sala.size}/${MAX_JUGADORES})`);
      ws.send(
        JSON.stringify({
          tipo: "sala_llena",
          mensaje: "El servidor está lleno. Máximo 4 jugadores.",
        })
      );
      ws.close();
      return;
    }

    const indice = sala.size;
    const color = COLORES[indice];

    // Registrar en sala y en conexiones activas
    sala.set(ws.id, { id: ws.id, color, indice, wsRef: ws });
    conexionesActivas.set(ws.id, ws);

    // Agregar jugador al motor físico
    if (nivel2) {
      nivel2.agregarJugador(ws.id);
    }

    console.log(
      `[CONECTADO] Jugador ${indice + 1} (${color}) | Sala: ${sala.size}/${MAX_JUGADORES}`
    );

    // Confirmar conexión al celular
    ws.send(
      JSON.stringify({
        tipo: "bienvenida",
        id: ws.id,
        color,
        indice,
        mensaje: `Sos el Jugador ${indice + 1}`,
        nivel: 2,
      })
    );

    // Notificar al host-display del nuevo jugador
    broadcastSala("sala", {
      tipo: "jugador_unido",
      id: ws.id,
      color,
      indice,
      totalJugadores: sala.size,
    });
  },

  message(ws, mensaje) {
    // ── Parsear input ────────────────────────────────────────────────────────
    let data: Record<string, unknown>;

    if (typeof mensaje === "string") {
      try {
        data = JSON.parse(mensaje);
      } catch {
        return; // ignorar mensajes malformados sin crashear
      }
    } else {
      data = mensaje as Record<string, unknown>;
    }

    const tipo = data.tipo as string | undefined;
    const estado = data.estado as string | undefined;
    const direccion = data.direccion as string | undefined;

    // ── Validación estricta (Input Spam defense) ─────────────────────────────
    const tiposValidos = ["movimiento", "salto"];
    const estadosValidos = ["keydown", "keyup"];
    const direccionesValidas = ["izquierda", "derecha", "arriba", "abajo"];

    if (!tipo || !tiposValidos.includes(tipo)) return;
    if (!estado || !estadosValidos.includes(estado)) return;
    if (tipo === "movimiento" && (!direccion || !direccionesValidas.includes(direccion))) return;

    // ── Delegar al motor de física (autoridad del servidor) ──────────────────
    if (nivel2) {
      nivel2.procesarInput(ws.id, tipo, estado, direccion);
    }
  },

  close(ws) {
    // ── Hot-join: manejar desconexión sin crashear ───────────────────────────
    if (!sala.has(ws.id)) return;

    const jugador = sala.get(ws.id)!;
    sala.delete(ws.id);
    conexionesActivas.delete(ws.id);

    if (nivel2) {
      nivel2.eliminarJugador(ws.id);
    }

    console.log(
      `[DESCONECTADO] Jugador ${jugador.indice + 1} | Sala: ${sala.size}/${MAX_JUGADORES}`
    );

    broadcastSala("sala", {
      tipo: "jugador_salio",
      id: ws.id,
      totalJugadores: sala.size,
    });
  },
});

export default app;