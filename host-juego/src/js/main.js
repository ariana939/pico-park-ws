const Pantallas = (() => {
    const ids = ['pantalla-espera', 'pantalla-lobby', 'pantalla-juego'];
  
    function ir(id) {
      for (const pantallaId of ids) {
        const el = document.getElementById(pantallaId);
        el.classList.toggle('activa', pantallaId === id);
      }
    }
  
    return { ir };
  })();
  
  let totalJugadores  = 0;
  let nivelSeleccionado = null;

  WS.on('jugador_unido', (data) => {
    totalJugadores = data.totalJugadores;

    UI.activarSlotEspera(data.id, data.color, data.indice);
    UI.activarSlotJuego(data.id, data.color, data.indice);
    UI.actualizarContador(totalJugadores);
    UI.actualizarBotonIniciar(totalJugadores);
  });
  
  WS.on('jugador_salio', (data) => {
    totalJugadores = data.totalJugadores;
  
    UI.desactivarSlotEspera(data.id);
    UI.desactivarSlotJuego(data.id);
  
    UI.actualizarContador(totalJugadores);
    UI.actualizarBotonIniciar(totalJugadores);
  });
  
  WS.on('estado_juego', (data) => {
    Renderer.setEstado(data);
    UI.actualizarLlaveEnSidebar(data.jugadores);
    if (data.ganado) UI.mostrarVictoria();
  });
  
  WS.on('nivel_ganado', () => {
    UI.mostrarVictoria();
  });
  
  document.getElementById('btn-iniciar').addEventListener('click', () => {
    if (totalJugadores < 3) return;
    Pantallas.ir('pantalla-lobby');
  });

  document.querySelectorAll('.nivel-card').forEach((card) => {
    card.addEventListener('click', () => {
      nivelSeleccionado = parseInt(card.dataset.nivel, 10);
      UI.setInfoNivel(nivelSeleccionado);
      UI.ocultarVictoria();
      Pantallas.ir('pantalla-juego');
    });
  });

  document.getElementById('btn-volver-lobby').addEventListener('click', () => {
    UI.ocultarVictoria();
    Pantallas.ir('pantalla-lobby');
  });
  
  UI.cargarIP();
  WS.conectar();
  Renderer.iniciarLoop();