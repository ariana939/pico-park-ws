const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const servidor = http.createServer(app);

const io = new Server(servidor, {
    cors: {
      origin: "*",//permite a celulares en la misma red
    },
});

const PORT = 3000;

const jugadores = new Map();
const jugadoresMaximos = 4;

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  if (jugadores.size >= jugadoresMaximos) {
    socket.emit("server_full", {
      message: "El servidor está lleno. Intenta nuevamente más tarde.",
    });

    console.log("Jugador rechazado por sala llena:", socket.id);
    socket.disconnect();
    return;
  }


  jugadores.set(socket.id, true);

  console.log("Jugador conectado:", socket.id);
  console.log("Jugadores conectados:", jugadores.size);


  socket.emit("welcome", {
    id: socket.id,
    message: "Conectado exitosamente",
  });


  socket.on("input", (data) => {
    console.log("input:", socket.id, data);
    io.emit("accion_Del_Jugador", {
      playerId: socket.id,
      ...data,
    });
  });


  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
    jugadores.delete(socket.id);
    console.log("Jugadores conectados:", jugadores.size);
  }); 
});


servidor.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});