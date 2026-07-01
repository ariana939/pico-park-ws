import Matter from "matter-js";
import { crearEngine, tickFisico, MS_POR_TICK, ALTO_MUNDO } from "../fisica/mundoFisico";
import { Jugador, COLORES_JUGADORES } from "../entidades/Jugador";
import { Llave } from "../entidades/Llave";
import { Puerta } from "../entidades/Puerta";

export type BroadcastFn = (datos: object) => void;

export abstract class NivelBase {
  protected engine:    Matter.Engine;
  protected world:     Matter.World;
  protected jugadores: Map<string, Jugador> = new Map();
  protected llave!:    Llave;
  protected puerta!:   Puerta;
  protected ganado:    boolean = false;

  private intervalo:   ReturnType<typeof setInterval> | null = null;
  private broadcast:   BroadcastFn;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
    this.engine    = crearEngine();
    this.world     = this.engine.world;
  }

  inicializar(): void {
    this.configurarMundo();
    this.registrarColisiones();
  }
  
  protected abstract configurarMundo(): void;

  protected abstract tickEspecifico(): void;

  protected abstract serializarExtra(): object;

  protected abstract spawnJugador(indice: number): { x: number; y: number };

  protected onColisionExtra(_bodyA: Matter.Body, _bodyB: Matter.Body): void {}

  agregarJugador(id: string): Jugador {
    const indice  = this.jugadores.size;
    const spawn   = this.spawnJugador(indice);
    const jugador = new Jugador(id, indice, spawn.x, spawn.y);

    Matter.World.add(this.world, jugador.cuerpo);
    this.jugadores.set(id, jugador);
    return jugador;
  }

  limpiarJugadores(): void {
    for (const jugador of this.jugadores.values()) {
      Matter.World.remove(this.world, jugador.cuerpo);
    }
    this.jugadores.clear();
    this.ganado = false;
  }

  eliminarJugador(id: string): void {
    const jugador = this.jugadores.get(id);
    if (!jugador) return;

    if (jugador.tieneLlave) {
      this.llave.respawnear();
      this.puerta.cerrar();
    }

    this.puerta.registrarSalida(id);
    Matter.World.remove(this.world, jugador.cuerpo);
    this.jugadores.delete(id);
  }

  procesarInput(id: string, tipo: string, estado: string, direccion?: string): void {
    this.jugadores.get(id)?.procesarInput(tipo, estado, direccion);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  iniciar(): void {
    this.intervalo = setInterval(() => {
      this.tick();
    }, MS_POR_TICK);
  }

  detener(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }

  private tick(): void {
    this.actualizarEnSuelo();
    this.aplicarMovimientosJugadores();
    this.tickEspecifico();
    tickFisico(this.engine);
    this.llave.seguirPortador();
    this.detectarCaidas();
    this.broadcast(this.serializar());
  }

  private aplicarMovimientosJugadores(): void {
    for (const jugador of this.jugadores.values()) {
      jugador.aplicarMovimiento();
      jugador.intentarSalto();
    }
  }

  private actualizarEnSuelo(): void {
    // Resetear cada tick
    for (const jugador of this.jugadores.values()) {
      jugador.enSuelo = false;
    }

    const labelsSuelo = ["suelo", "plataforma", "caja"];

    for (const par of this.engine.pairs.list as any[]) {
      if (!par.isActive) continue;

      const { bodyA, bodyB } = par;
      this.marcarEnSuelo(bodyA, bodyB, labelsSuelo);
      this.marcarEnSuelo(bodyB, bodyA, labelsSuelo);
    }
  }

  private marcarEnSuelo(soporte: Matter.Body, candidato: Matter.Body, labels: string[]): void {
    // Superficies válidas: suelo/plataforma/caja Y otros jugadores
    const esSoporte = labels.includes(soporte.label) || soporte.label.startsWith("jugador_");
    if (!esSoporte) return;
    if (!candidato.label.startsWith("jugador_")) return;

    // Evitar que un jugador se marque a sí mismo
    if (soporte.label === candidato.label) return;

    // Solo marcar en suelo si el soporte está realmente debajo
    if (soporte.position.y <= candidato.position.y) return;

    const id      = candidato.label.replace("jugador_", "");
    const jugador = this.jugadores.get(id);
    if (jugador) jugador.enSuelo = true;
  }

  // ── Colisiones ─────────────────────────────────────────────────────────────

  private registrarColisiones(): void {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const par of event.pairs) {
        this.manejarColision(par.bodyA, par.bodyB);
        this.manejarColision(par.bodyB, par.bodyA);
      }
    });
  }

  private manejarColision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    if (!bodyB.label.startsWith("jugador_")) return;

    const id      = bodyB.label.replace("jugador_", "");
    const jugador = this.jugadores.get(id);
    if (!jugador) return;

    if (bodyA.label === "llave") {
      this.onJugadorTocaLlave(jugador);
    }

    if (bodyA.label.startsWith("jugador_")) {
      const otroId  = bodyA.label.replace("jugador_", "");
      const otro    = this.jugadores.get(otroId);
      if (otro) this.onJugadoresSeTocaron(jugador, otro);
    }

    if (bodyA.label === "puerta") {
      this.onJugadorTocaPuerta(jugador);
    }

    this.onColisionExtra(bodyA, bodyB);
  }

  private onJugadorTocaLlave(jugador: Jugador): void {
    const recogida = this.llave.intentarRecoger(jugador);
    if (recogida) {
      this.broadcast({ tipo: "llave_recogida", jugadorId: jugador.id });
    }
  }

  private onJugadoresSeTocaron(jugador: Jugador, otro: Jugador): void {
    const transferida = this.llave.intentarTransferir(jugador);
    if (transferida) {
      this.broadcast({ tipo: "llave_transferida", de: otro.id, a: jugador.id });
    }
  }

  private onJugadorTocaPuerta(jugador: Jugador): void {
    if (jugador.tieneLlave) {
      this.puerta.abrir();
      this.broadcast({ tipo: "puerta_abierta" });
    }

    if (this.puerta.estaAbierta) {
      this.puerta.registrarEntrada(jugador.id);
      this.verificarVictoria();
    }
  }

  private verificarVictoria(): void {
    if (!this.puerta.todosPassaron(this.jugadores.size)) return;

    this.ganado = true;
    this.broadcast({ tipo: "nivel_ganado" });
    this.detener();
  }

  private detectarCaidas(): void {
    for (const jugador of this.jugadores.values()) {
      if (jugador.cuerpo.position.y > ALTO_MUNDO + 100) {
        this.respawnJugador(jugador);
      }
    }
  }

  protected respawnJugador(jugador: Jugador): void {
    const spawn = this.spawnJugador(jugador.indice);
    jugador.teleportarA(spawn.x, spawn.y);

    if (jugador.tieneLlave) {
      this.llave.respawnear();
      this.puerta.cerrar();
      this.broadcast({ tipo: "llave_respawn" });
    }

    this.puerta.registrarSalida(jugador.id);
    this.broadcast({ tipo: "jugador_respawn", jugadorId: jugador.id });
  }

  private serializar(): object {
    return {
      tipo:      "estado_juego",
      jugadores: [...this.jugadores.values()].map((j) => j.serializar()),
      llave:     this.llave.serializar(),
      puerta:    this.puerta.serializar(this.jugadores.size),
      ganado:    this.ganado,
      ...this.serializarExtra(),
    };
  }
}