import Matter from "matter-js";
import { Jugador } from "./Jugador";

const FUERZA_POR_JUGADOR = 0.005;

export interface DatosCaja {
  x:      number;
  y:      number;
  angulo: number;
}

export class Caja {
  readonly cuerpo: Matter.Body;
  private spawnX:  number;
  private spawnY:  number;

  private jugadoresTocando: Set<string> = new Set();

  constructor(world: Matter.World, spawnX: number, spawnY: number) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;

    this.cuerpo = Matter.Bodies.rectangle(spawnX, spawnY, 80, 80, {
      label:       "caja",
      mass:        5,
      friction:    0.8,
      frictionAir: 0.05,
      restitution: 0.1,
    });

    Matter.World.add(world, this.cuerpo);
  }

  registrarContacto(jugadorId: string): void {
    this.jugadoresTocando.add(jugadorId);
  }

  quitarContacto(jugadorId: string): void {
    this.jugadoresTocando.delete(jugadorId);
  }

  aplicarFuerzaDeJugadores(jugadores: Jugador[]): void {
    let jugadoresDer = 0;
    let jugadoresIzq = 0;

    for (const jugador of jugadores) {
      if (!this.jugadoresTocando.has(jugador.id)) continue;

      const distX = jugador.cuerpo.position.x - this.cuerpo.position.x;

      if (jugador.inputs.derecha  && distX < 0) jugadoresDer++;
      if (jugador.inputs.izquierda && distX > 0) jugadoresIzq++;
    }

    const fuerzaNeta = (jugadoresDer - jugadoresIzq) * FUERZA_POR_JUGADOR;
    if (fuerzaNeta === 0) return;

    Matter.Body.applyForce(this.cuerpo, this.cuerpo.position, { x: fuerzaNeta, y: 0 });
  }

  respawnear(): void {
    Matter.Body.setPosition(this.cuerpo, { x: this.spawnX, y: this.spawnY });
    Matter.Body.setVelocity(this.cuerpo, { x: 0, y: 0 });
    Matter.Body.setAngle(this.cuerpo, 0);
    this.jugadoresTocando.clear();
  }

  serializar(): DatosCaja {
    return {
      x:      Math.round(this.cuerpo.position.x),
      y:      Math.round(this.cuerpo.position.y),
      angulo: this.cuerpo.angle,
    };
  }
}