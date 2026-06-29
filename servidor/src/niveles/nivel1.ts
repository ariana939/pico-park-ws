import Matter from "matter-js";
import { NivelBase, type BroadcastFn } from "./nivelBase";
import { crearLimitesBase, ANCHO_MUNDO, ALTO_MUNDO } from "../fisica/mundoFisico";
import { Llave } from "../entidades/Llave";
import { Puerta } from "../entidades/Puerta";
import { Jugador, VELOCIDAD_JUGADOR } from "../entidades/Jugador";

// ── Coordenadas del mapa ───────────────────────────────────────────────────────

const SPAWN_X_BASE  = 80;
const SPAWN_Y       = ALTO_MUNDO - 80;

// Hoyo chico (se puede saltar solo)
const HOYO_CHICO_X_INICIO = 280;
const HOYO_CHICO_X_FIN    = 360;

// Gradita: 3 escalones
const ESCALON_ANCHO  = 80;
const ESCALON_ALTO   = 24;
const ESCALON_BASE_X = 400;
const ESCALON_BASE_Y = ALTO_MUNDO - 40;
const ESCALONES = [
  { x: ESCALON_BASE_X,                     y: ESCALON_BASE_Y - ESCALON_ALTO },
  { x: ESCALON_BASE_X + ESCALON_ANCHO,     y: ESCALON_BASE_Y - ESCALON_ALTO * 2 },
  { x: ESCALON_BASE_X + ESCALON_ANCHO * 2, y: ESCALON_BASE_Y - ESCALON_ALTO * 3 },
];

// Hoyo grande (necesitan apilarse para cruzar)
const HOYO_GRANDE_X_INICIO = 680;
const HOYO_GRANDE_X_FIN    = 900;

// Plataforma flotante con la llave (sobre el hoyo grande)
const PLATAFORMA_FLOTANTE_X     = (HOYO_GRANDE_X_INICIO + HOYO_GRANDE_X_FIN) / 2;
const PLATAFORMA_FLOTANTE_Y     = ALTO_MUNDO - 280;
const PLATAFORMA_FLOTANTE_ANCHO = 120;

// Llave: encima de la plataforma flotante
const LLAVE_X = PLATAFORMA_FLOTANTE_X;
const LLAVE_Y = PLATAFORMA_FLOTANTE_Y - 30;

// Botón: en el suelo derecho, cerca del hoyo grande
const BOTON_X = HOYO_GRANDE_X_FIN + 60;
const BOTON_Y = ALTO_MUNDO - 40;

// Piso puente que tapa el hoyo grande al activar el botón
const PISO_PUENTE_X     = (HOYO_GRANDE_X_INICIO + HOYO_GRANDE_X_FIN) / 2;
const PISO_PUENTE_Y     = ALTO_MUNDO - 20;
const PISO_PUENTE_ANCHO = HOYO_GRANDE_X_FIN - HOYO_GRANDE_X_INICIO;

// Puerta: al final a la derecha
const PUERTA_X = ANCHO_MUNDO - 60;
const PUERTA_Y = ALTO_MUNDO - 100;

// Boost de velocidad para el jugador con llave
const BOOST_VELOCIDAD_LLAVE = VELOCIDAD_JUGADOR * 1.6;

export class Nivel1 extends NivelBase {
  private pisoPuente:    Matter.Body | null = null;
  private botonSensor:   Matter.Body | null = null;
  private botonActivado: boolean = false;

  constructor(broadcast: BroadcastFn) {
    super(broadcast);
  }

  // ── Implementaciones obligatorias ─────────────────────────────────────────

  protected configurarMundo(): void {
    this.crearSuelo();
    this.crearGradita();
    this.crearPlataformaFlotante();
    this.crearBoton();

    this.llave  = new Llave(this.world, LLAVE_X, LLAVE_Y);
    this.puerta = new Puerta(this.world, PUERTA_X, PUERTA_Y);
  }

  protected tickEspecifico(): void {
    // Boost horizontal para el jugador con llave
    for (const jugador of this.jugadores.values()) {
      if (jugador.tieneLlave) {
        this.aplicarBoostLlave(jugador);
      }
    }
  }

  protected spawnJugador(indice: number): { x: number; y: number } {
    return {
      x: SPAWN_X_BASE + indice * 55,
      y: SPAWN_Y,
    };
  }

  protected serializarExtra(): object {
    return {
      nivel: 1,
      mapa: {
        anchoMundo:          ANCHO_MUNDO,
        altoMundo:           ALTO_MUNDO,
        huecoChicoXInicio:   HOYO_CHICO_X_INICIO,
        huecoChicoXFin:      HOYO_CHICO_X_FIN,
        escalones:           ESCALONES,
        huecoGrandeXInicio:  HOYO_GRANDE_X_INICIO,
        huecoGrandeXFin:     HOYO_GRANDE_X_FIN,
        plataformaX:         PLATAFORMA_FLOTANTE_X,
        plataformaY:         PLATAFORMA_FLOTANTE_Y,
        plataformaAncho:     PLATAFORMA_FLOTANTE_ANCHO,
        botonX:              BOTON_X,
        botonY:              BOTON_Y,
        botonActivado:       this.botonActivado,
        pisoPuenteVisible:   this.botonActivado,
        puertaX:             PUERTA_X,
        puertaY:             PUERTA_Y,
      },
    };
  }

  // Hook de colisiones extra (botón)
  protected override onColisionExtra(bodyA: Matter.Body, bodyB: Matter.Body): void {
    if (bodyA.label !== "boton") return;
    if (!bodyB.label.startsWith("jugador_")) return;

    const id      = bodyB.label.replace("jugador_", "");
    const jugador = this.jugadores.get(id);
    if (!jugador) return;

    if (jugador.tieneLlave) {
      this.activarBoton();
    }
  }

  // ── Construcción del mapa ─────────────────────────────────────────────────

  private crearSuelo(): void {
    const { Bodies, World } = Matter;

    const paredIzq = Bodies.rectangle(-20, ALTO_MUNDO / 2, 40, ALTO_MUNDO, { isStatic: true, label: "pared" });
    const paredDer = Bodies.rectangle(ANCHO_MUNDO + 20, ALTO_MUNDO / 2, 40, ALTO_MUNDO, { isStatic: true, label: "pared" });

    // Sección izquierda: desde 0 hasta hoyo chico
    const anchoIzq = HOYO_CHICO_X_INICIO;
    const sueloIzq = Bodies.rectangle(anchoIzq / 2, ALTO_MUNDO - 20, anchoIzq, 40, {
      isStatic: true, label: "suelo", friction: 0.8,
    });

    // Sección media: desde fin hoyo chico hasta inicio hoyo grande
    const anchoMed = HOYO_GRANDE_X_INICIO - HOYO_CHICO_X_FIN;
    const sueloMed = Bodies.rectangle(
      HOYO_CHICO_X_FIN + anchoMed / 2, ALTO_MUNDO - 20, anchoMed, 40,
      { isStatic: true, label: "suelo", friction: 0.8 }
    );

    // Sección derecha: desde fin hoyo grande hasta el borde
    const anchoDer = ANCHO_MUNDO - HOYO_GRANDE_X_FIN;
    const sueloDer = Bodies.rectangle(
      HOYO_GRANDE_X_FIN + anchoDer / 2, ALTO_MUNDO - 20, anchoDer, 40,
      { isStatic: true, label: "suelo", friction: 0.8 }
    );

    World.add(this.world, [paredIzq, paredDer, sueloIzq, sueloMed, sueloDer]);
  }

  private crearGradita(): void {
    for (const esc of ESCALONES) {
      const escalon = Matter.Bodies.rectangle(
        esc.x + ESCALON_ANCHO / 2,
        esc.y + ESCALON_ALTO / 2,
        ESCALON_ANCHO,
        ESCALON_ALTO,
        { isStatic: true, label: "suelo", friction: 0.8 }
      );
      Matter.World.add(this.world, escalon);
    }
  }

  private crearPlataformaFlotante(): void {
    const plataforma = Matter.Bodies.rectangle(
      PLATAFORMA_FLOTANTE_X,
      PLATAFORMA_FLOTANTE_Y,
      PLATAFORMA_FLOTANTE_ANCHO,
      20,
      { isStatic: true, label: "plataforma", friction: 0.8 }
    );
    Matter.World.add(this.world, plataforma);
  }

  private crearBoton(): void {
    this.botonSensor = Matter.Bodies.rectangle(BOTON_X, BOTON_Y, 50, 20, {
      isStatic: true,
      isSensor: true,
      label:    "boton",
    });
    Matter.World.add(this.world, this.botonSensor);
  }

  // ── Lógica del botón ──────────────────────────────────────────────────────

  private activarBoton(): void {
    if (this.botonActivado) return;
    this.botonActivado = true;

    this.pisoPuente = Matter.Bodies.rectangle(
      PISO_PUENTE_X, PISO_PUENTE_Y, PISO_PUENTE_ANCHO, 40,
      { isStatic: true, label: "suelo", friction: 0.8 }
    );
    Matter.World.add(this.world, this.pisoPuente);

    this.broadcast({ tipo: "boton_activado" });
    console.log("[Nivel 1] ¡Botón activado! Piso puente apareció.");
  }

  // ── Boost para el jugador con llave ───────────────────────────────────────

  private aplicarBoostLlave(jugador: Jugador): void {
    const { x: vx, y: vy } = jugador.cuerpo.velocity;

    if (jugador.inputs.derecha && vx < BOOST_VELOCIDAD_LLAVE) {
      Matter.Body.setVelocity(jugador.cuerpo, { x: BOOST_VELOCIDAD_LLAVE, y: vy });
    } else if (jugador.inputs.izquierda && vx > -BOOST_VELOCIDAD_LLAVE) {
      Matter.Body.setVelocity(jugador.cuerpo, { x: -BOOST_VELOCIDAD_LLAVE, y: vy });
    }
  }
}