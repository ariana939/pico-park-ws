import Matter from "matter-js";
import { Jugador } from "./Jugador";

export interface DatosLlave {
  x:          number;
  y:          number;
  portadorId: string | null;
}

export class Llave {
  private spawnX:    number;
  private spawnY:    number;
  private cuerpo:    Matter.Body;
  private portador:  Jugador | null = null;

  constructor(world: Matter.World, spawnX: number, spawnY: number) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;

    this.cuerpo = Matter.Bodies.circle(spawnX, spawnY, 15, {
      isStatic: true,
      isSensor: true,
      label:    "llave",
    });

    Matter.World.add(world, this.cuerpo);
  }

  get tienePortador(): boolean {
    return this.portador !== null;
  }

  get portadorId(): string | null {
    return this.portador?.id ?? null;
  }

  intentarRecoger(jugador: Jugador): boolean {
    if (this.portador !== null) return false;

    this.portador       = jugador;
    jugador.tieneLlave  = true;
    return true;
  }

  intentarTransferir(jugadorQueContacta: Jugador): boolean {
    if (!this.portador || jugadorQueContacta.tieneLlave) return false;

    this.portador.tieneLlave      = false;
    jugadorQueContacta.tieneLlave = true;
    this.portador                 = jugadorQueContacta;
    return true;
  }

  respawnear(): void {
    if (this.portador) {
      this.portador.tieneLlave = false;
      this.portador            = null;
    }
    Matter.Body.setPosition(this.cuerpo, { x: this.spawnX, y: this.spawnY });
  }

  seguirPortador(): void {
    if (!this.portador) return;

    Matter.Body.setPosition(this.cuerpo, {
      x: this.portador.cuerpo.position.x,
      y: this.portador.cuerpo.position.y - 30,
    });
  }

  serializar(): DatosLlave {
    return {
      x:          Math.round(this.cuerpo.position.x),
      y:          Math.round(this.cuerpo.position.y),
      portadorId: this.portadorId,
    };
  }
}