const WS = (() => {
    let socket = null;
    let reconectandoTimeout = null;
    const handlers = {};
  
    function conectar() {
      socket = new WebSocket(`ws://${location.host}/ws`);
  
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
      const handler = handlers[data.tipo];
      if (handler) handler(data);
    }
  
    function on(tipo, callback) {
      handlers[tipo] = callback;
    }
  
    return { conectar, on };
  })();