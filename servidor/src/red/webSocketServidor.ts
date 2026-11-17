import Elysia from "elysia";
import { node } from "@elysiajs/node";
import os from "os";
import fs from "node:fs";
import crypto from "node:crypto";
import { NivelBase } from "../niveles/nivelBase.ts";

const MAX_JUGADORES   = 4;
const COLORES_SIDEBAR = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

const TIPOS_VALIDOS       = new Set(["movimiento", "salto"]);
const ESTADOS_VALIDOS     = new Set(["keydown", "keyup"]);
const DIRECCIONES_VALIDAS = new Set(["izquierda", "derecha", "arriba", "abajo"]);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
};

function servirArchivo(rutaRelativa: string): Response {
  const buffer = fs.readFileSync(rutaRelativa);
  const ext = rutaRelativa.slice(rutaRelativa.lastIndexOf("."));
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  return new Response(buffer, { headers: { "Content-Type": contentType } });
}

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
  private wsIds:      WeakMap<object, string>    = new WeakMap();

  constructor() {
    this.app = new Elysia({ adapter: node() });
    this.configurarRutas();
    this.configurarWebSocket();
    this.iniciarPing();
  }
  private iniciarPing(): void {
    setInterval(() => {
      for (const ws of this.conexiones.values()) {
	try { ws.send(JSON.stringify({ tipo: "ping" })); } catch (_) {}
      }
    }, 15000);
  }
  // ── API pública ────────────────────────────────────────────────────────────

  setNiveles(niveles: Record<number, NivelBase>): void {
    this.niveles = niveles;
  }

  private idDe(ws: any): string {
  const clave = ws.raw ?? ws.data ?? ws;
  let id = this.wsIds.get(clave);
  if (!id) {
    id = crypto.randomUUID();
    this.wsIds.set(clave, id);
  }
  return id;
}


  private cambiarNivel(numero: number): void {
    if (this.nivel) {
      this.nivel.detener();
      this.nivel.limpiarJugadores();
    }

    const siguiente = this.niveles[numero];
    if (!siguiente) {
      console.log(`[NIVEL] Nivel ${numero} no existe`);
      return;
    }

    for (const [id] of this.sala) {
      siguiente.agregarJugador(id);
    }

    this.nivel = siguiente;
    this.nivel.iniciar();
    console.log(`[NIVEL] Iniciando Nivel ${numero} con ${this.sala.size} jugadores`);

    this.broadcast({ tipo: "nivel_iniciado", nivel: numero });
  }

  escuchar(puerto: number): void {
    this.app.listen({ hostname: "0.0.0.0", port: puerto });
  }

  broadcast(datos: object): void {
    console.log(`[BROADCAST] Enviando "${(datos as any).tipo}" a ${this.conexiones.size} conexión(es)`);
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

  // ── Rutas HTTP ─────────────────────────────────────────────────────────────

  private configurarRutas(): void {
    this.app.get("/", () => servirArchivo("../host-juego/index.html"));

    this.app.get("/estilos/*", ({ request }) => {
      const url = new URL(request.url);
      return servirArchivo(`../host-juego${url.pathname}`);
    });

    this.app.get("/js/*", ({ request }) => {
      const url = new URL(request.url);
      return servirArchivo(`../host-juego${url.pathname}`);
    });

    this.app.get("/ip", () => {
      const ip     = process.env.HOST_PUBLICO   ?? this.getLocalIP();
      const puerto = Number(process.env.PUERTO_PUBLICO ?? 3000);
      return { ip, puerto, url: `ws://${ip}:${puerto}/ws` };
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

  // ── WebSocket ──────────────────────────────────────────────────────────────

  private configurarWebSocket(): void {
    this.app.ws("/ws", {
      open:    (ws) => this.onConexion(ws),
      message: (ws, msg) => this.onMensaje(ws, msg),
      close:   (ws) => this.onDesconexion(ws),
    });
  }

  private onConexion(ws: any): void {
    const id = this.idDe(ws);

    const url       = new URL(ws.data.url, "http://localhost");
    const esDisplay = url.searchParams.get("tipo") === "display";

    this.conexiones.set(id, ws);

    if (esDisplay) {
      this.displays.add(id);
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

    this.sala.set(id, { indice, color, ws });

    console.log(`[+] Jugador ${indice + 1} conectado | Sala: ${this.sala.size}/${MAX_JUGADORES}`);

    ws.send(JSON.stringify({
      tipo:    "bienvenida",
      id,
      color,
      indice,
      mensaje: `Sos el Jugador ${indice + 1}`,
    }));

    this.broadcast({
      tipo:           "jugador_unido",
      id,
      color,
      indice,
      totalJugadores: this.sala.size,
    });
  }

  private onMensaje(ws: any, mensaje: unknown): void {
    const id = this.idDe(ws);

    if (this.displays.has(id)) {
      const data = this.parsearMensaje(mensaje);
      if (data?.tipo === "elegir_nivel") {
        this.cambiarNivel(Number(data.nivel));
      }
      return;
    }
    if (!this.sala.has(id)) return;

    const data = this.parsearMensaje(mensaje);
    if (!data) return;

    const { tipo, estado, direccion } = data;

    if (tipo === undefined || estado === undefined) return;

    if (!TIPOS_VALIDOS.has(tipo))     return;
    if (!ESTADOS_VALIDOS.has(estado)) return;
    if (tipo === "movimiento" && !DIRECCIONES_VALIDAS.has(direccion ?? "")) return;

    this.nivel?.procesarInput(id, tipo, estado, direccion);
  }

  private onDesconexion(ws: any): void {
    const id = this.idDe(ws);

    if (this.displays.has(id)) {
      this.displays.delete(id);
      this.conexiones.delete(id);
      console.log(`[DISPLAY] Host desconectado`);
      return;
    }

    if (!this.sala.has(id)) return;

    const { indice } = this.sala.get(id)!;
    this.sala.delete(id);
    this.conexiones.delete(id);

    this.nivel?.eliminarJugador(id);

    console.log(`[-] Jugador ${indice + 1} desconectado | Sala: ${this.sala.size}/${MAX_JUGADORES}`);

    this.broadcast({
      tipo:           "jugador_salio",
      id,
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
