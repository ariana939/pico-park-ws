import Matter from "matter-js";

export interface DatosPuerta {
  abierta:           boolean;
  jugadoresAdentro:  number;
  totalJugadores:    number;
}

export class Puerta {
  readonly x: number;
  readonly y: number;
  readonly sensor: Matter.Body;

  private abierta:          boolean      = false;
  private jugadoresAdentro: Set<string>  = new Set();

  constructor(world: Matter.World, x: number, y: number) {
    this.x = x;
    this.y = y;

    this.sensor = Matter.Bodies.rectangle(x, y, 60, 120, {
      isStatic: true,
      isSensor: true,
      label:    "puerta",
    });

    Matter.World.add(world, this.sensor);
  }

  get estaAbierta(): boolean {
    return this.abierta;
  }

  abrir(): void {
    this.abierta = true;
  }

  cerrar(): void {
    this.abierta = false;
    this.jugadoresAdentro.clear();
  }

  registrarEntrada(jugadorId: string): void {
    this.jugadoresAdentro.add(jugadorId);
  }

  registrarSalida(jugadorId: string): void {
    this.jugadoresAdentro.delete(jugadorId);
  }

  todosPassaron(totalJugadores: number): boolean {
    return this.abierta && this.jugadoresAdentro.size >= totalJugadores && totalJugadores > 0;
  }

  serializar(totalJugadores: number): DatosPuerta {
    return {
      abierta:          this.abierta,
      jugadoresAdentro: this.jugadoresAdentro.size,
      totalJugadores,
    };
  }
}