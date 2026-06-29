import { WebSocketServidor } from "../servidor/src/red/webSocketServidor";
import { Nivel2 } from "../servidor/src/niveles/nivel2";

const PUERTO = 3000;

// 1. Crear el servidor de red
const servidor = new WebSocketServidor();

// 2. Crear el nivel con la función de broadcast del servidor
const nivel2 = new Nivel2((datos) => servidor.broadcast(datos));

nivel2.inicializar();

// 3. Conectar el nivel al servidor y arrancar el game loop
servidor.setNivel(nivel2);
nivel2.iniciar();

// 4. Escuchar conexiones
servidor.escuchar(PUERTO);