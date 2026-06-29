import Matter from "matter-js";

export const TAMANO_JUGADOR      = 40;
export const VELOCIDAD_JUGADOR   = 3;
export const FUERZA_SALTO        = -12;
export const COLORES_JUGADORES   = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

export interface InputsJugador {
  izquierda: boolean;
  derecha:   boolean;
  salto:     boolean;
}

export interface DatosJugador {
  id:        string;
  color:     string;
  indice:    number;
  x:         number;
  y:         number;
  tieneLlave: boolean;
  enSuelo:   boolean;
}

export class Jugador {
  readonly id:     string;
  readonly color:  string;
  readonly indice: number;
  readonly cuerpo: Matter.Body;

  enSuelo:    boolean = false;
  tieneLlave: boolean = false;

  inputs: InputsJugador = {
    izquierda: false,
    derecha:   false,
    salto:     false,
  };

  constructor(id: string, indice: number, spawnX: number, spawnY: number) {
    this.id     = id;
    this.indice = indice;
    this.color  = COLORES_JUGADORES[indice % COLORES_JUGADORES.length]!;

    this.cuerpo = Matter.Bodies.rectangle(spawnX, spawnY, TAMANO_JUGADOR, TAMANO_JUGADOR, {
      label:           `jugador_${id}`,
      friction:        0.8,
      frictionAir:     0.02,
      restitution:     0,
      mass:            1,
      inertia:         Infinity,
      inverseInertia:  0,
    });
  }

  aplicarMovimiento(): void {
    const { x: vx, y: vy } = this.cuerpo.velocity;

    if (this.inputs.izquierda && vx > -VELOCIDAD_JUGADOR) {
      Matter.Body.setVelocity(this.cuerpo, { x: -VELOCIDAD_JUGADOR, y: vy });
    } else if (this.inputs.derecha && vx < VELOCIDAD_JUGADOR) {
      Matter.Body.setVelocity(this.cuerpo, { x: VELOCIDAD_JUGADOR, y: vy });
    } else if (!this.inputs.izquierda && !this.inputs.derecha) {
      Matter.Body.setVelocity(this.cuerpo, { x: vx * 0.8, y: vy });
    }
  }

  intentarSalto(): boolean {
    if (!this.inputs.salto || !this.enSuelo) return false;

    Matter.Body.setVelocity(this.cuerpo, {
      x: this.cuerpo.velocity.x,
      y: FUERZA_SALTO,
    });
    this.enSuelo       = false;
    this.inputs.salto  = false;
    return true;
  }

  procesarInput(tipo: string, estado: string, direccion?: string): void {
    const presionado = estado === "keydown";

    if (tipo === "movimiento") {
      if (direccion === "izquierda") this.inputs.izquierda = presionado;
      if (direccion === "derecha")   this.inputs.derecha   = presionado;
    }

    if (tipo === "salto") {
      this.inputs.salto = presionado;
    }
  }

  teleportarA(x: number, y: number): void {
    Matter.Body.setPosition(this.cuerpo, { x, y });
    Matter.Body.setVelocity(this.cuerpo, { x: 0, y: 0 });
  }

  serializar(): DatosJugador {
    return {
      id:         this.id,
      color:      this.color,
      indice:     this.indice,
      x:          Math.round(this.cuerpo.position.x),
      y:          Math.round(this.cuerpo.position.y),
      tieneLlave: this.tieneLlave,
      enSuelo:    this.enSuelo,
    };
  }
}