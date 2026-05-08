import Elysia from "elysia";

export const app = new Elysia();

app.ws("/ws" , {
 message(ws, mensaje){
    ws.send(mensaje);   
 },
});

export default app;