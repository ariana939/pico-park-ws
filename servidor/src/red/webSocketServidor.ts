import Elysia from "elysia";
import os from "os";
import { NivelBase } from "../niveles/nivelBase";

const MAX_JUGADORES   = 4;
const COLORES_SIDEBAR = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

const TIPOS_VALIDOS       = new Set(["movimiento", "salto"]);
const ESTADOS_VALIDOS     = new Set(["keydown", "keyup"]);
const DIRECCIONES_VALIDAS = new Set(["izquierda", "derecha", "arriba", "abajo"]);

interface DatosConexion {
  indice: number;
  color:  string;
  ws:     any;
}

export class WebSocketServidor {
  private app:        Elysia;
  private sala:       Map<string, DatosConexion> = new Map();
  private conexiones: Map<string, any>           = new Map();
  private displays:   Set<string>                = new Set();
  private nivel:      NivelBase | null           = null;
  private niveles:    Record<number, NivelBase>  = {};

  constructor() {
    this.app = new Elysia();
    this.configurarRutas();
    this.configurarWebSocket();
  }

  setNiveles(niveles: Record<number, NivelBase>): void {
    this.niveles = niveles;
  }

  private cambiarNivel(numero: number): void {
    this.nivel?.detener();

    const siguiente = this.niveles[numero];
    if (!siguiente) {
      console.log(`[NIVEL] Nivel ${numero} no existe`);
      return;
    }

    this.nivel = siguiente;
    this.nivel.iniciar();
    console.log(`[NIVEL] Iniciando Nivel ${numero}`);

    this.broadcast({ tipo: "nivel_iniciado", nivel: numero });
  }

  escuchar(puerto: number): void {
    this.app.listen({ hostname: "0.0.0.0", port: puerto });
  }

  broadcast(datos: object): void {
    const msg = JSON.stringify(datos);
    for (const ws of this.conexiones.values()) {
      try { ws.send(msg); } catch (_) { /* ws ya cerrado */ }
    }
  }

  getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] ?? []) {
        if (iface.family === "IPv4" && !iface.internal) return iface.address;
      }
    }
    return "localhost";
  }

  private configurarRutas(): void {
    this.app.get("/", () =>
      new Response(Bun.file("./host-juego/index.html"), {
        headers: { "Content-Type": "text/html" },
      })
    );

    this.app.get("/estilos/*", ({ request }) => {
      const url = new URL(request.url);
      return new Response(Bun.file(`./host-juego${url.pathname}`));
    });

    this.app.get("/js/*", ({ request }) => {
      const url = new URL(request.url);
      return new Response(Bun.file(`./host-juego${url.pathname}`));
    });

    this.app.get("/ip", () => {
      const ip = this.getLocalIP();
      return { ip, puerto: 3000, url: `ws://${ip}:3000/ws` };
    });

    this.app.onStart(({ server }) => {
      const ip   = this.getLocalIP();
      const port = server?.port ?? 3000;
      console.log("═══════════════════════════════════════════════════════════");
      console.log("  🎮  PICO PARK — Servidor corriendo");
      console.log(`  🌐  Host:    http://${ip}:${port}`);
      console.log(`  📱  Celular: ${ip}:${port}`);
      console.log(`  👥  Sala:    0 / ${MAX_JUGADORES} jugadores`);
      console.log("═══════════════════════════════════════════════════════════");
    });
  }

  private configurarWebSocket(): void {
    this.app.ws("/ws", {
      open:    (ws) => this.onConexion(ws),
      message: (ws, msg) => this.onMensaje(ws, msg),
      close:   (ws) => this.onDesconexion(ws),
    });
  }

  private onConexion(ws: any): void {
    const url       = new URL(ws.data.url, "http://localhost");
    const esDisplay = url.searchParams.get("tipo") === "display";

    this.conexiones.set(ws.id, ws);

    if (esDisplay) {
      this.displays.add(ws.id);
      console.log(`[DISPLAY] Host conectado`);
      return;
    }

    if (this.sala.size >= MAX_JUGADORES) {
      ws.send(JSON.stringify({ tipo: "sala_llena", mensaje: "Sala llena (máx. 4 jugadores)." }));
      ws.close();
      return;
    }

    const indice = this.sala.size;
    const color  = COLORES_SIDEBAR[indice]!;

    this.sala.set(ws.id, { indice, color, ws });
    this.nivel?.agregarJugador(ws.id);

    console.log(`[+] Jugador ${indice + 1} conectado | Sala: ${this.sala.size}/${MAX_JUGADORES}`);

    ws.send(JSON.stringify({
      tipo:    "bienvenida",
      id:      ws.id,
      color,
      indice,
      mensaje: `Sos el Jugador ${indice + 1}`,
    }));

    this.broadcast({
      tipo:           "jugador_unido",
      id:             ws.id,
      color,
      indice,
      totalJugadores: this.sala.size,
    });
  }

  private onMensaje(ws: any, mensaje: unknown): void {
    // El display solo puede mandar elegir_nivel
    if (this.displays.has(ws.id)) {
      const data = this.parsearMensaje(mensaje);
      if (data?.tipo === "elegir_nivel") {
        this.cambiarNivel(Number(data.nivel));
      }
      return;
    }
    if (!this.sala.has(ws.id))    return;

    const data = this.parsearMensaje(mensaje);
    if (!data) return;

    const { tipo, estado, direccion } = data;

    if (tipo === undefined || estado === undefined) return;

    // Validación estricta
    if (!TIPOS_VALIDOS.has(tipo))     return;
    if (!ESTADOS_VALIDOS.has(estado)) return;
    if (tipo === "movimiento" && !DIRECCIONES_VALIDAS.has(direccion ?? "")) return;

    this.nivel?.procesarInput(ws.id, tipo, estado, direccion);
  }

  private onDesconexion(ws: any): void {
    // Si era el display, solo limpiarlo
    if (this.displays.has(ws.id)) {
      this.displays.delete(ws.id);
      this.conexiones.delete(ws.id);
      console.log(`[DISPLAY] Host desconectado`);
      return;
    }

    if (!this.sala.has(ws.id)) return;

    const { indice } = this.sala.get(ws.id)!;
    this.sala.delete(ws.id);
    this.conexiones.delete(ws.id);

    this.nivel?.eliminarJugador(ws.id);

    console.log(`[-] Jugador ${indice + 1} desconectado | Sala: ${this.sala.size}/${MAX_JUGADORES}`);

    this.broadcast({
      tipo:           "jugador_salio",
      id:             ws.id,
      totalJugadores: this.sala.size,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private parsearMensaje(mensaje: unknown): Record<string, string> | null {
    if (typeof mensaje === "string") {
      try { return JSON.parse(mensaje); } catch { return null; }
    }
    if (typeof mensaje === "object" && mensaje !== null) {
      return mensaje as Record<string, string>;
    }
    return null;
  }
}