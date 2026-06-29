const UI = (() => {
    const jugadoresRegistrados = new Map();
  
    function setEstadoConexion(conectado) {
      const dot   = document.getElementById('ws-dot');
      const label = document.getElementById('ws-label');
      dot.className      = conectado ? 'conectado' : '';
      label.textContent  = conectado ? 'Conectado al servidor' : 'Reconectando...';
    }

    async function cargarIP() {
      try {
        const res  = await fetch('/ip');
        const data = await res.json();
        // Sala de espera
        document.getElementById('ip-display').textContent = `${data.ip}:${data.puerto}`;
      } catch {
        document.getElementById('ip-display').textContent = 'No disponible';
      }
    }

    function activarSlotEspera(id, color, indice) {
      jugadoresRegistrados.set(id, { indice, color });
  
      const slot = document.getElementById(`slot-${indice}`);
      if (!slot) return;
  
      slot.classList.add('conectado');
      slot.querySelector('.slot-dot').style.background   = color;
      slot.querySelector('.slot-nombre').textContent     = `Jugador ${indice + 1}`;
      slot.querySelector('.slot-nombre').style.color     = color;
    }
  
    function desactivarSlotEspera(id) {
      const datos = jugadoresRegistrados.get(id);
      if (!datos) return;
  
      const slot = document.getElementById(`slot-${datos.indice}`);
      if (!slot) return;
  
      slot.classList.remove('conectado');
      slot.querySelector('.slot-dot').style.background   = '#333';
      slot.querySelector('.slot-nombre').textContent     = 'Esperando...';
      slot.querySelector('.slot-nombre').style.color     = '';
    }

    function activarSlotJuego(id, color, indice) {
      const slot = document.getElementById(`pslot-${indice}`);
      if (!slot) return;
  
      slot.classList.add('conectado');
      slot.querySelector('.player-dot').style.background = color;
      slot.querySelector('.player-name').textContent     = `Jugador ${indice + 1}`;
      slot.querySelector('.player-name').style.color     = color;
    }
  
    function desactivarSlotJuego(id) {
      const datos = jugadoresRegistrados.get(id);
      if (!datos) return;
  
      const slot = document.getElementById(`pslot-${datos.indice}`);
      if (!slot) return;
  
      slot.classList.remove('conectado', 'tiene-llave');
      slot.querySelector('.player-dot').style.background = '#333';
      slot.querySelector('.player-name').textContent     = 'Esperando...';
      slot.querySelector('.player-name').style.color     = '';
  
      jugadoresRegistrados.delete(id);
    }
  
    function actualizarLlaveEnSidebar(jugadores) {
      if (!jugadores) return;
      for (const j of jugadores) {
        const datos = jugadoresRegistrados.get(j.id);
        if (!datos) continue;
        const slot = document.getElementById(`pslot-${datos.indice}`);
        if (slot) slot.classList.toggle('tiene-llave', j.tieneLlave);
      }
    }
  
    function actualizarContador(total) {
      const countEl = document.getElementById('count');
      if (countEl) countEl.textContent = total;
    }

    const INFO_NIVELES = {
      1: {
        titulo: '🎮 Nivel 1 — Básico',
        desc:   'Alcanzá la llave y llevala a la puerta. Todos deben cruzar para ganar.',
      },
      2: {
        titulo: '🎮 Nivel 2 — Cooperación',
        desc:   'Empujá la caja para llegar a la plataforma. Apílense para alcanzar la llave. Todos deben cruzar.',
      },
    };
  
    function setInfoNivel(nivel) {
      const info = INFO_NIVELES[nivel];
      if (!info) return;
      document.getElementById('sidebar-nivel-label').textContent = `Nivel ${nivel}`;
      document.getElementById('nivel-info-titulo').textContent   = info.titulo;
      document.getElementById('nivel-info-desc').textContent     = info.desc;
    }

    function mostrarVictoria() {
      document.getElementById('overlay-victoria').classList.add('visible');
    }
  
    function ocultarVictoria() {
      document.getElementById('overlay-victoria').classList.remove('visible');
    }

    function actualizarBotonIniciar(totalJugadores) {
      const btn = document.getElementById('btn-iniciar');
      const msg = document.getElementById('espera-mensaje');
  
      const habilitado = totalJugadores >= 3;
      btn.disabled = !habilitado;
  
      if (habilitado) {
        msg.innerHTML = `<strong style="color:var(--success)">¡Listos! Podés iniciar</strong>`;
      } else {
        const faltan = 3 - totalJugadores;
        msg.innerHTML = `Faltan <strong>${faltan} jugador${faltan !== 1 ? 'es' : ''}</strong> para comenzar`;
      }
    }
  
    return {
      setEstadoConexion,
      cargarIP,
      activarSlotEspera,
      desactivarSlotEspera,
      activarSlotJuego,
      desactivarSlotJuego,
      actualizarLlaveEnSidebar,
      actualizarContador,
      setInfoNivel,
      mostrarVictoria,
      ocultarVictoria,
      actualizarBotonIniciar,
      getJugadorRegistrado: (id) => jugadoresRegistrados.get(id),
    };
  })();