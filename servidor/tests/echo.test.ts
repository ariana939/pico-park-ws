import { describe, test, expect, afterAll, beforeAll } from "bun:test";
import {app} from "../src/app/index";

describe('Dado un mensaje enviado por el cliente, la respuesta debe ser ese mismo mensaje', ()  => {
    beforeAll(() => {
        app.listen(3000);
    });

    test('El socket debe recibir el mismo mensaje que envio: hola bun', async () => {
        const ws = new WebSocket('ws://localhost:3000/ws');
        ws.onopen = () => {
            ws.send('hola bun');
        };

        const PosibleRespuesta = new Promise((resolver) => {
            ws.onmessage = (mensaje) => resolver(mensaje.data); 
        });

        expect(await PosibleRespuesta).toBe('hola bun');    

        ws.close();
    });
});