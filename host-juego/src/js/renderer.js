const Renderer = (() => {
    const canvas  = document.getElementById('gameCanvas');
    const ctx     = canvas.getContext('2d');
    const W       = canvas.width;
    const H       = canvas.height;
  
    const JUGADOR_SIZE = 40;
    const CAJA_SIZE    = 80;
    const SUELO_H      = 40;
  
    let estadoActual = null;
  
    //api
    function setEstado(estado) {
      estadoActual = estado;
    }
  
    function iniciarLoop() {
      requestAnimationFrame(loop);
    }
  
    function loop() {
      ctx.clearRect(0, 0, W, H);
      dibujarFondo();
  
      if (estadoActual) {
        const { mapa, jugadores, caja, llave, puerta } = estadoActual;
        dibujarSuelo(mapa);
        dibujarHueco(mapa);
        dibujarPlataforma(mapa);
        dibujarCaja(caja);
        dibujarPuerta(mapa, puerta);
        if (!llave?.portadorId) dibujarLlave(llave);
        dibujarJugadores(jugadores, llave);
      }
  
      requestAnimationFrame(loop);
    }
  
    // fondo
    function dibujarFondo() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1c1b2e');
      grad.addColorStop(1, '#110f1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  
    // suelo
    function dibujarSuelo(mapa) {
      dibujarSeccionSuelo(0, mapa.huecoXInicio);
      dibujarSeccionSuelo(mapa.huecoXFin, W - mapa.huecoXFin);
    }
  
    function dibujarSeccionSuelo(x, ancho) {
      ctx.fillStyle = '#2d2b4e';
      ctx.fillRect(x, H - SUELO_H, ancho, SUELO_H);
      ctx.fillStyle = '#7c6af7';
      ctx.fillRect(x, H - SUELO_H, ancho, 3);
    }
  
    // hueco al vacio
    function dibujarHueco(mapa) {
      const ancho = mapa.huecoXFin - mapa.huecoXInicio;
      const x     = mapa.huecoXInicio;
  
      const grad = ctx.createLinearGradient(0, H - SUELO_H * 2, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, H - SUELO_H * 2, ancho, SUELO_H * 2);
  
      ctx.fillStyle = 'rgba(239,68,68,0.12)';
      ctx.fillRect(x, H - SUELO_H, ancho, SUELO_H);
  
      ctx.save();
      ctx.strokeStyle = 'rgba(239,68,68,0.3)';
      ctx.lineWidth   = 2;
      for (let i = 0; i < ancho; i += 20) {
        ctx.beginPath();
        ctx.moveTo(x + i,      H - SUELO_H);
        ctx.lineTo(x + i + 15, H);
        ctx.stroke();
      }
      ctx.restore();
    }
  
    //plataforma
    function dibujarPlataforma(mapa) {
      const px = mapa.plataformaX - 100;
      const py = mapa.plataformaY;
  
      ctx.fillStyle = '#4a3fa5';
      ctx.beginPath();
      ctx.roundRect(px, py, 200, 20, 4);
      ctx.fill();
  
      ctx.strokeStyle = '#7c6af7';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, 200, 20, 4);
      ctx.stroke();
    }
  
    //caja
    function dibujarCaja(caja) {
      if (!caja) return;
      ctx.save();
      ctx.translate(caja.x, caja.y);
      ctx.rotate(caja.angulo);
  
      ctx.shadowColor   = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur    = 10;
      ctx.shadowOffsetY = 4;
  
      ctx.fillStyle = '#8b5e2a';
      ctx.fillRect(-CAJA_SIZE / 2, -CAJA_SIZE / 2, CAJA_SIZE, CAJA_SIZE);
  
      ctx.shadowBlur    = 0;
      ctx.strokeStyle   = '#c4874a';
      ctx.lineWidth     = 3;
      ctx.strokeRect(-CAJA_SIZE / 2, -CAJA_SIZE / 2, CAJA_SIZE, CAJA_SIZE);
  
      // Cruz
      ctx.strokeStyle = 'rgba(196,135,74,0.4)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(-CAJA_SIZE / 2, 0); ctx.lineTo(CAJA_SIZE / 2, 0);
      ctx.moveTo(0, -CAJA_SIZE / 2); ctx.lineTo(0, CAJA_SIZE / 2);
      ctx.stroke();
  
      ctx.restore();
    }
  
    //puerta
    function dibujarPuerta(mapa, puerta) {
      if (!puerta) return;
      const px = mapa.puertaX - 25;
      const py = mapa.puertaY - 60;
      const pw = 50;
      const ph = 80;
  
      ctx.fillStyle = '#1e1c35';
      ctx.fillRect(px - 6, py - 6, pw + 12, ph + 6);
  
      ctx.fillStyle   = puerta.abierta ? '#166534' : '#1d3d6b';
      ctx.strokeStyle = puerta.abierta ? '#22c55e' : '#3b82f6';
      ctx.lineWidth   = 3;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeRect(px, py, pw, ph);

      ctx.fillStyle   = puerta.abierta ? '#22c55e' : '#3b82f6';
      ctx.font        = 'bold 13px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(`${puerta.jugadoresAdentro}/${puerta.totalJugadores}`, px + pw / 2, py - 10);

      ctx.font = '18px serif';
      ctx.fillText(puerta.abierta ? '✓' : '🔒', px + pw / 2, py + ph / 2 + 6);
    }
  
    //llave
    function dibujarLlave(llave) {
      if (!llave) return;
      const t = Date.now() / 500;
  
      ctx.font      = '22px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🗝️', llave.x, llave.y);
    // aura animada
      ctx.beginPath();
      ctx.arc(llave.x, llave.y - 5, 18 + Math.sin(t) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(247,201,72,${0.3 + Math.sin(t) * 0.2})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }
  
    // jugadores
    function dibujarJugadores(jugadores) {
      if (!jugadores) return;
  
      for (const j of jugadores) {
        dibujarJugador(j);
      }
    }
  
    function dibujarJugador(j) {
      const half = JUGADOR_SIZE / 2;
  
      ctx.save();

      ctx.shadowColor = j.color;
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = j.color;
      ctx.beginPath();
      ctx.roundRect(j.x - half, j.y - half, JUGADOR_SIZE, JUGADOR_SIZE, 6);
      ctx.fill();
  
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(j.x - 8, j.y - 6, 6, 6);
      ctx.fillRect(j.x + 2,  j.y - 6, 6, 6);
  
      ctx.restore();

      if (j.tieneLlave) {
        ctx.font      = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🗝️', j.x, j.y - half - 6);
      }

      ctx.fillStyle   = 'rgba(255,255,255,0.7)';
      ctx.font        = 'bold 11px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(`P${j.indice + 1}`, j.x, j.y + half + 14);
    }
  
    return { setEstado, iniciarLoop };
  })();