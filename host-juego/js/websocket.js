const WS = (() => {
  let socket = null;
  let reconectandoTimeout = null;
  const handlers = {};

  function conectar() {
    socket = new WebSocket(`ws://${location.host}/ws?tipo=display`);

    socket.onopen = () => {
      UI.setEstadoConexion(true);
      if (reconectandoTimeout) clearTimeout(reconectandoTimeout);
    };

    socket.onclose = () => {
      UI.setEstadoConexion(false);
      reconectandoTimeout = setTimeout(conectar, 2000);
    };

    socket.onerror = () => socket.close();

    socket.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      despachar(data);
    };
  }

  function despachar(data) {
    console.log('[WS] Mensaje recibido:', data);
    const handler = handlers[data.tipo];
    if (handler) handler(data);
    else console.log('[WS] No hay handler registrado para el tipo:', data.tipo);
  }

  function on(tipo, callback) {
    handlers[tipo] = callback;
  }

  function enviar(datos) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(datos));
    }
  }

  return { conectar, on, enviar };
})();
