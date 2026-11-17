import { WebSocketServidor } from "./src/red/webSocketServidor.ts";
import { Nivel1 } from "./src/niveles/nivel1.ts";
import { Nivel2 } from "./src/niveles/nivel2.ts";

const PUERTO = 3000;

const servidor = new WebSocketServidor();

// Crear e inicializar los niveles (configura el mundo físico de cada uno)
const nivel1 = new Nivel1((datos) => servidor.broadcast(datos));
const nivel2 = new Nivel2((datos) => servidor.broadcast(datos));
nivel1.inicializar();
nivel2.inicializar();

// El lobby elige cuál iniciar — el servidor cambia el nivel activo
servidor.setNiveles({ 1: nivel1, 2: nivel2 });

servidor.escuchar(PUERTO);
