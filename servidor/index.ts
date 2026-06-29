import { WebSocketServidor } from "../servidor/src/red/webSocketServidor";
import { Nivel1 } from "../servidor/src/niveles/nivel1"; 
import { Nivel2 } from "../servidor/src/niveles/nivel2";

const PUERTO = 3000;

// 1. Crear el servidor de red
const servidor = new WebSocketServidor();

// 2. Crear el nivel con la función de broadcast del servidor
const nivel1 = new Nivel1((datos) => servidor.broadcast(datos));
const nivel2 = new Nivel2((datos) => servidor.broadcast(datos));

nivel1.inicializar();
nivel2.inicializar();

// 3. Conectar el nivel al servidor y arrancar el game loop
servidor.setNivel(nivel1);
nivel1.iniciar();

// 4. Escuchar conexiones
servidor.escuchar(PUERTO);