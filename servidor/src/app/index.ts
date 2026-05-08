import Elysia from "elysia";
import os from "os";

function getLocalIP(): string {
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

const jugadores = new Map<string, { id: string }>();
const MAX_JUGADORES = 4;

export const app = new Elysia();

app.onStart(({ server }) => {
  const ip = getLocalIP();
  const port = server?.port ?? 3000;
  console.log("==============================================");
  console.log(`  Servidor corriendo`);
  console.log(`  Red:     ${ip}:${port}  <-- IP/puerto para poner en tu dispositivo`);
  console.log(`  Sala:    0 / ${MAX_JUGADORES} jugadores`);
  console.log("==============================================");
});

app.ws("/ws", {

  open(ws) {
    if (jugadores.size >= MAX_JUGADORES) {
      console.log(`[RECHAZADO] Sala llena (${jugadores.size}/${MAX_JUGADORES})`);
      ws.send(JSON.stringify({ tipo: "sala_llena", mensaje: "El servidor está lleno." }));
      ws.close();
      return;
    }

    jugadores.set(ws.id, { id: ws.id });
    console.log(`[CONECTADO] Jugador ${ws.id} | Sala: ${jugadores.size}/${MAX_JUGADORES}`);

    ws.send(JSON.stringify({
      tipo: "bienvenida",
      id: ws.id,
      mensaje: "Conectado exitosamente al servidor",
    }));
  },

  message(ws, mensaje) {
    let data: Record<string, unknown>;

    if (typeof mensaje === "string") {
      try {
        data = JSON.parse(mensaje);
      } catch {
        console.log(`[MENSAJE INVÁLIDO] de ${ws.id}:`, mensaje);
        return;
      }
    } else {
      data = mensaje as Record<string, unknown>;
    }

    const tipo = data.tipo as string | undefined;
    const estado = data.estado as string | undefined;
    const direccion = data.direccion as string | undefined;

    const tiposValidos = ["movimiento", "salto"];
    const estadosValidos = ["keydown", "keyup"];

    if (!tipo || !tiposValidos.includes(tipo)) {
      console.log(`[TIPO INVÁLIDO] de ${ws.id}:`, data);
      return;
    }
    if (!estado || !estadosValidos.includes(estado)) {
      console.log(`[ESTADO INVÁLIDO] de ${ws.id}:`, data);
      return;
    }

    // Log en terminal
    if (tipo === "movimiento" && direccion) {
      console.log(`Jugador ${ws.id} → ${estado === "keydown" ? "▶" : "■"} ${direccion}`);
    } else if (tipo === "salto") {
      console.log(`Jugador ${ws.id} → ${estado === "keydown" ? "▶" : "■"} salto`);
    }

    // Reemitir al juego
    ws.publish("sala", JSON.stringify({
      tipo: "accion_jugador",
      playerId: ws.id,
      ...data,
    }));
  },

  close(ws) {
    if (jugadores.has(ws.id)) {
      jugadores.delete(ws.id);
      console.log(`[DESCONECTADO] Jugador ${ws.id} | Sala: ${jugadores.size}/${MAX_JUGADORES}`);
    }
  },
});

export default app;

