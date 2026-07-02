import { NivelBase, type BroadcastFn } from "./nivelBase";
import { crearLimitesBase, ANCHO_MUNDO, ALTO_MUNDO } from "../fisica/mundoFisico";
import { Caja } from "../entidades/Caja";
import { Llave } from "../entidades/Llave";
import { Puerta } from "../entidades/Puerta";
import Matter from "matter-js";

const SPAWN_X_BASE   = 80;
const SPAWN_Y        = ALTO_MUNDO - 120;
const HUECO_X_INICIO = 600;
const HUECO_X_FIN    = 700;
const PLATAFORMA_X   = 820;
const PLATAFORMA_Y   = ALTO_MUNDO - 250;
const CAJA_SPAWN_X   = 200;
const CAJA_SPAWN_Y   = ALTO_MUNDO - 120;
const LLAVE_SPAWN_X  = PLATAFORMA_X;
const LLAVE_SPAWN_Y  = PLATAFORMA_Y - 40;
const PUERTA_X       = ANCHO_MUNDO - 60;
const PUERTA_Y       = ALTO_MUNDO - 100;

export class Nivel2 extends NivelBase {
  private caja!: Caja;

  constructor(broadcast: BroadcastFn) {
    super(broadcast);
  }

  protected configurarMundo(): void {
    crearLimitesBase(this.world, HUECO_X_INICIO, HUECO_X_FIN);
    this.crearPlataforma();

    this.caja   = new Caja(this.world, CAJA_SPAWN_X, CAJA_SPAWN_Y);
    this.llave  = new Llave(this.world, LLAVE_SPAWN_X, LLAVE_SPAWN_Y);
    this.puerta = new Puerta(this.world, PUERTA_X, PUERTA_Y);
  }

  protected tickEspecifico(): void {
    this.caja.aplicarFuerzaDeJugadores([...this.jugadores.values()]);
  }

  protected spawnJugador(indice: number): { x: number; y: number } {
    return {
      x: SPAWN_X_BASE + indice * 55,
      y: SPAWN_Y,
    };
  }

  protected serializarExtra(): object {
    return {
      nivel: 2,
      caja:  this.caja.serializar(),
      mapa: {
        anchoMundo:   ANCHO_MUNDO,
        altoMundo:    ALTO_MUNDO,
        huecoXInicio: HUECO_X_INICIO,
        huecoXFin:    HUECO_X_FIN,
        plataformaX:  PLATAFORMA_X,
        plataformaY:  PLATAFORMA_Y,
        puertaX:      PUERTA_X,
        puertaY:      PUERTA_Y,
      },
    };
  }

  protected override onColisionExtra(bodyA: Matter.Body, bodyB: Matter.Body): void {
    this.actualizarContactoCaja(bodyA, bodyB, true);
    this.actualizarContactoCaja(bodyB, bodyA, true);
  }

  protected override onColisionExtraFin(bodyA: Matter.Body, bodyB: Matter.Body): void {
    this.actualizarContactoCaja(bodyA, bodyB, false);
    this.actualizarContactoCaja(bodyB, bodyA, false);
  }

  private actualizarContactoCaja(cuerpoA: Matter.Body, cuerpoB: Matter.Body, iniciando: boolean): void {
    if (cuerpoA.label !== "caja") return;
    if (!cuerpoB.label.startsWith("jugador_")) return;

    const jugadorId = cuerpoB.label.replace("jugador_", "");
    if (iniciando) {
      this.caja.registrarContacto(jugadorId);
    } else {
      this.caja.quitarContacto(jugadorId);
    }
  }

  private crearPlataforma(): void {
    const plataforma = Matter.Bodies.rectangle(
      PLATAFORMA_X, PLATAFORMA_Y, 200, 20,
      { isStatic: true, label: "plataforma", friction: 0.8 }
    );
    Matter.World.add(this.world, plataforma);
  }
}