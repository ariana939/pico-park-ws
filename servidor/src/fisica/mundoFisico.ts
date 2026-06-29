import Matter from "matter-js";

export const ANCHO_MUNDO = 1280;
export const ALTO_MUNDO  = 720;
export const FPS         = 30;
export const MS_POR_TICK = 1000 / FPS;

export function crearEngine(): Matter.Engine {
  return Matter.Engine.create({
    gravity: { x: 0, y: 2 },
  });
}

export function tickFisico(engine: Matter.Engine): void {
  Matter.Engine.update(engine, MS_POR_TICK);
}

export function crearLimitesBase(
  world: Matter.World,
  huecoXInicio?: number,
  huecoXFin?: number
): Matter.Body[] {
  const { Bodies, World } = Matter;

  const paredIzq = Bodies.rectangle(-20, ALTO_MUNDO / 2, 40, ALTO_MUNDO, {
    isStatic: true,
    label: "pared",
  });

  const paredDer = Bodies.rectangle(ANCHO_MUNDO + 20, ALTO_MUNDO / 2, 40, ALTO_MUNDO, {
    isStatic: true,
    label: "pared",
  });

  const cuerpos: Matter.Body[] = [paredIzq, paredDer];

  if (huecoXInicio !== undefined && huecoXFin !== undefined) {
    // Suelo dividido en dos secciones con hueco en el medio
    const anchoIzq = huecoXInicio;
    const sueloIzq = Bodies.rectangle(anchoIzq / 2, ALTO_MUNDO - 20, anchoIzq, 40, {
      isStatic: true,
      label: "suelo",
      friction: 0.8,
    });

    const anchoDer = ANCHO_MUNDO - huecoXFin;
    const sueloDer = Bodies.rectangle(
      huecoXFin + anchoDer / 2,
      ALTO_MUNDO - 20,
      anchoDer,
      40,
      { isStatic: true, label: "suelo", friction: 0.8 }
    );

    cuerpos.push(sueloIzq, sueloDer);
  } else {
    // Suelo completo sin hueco
    const suelo = Bodies.rectangle(ANCHO_MUNDO / 2, ALTO_MUNDO - 20, ANCHO_MUNDO, 40, {
      isStatic: true,
      label: "suelo",
      friction: 0.8,
    });
    cuerpos.push(suelo);
  }

  World.add(world, cuerpos);
  return cuerpos;
}