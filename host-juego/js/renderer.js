const Renderer = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  const W      = canvas.width;
  const H      = canvas.height;

  const JUGADOR_SIZE = 40;
  const CAJA_SIZE    = 80;
  const SUELO_H      = 40;

  let estadoActual = null;

  // ── API ────────────────────────────────────────────────────────────────────

  function setEstado(estado) {
    estadoActual = estado;
  }

  function iniciarLoop() {
    requestAnimationFrame(loop);
  }

  // ── Loop principal ─────────────────────────────────────────────────────────

  function loop() {
    ctx.clearRect(0, 0, W, H);
    dibujarFondo();

    if (estadoActual) {
      const { mapa, jugadores, caja, llave, puerta } = estadoActual;
      const nivel = estadoActual.nivel;

      if (nivel === 1) {
        dibujarNivel1(mapa, jugadores, llave, puerta);
      } else {
        dibujarNivel2(mapa, jugadores, caja, llave, puerta);
      }
    }

    requestAnimationFrame(loop);
  }

  // ── Nivel 1 ────────────────────────────────────────────────────────────────

  function dibujarNivel1(mapa, jugadores, llave, puerta) {
    // Suelo izquierdo (antes del hoyo chico)
    dibujarSeccionSuelo(0, mapa.huecoChicoXInicio);

    // Suelo medio (entre hoyo chico y hoyo grande)
    dibujarSeccionSuelo(mapa.huecoChicoXFin, mapa.huecoGrandeXInicio - mapa.huecoChicoXFin);

    // Suelo derecho (después del hoyo grande)
    dibujarSeccionSuelo(mapa.huecoGrandeXFin, W - mapa.huecoGrandeXFin);

    // Hoyo chico
    dibujarHueco(mapa.huecoChicoXInicio, mapa.huecoChicoXFin - mapa.huecoChicoXInicio);

    // Hoyo grande
    dibujarHueco(mapa.huecoGrandeXInicio, mapa.huecoGrandeXFin - mapa.huecoGrandeXInicio);

    // Piso puente (aparece cuando se activa el botón)
    if (mapa.pisoPuenteVisible) {
      dibujarPisoPuente(mapa);
    }

    // Gradita (escalones)
    if (mapa.escalones) {
      dibujarGradita(mapa.escalones);
    }

    // Plataforma flotante sobre el hoyo grande
    dibujarPlataformaNivel1(mapa);

    // Botón
    dibujarBoton(mapa);

    // Puerta y llave
    dibujarPuerta(mapa, puerta);
    if (!llave?.portadorId) dibujarLlave(llave);
    dibujarJugadores(jugadores);
  }

  // ── Nivel 2 ────────────────────────────────────────────────────────────────

  function dibujarNivel2(mapa, jugadores, caja, llave, puerta) {
    dibujarSueloNivel2(mapa);
    dibujarHueco(mapa.huecoXInicio, mapa.huecoXFin - mapa.huecoXInicio);
    dibujarPlataformaNivel2(mapa);
    dibujarCaja(caja);
    dibujarPuerta(mapa, puerta);
    if (!llave?.portadorId) dibujarLlave(llave);
    dibujarJugadores(jugadores);
  }

  // ── Fondo ──────────────────────────────────────────────────────────────────

  function dibujarFondo() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1c1b2e');
    grad.addColorStop(1, '#110f1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Suelo ──────────────────────────────────────────────────────────────────

  function dibujarSeccionSuelo(x, ancho) {
    if (ancho <= 0) return;
    ctx.fillStyle = '#2d2b4e';
    ctx.fillRect(x, H - SUELO_H, ancho, SUELO_H);
    ctx.fillStyle = '#7c6af7';
    ctx.fillRect(x, H - SUELO_H, ancho, 3);
  }

  function dibujarSueloNivel2(mapa) {
    dibujarSeccionSuelo(0, mapa.huecoXInicio);
    dibujarSeccionSuelo(mapa.huecoXFin, W - mapa.huecoXFin);
  }

  // ── Hueco (genérico, recibe x e ancho) ────────────────────────────────────

  function dibujarHueco(x, ancho) {
    if (ancho <= 0) return;

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

  // ── Gradita (escalones del nivel 1) ───────────────────────────────────────

  function dibujarGradita(escalones) {
    for (const esc of escalones) {
      const x = esc.x;
      const y = esc.y;
      const w = 80;
      const h = 24;

      ctx.fillStyle = '#2d2b4e';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = '#7c6af7';
      ctx.fillRect(x, y, w, 3);

      // Borde lateral para efecto 3D
      ctx.fillStyle = 'rgba(124,106,247,0.3)';
      ctx.fillRect(x, y + 3, 3, h - 3);
    }
  }

  // ── Plataforma flotante (nivel 1, sobre el hoyo grande) ───────────────────

  function dibujarPlataformaNivel1(mapa) {
    const px = mapa.plataformaX - mapa.plataformaAncho / 2;
    const py = mapa.plataformaY;
    const pw = mapa.plataformaAncho;

    ctx.fillStyle = '#4a3fa5';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, 20, 4);
    ctx.fill();

    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, 20, 4);
    ctx.stroke();
  }

  // ── Plataforma (nivel 2) ───────────────────────────────────────────────────

  function dibujarPlataformaNivel2(mapa) {
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

  // ── Piso puente (nivel 1, aparece al activar el botón) ────────────────────

  function dibujarPisoPuente(mapa) {
    const ancho = mapa.huecoGrandeXFin - mapa.huecoGrandeXInicio;
    const x     = mapa.huecoGrandeXInicio;

    // Mismo estilo que el suelo normal
    ctx.fillStyle = '#2d2b4e';
    ctx.fillRect(x, H - SUELO_H, ancho, SUELO_H);

    // Borde superior con color diferente para que se note que apareció
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, H - SUELO_H, ancho, 3);

    // Texto indicador
    ctx.fillStyle   = 'rgba(34,197,94,0.6)';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('— puente —', x + ancho / 2, H - SUELO_H - 6);
  }

  // ── Botón (nivel 1) ───────────────────────────────────────────────────────

  function dibujarBoton(mapa) {
    const activado = mapa.botonActivado;
    const bx = mapa.botonX;
    const by = H - SUELO_H; // encima del suelo

    // Base del botón
    ctx.fillStyle = activado ? '#166534' : '#1d3d6b';
    ctx.beginPath();
    ctx.roundRect(bx - 25, by - 16, 50, 16, [4, 4, 0, 0]);
    ctx.fill();

    // Borde
    ctx.strokeStyle = activado ? '#22c55e' : '#3b82f6';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(bx - 25, by - 16, 50, 16, [4, 4, 0, 0]);
    ctx.stroke();

    // Ícono y texto
    ctx.font      = '11px monospace';
    ctx.fillStyle = activado ? '#22c55e' : '#93c5fd';
    ctx.textAlign = 'center';
    ctx.fillText(activado ? '✓ ON' : '[ ]', bx, by - 4);

    // Etiqueta arriba
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font      = '10px monospace';
    ctx.fillText('BTN', bx, by - 20);
  }

  // ── Caja (nivel 2) ────────────────────────────────────────────────────────

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

    ctx.shadowBlur  = 0;
    ctx.strokeStyle = '#c4874a';
    ctx.lineWidth   = 3;
    ctx.strokeRect(-CAJA_SIZE / 2, -CAJA_SIZE / 2, CAJA_SIZE, CAJA_SIZE);

    ctx.strokeStyle = 'rgba(196,135,74,0.4)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(-CAJA_SIZE / 2, 0); ctx.lineTo(CAJA_SIZE / 2, 0);
    ctx.moveTo(0, -CAJA_SIZE / 2); ctx.lineTo(0, CAJA_SIZE / 2);
    ctx.stroke();

    ctx.restore();
  }

  // ── Puerta ────────────────────────────────────────────────────────────────

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

    ctx.fillStyle = puerta.abierta ? '#22c55e' : '#3b82f6';
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${puerta.jugadoresAdentro}/${puerta.totalJugadores}`, px + pw / 2, py - 10);

    ctx.font = '18px serif';
    ctx.fillText(puerta.abierta ? '✓' : '🔒', px + pw / 2, py + ph / 2 + 6);
  }

  // ── Llave ─────────────────────────────────────────────────────────────────

  function dibujarLlave(llave) {
    if (!llave) return;
    const t = Date.now() / 500;

    ctx.font      = '22px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🗝️', llave.x, llave.y);

    ctx.beginPath();
    ctx.arc(llave.x, llave.y - 5, 18 + Math.sin(t) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(247,201,72,${0.3 + Math.sin(t) * 0.2})`;
    ctx.lineWidth   = 2;
    ctx.stroke();
  }

  // ── Jugadores ─────────────────────────────────────────────────────────────

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
    ctx.fillStyle  = 'rgba(0,0,0,0.4)';
    ctx.fillRect(j.x - 8, j.y - 6, 6, 6);
    ctx.fillRect(j.x + 2, j.y - 6, 6, 6);
    ctx.restore();

    if (j.tieneLlave) {
      ctx.font      = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🗝️', j.x, j.y - half - 6);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font      = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`P${j.indice + 1}`, j.x, j.y + half + 14);
  }

  return { setEstado, iniciarLoop };
})();