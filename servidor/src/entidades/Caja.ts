import Matter from "matter-js";
import { Jugador } from "./Jugador";

const FUERZA_POR_JUGADOR = 0.005;
const RANGO_CONTACTO_X   = 55;   // distancia horizontal para considerar que empuja
const RANGO_CONTACTO_Y   = 80;   // distancia vertical para considerar que empuja

export interface DatosCaja {
  x:      number;
  y:      number;
  angulo: number;
}

export class Caja {
  readonly cuerpo: Matter.Body;
  private spawnX:  number;
  private spawnY:  number;

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

  aplicarFuerzaDeJugadores(jugadores: Jugador[]): void {
    const cajaPos = this.cuerpo.position;
    let jugadoresDer = 0;
    let jugadoresIzq = 0;

    for (const jugador of jugadores) {
      const jugadorPos = jugador.cuerpo.position;
      const distX      = jugadorPos.x - cajaPos.x;
      const distY      = Math.abs(jugadorPos.y - cajaPos.y);

      if (distY > RANGO_CONTACTO_Y) continue; // no está cerca verticalmente

      const empujandoDer = jugador.inputs.derecha  && distX < -RANGO_CONTACTO_X;
      const empujandoIzq = jugador.inputs.izquierda && distX > RANGO_CONTACTO_X;

      if (empujandoDer) jugadoresDer++;
      if (empujandoIzq) jugadoresIzq++;
    }

    const fuerzaNeta = (jugadoresDer - jugadoresIzq) * FUERZA_POR_JUGADOR;
    if (fuerzaNeta === 0) return;

    Matter.Body.applyForce(this.cuerpo, cajaPos, { x: fuerzaNeta, y: 0 });
  }

  respawnear(): void {
    Matter.Body.setPosition(this.cuerpo, { x: this.spawnX, y: this.spawnY });
    Matter.Body.setVelocity(this.cuerpo, { x: 0, y: 0 });
    Matter.Body.setAngle(this.cuerpo, 0);
  }

  serializar(): DatosCaja {
    return {
      x:      Math.round(this.cuerpo.position.x),
      y:      Math.round(this.cuerpo.position.y),
      angulo: this.cuerpo.angle,
    };
  }
}