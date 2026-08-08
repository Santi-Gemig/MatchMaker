// ============================================================
//  app.js · LA INTERFAZ (lo que se ve y se toca)
//  Este archivo maneja todo lo que pasa en pantalla:
//  las pestañas, las tarjetas de jugadores, el formulario,
//  la selección de quiénes juegan, la cancha 5 vs 5, el
//  resultado del partido y el historial.
//
//  FLUJO DEL PARTIDO:
//   1) El usuario carga jugadores (pestaña Jugadores)
//   2) Elige quiénes juegan tocando las tarjetas (Armar equipos)
//   3) "Armar equipos" usa balance.js para repartirlos parejo
//   4) Se muestra la cancha 5 vs 5 con las dos cartas
//   5) "Partido jugado" → se carga el resultado → se suma el
//      registro a cada jugador (G/E/P) y al Historial
// ============================================================

// ---------- Estado global de la app ----------
var jugadores = cargarJugadores();       // el plantel (con sus G/E/P)
var historial = cargarHistorial();       // la lista de partidos jugados
var config = cargarConfig();             // equipos, porEquipo, forzarArqueros
var seleccion = [];                      // ids de los jugadores elegidos PARA ESTE partido
var ultimoArmado = null;                 // último armado generado por balance.js
var editandoId = null;                   // null = alta de jugador, id = edición
var fotoActual = '';                     // foto en el formulario
var idToastTimer = null;                 // para no apilar mensajes toast

// Colores que distinguen a cada equipo en pantalla.
var COLOR_EQUIPOS = ['#2ee07b', '#38bdf8', '#f59e0b', '#c084fc'];

// Atajo para buscar un elemento por su id.
function el(id) {
  return document.getElementById(id);
}

// ---------- Pestañas ----------
function cambiarPestana(vista) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].dataset.view === vista) tabs[i].classList.add('active');
    else tabs[i].classList.remove('active');
  }
  el('view-jugadores').classList.toggle('hidden', vista !== 'jugadores');
  el('view-equipos').classList.toggle('hidden', vista !== 'equipos');
  el('view-historial').classList.toggle('hidden', vista !== 'historial');
}

// ---------- Utilidades chicas ----------
function iniciales(nombre) {
  return (nombre || '?').trim().charAt(0).toUpperCase() || '?';
}

// Busca un jugador en el plantel por su id (devuelve el objeto o null).
function buscarJugador(id) {
  for (var i = 0; i < jugadores.length; i++) {
    if (jugadores[i].id === id) return jugadores[i];
  }
  return null;
}

// Devuelve [dd/mm/aaaa hh:mm] a partir de un objeto Date.
function formatoFecha(fecha) {
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  return pad(fecha.getDate()) + '/' + pad(fecha.getMonth() + 1) + '/' +
         fecha.getFullYear() + ' ' + pad(fecha.getHours()) + ':' + pad(fecha.getMinutes());
}

// Muestra el mensajito verde abajo a la derecha.
function mostrarToast(texto) {
  el('toast').textContent = texto;
  el('toast').classList.remove('hidden');
  if (idToastTimer) clearTimeout(idToastTimer);
  idToastTimer = setTimeout(function () {
    el('toast').classList.add('hidden');
  }, 2600);
}

// ============================================================
//  PESTAÑA 1 · JUGADORES
// ============================================================

// Arma el HTML de una tarjeta de jugador.
function tarjetaHTML(j) {
  var colores = colorRating(j.ovr);
  var stats = '';
  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    var valor = j[stat] || 0;
    stats = stats +
      '<div class="srow"><span>' + ETIQUETA_STATS[stat] + '</span>' +
      '<div class="bar"><i style="width:' + valor + '%"></i></div>' +
      '<span class="val">' + valor + '</span></div>';
  }
  // Fila de estrellas: skill y pierna mala (de 1 a 5 estrellas).
  var estrellas = '';
  for (var e = 0; e < ESTRELLAS_STATS.length; e++) {
    var clave = ESTRELLAS_STATS[e];
    estrellas = estrellas +
      '<div class="srow"><span>' + ETIQUETA_ESTRELLAS[clave] + '</span>' +
      '<div class="star-val">' + dibujarEstrellas(j[clave]) + '</div>' +
      '<span class="val">' + j[clave] + '</span></div>';
  }
  var foto = j.foto
    ? '<img src="' + j.foto + '" alt="' + j.nombre + '">'
    : '<div class="fallback">' + iniciales(j.nombre) + '</div>';

  return '<div class="player-card" style="--rank-1:' + colores.c1 + ';--rank-2:' + colores.c2 + '" data-id="' + j.id + '">' +
    '<div class="actions">' +
    '<button class="edit" title="Editar">✎</button>' +
    '<button class="del" title="Eliminar">🗑</button>' +
    '</div>' +
    '<div class="pcard-top"><span class="pcard-pos">' + NOMBRES_POSICION[j.posicion] + '</span>' +
    '<span class="pcard-ovr">' + j.ovr + '</span></div>' +
    '<div class="pcard-photo">' + foto + '</div>' +
    '<div class="pcard-name">' + j.nombre + '</div>' +
    // Registro de partidos: PJ=partidos, G=ganados, E=empatados, P=perdidos
    '<div class="pcard-record">PJ <b>' + j.partidos + '</b> · ' +
    'G <b class="g">' + j.ganados + '</b> · ' +
    'E <b class="e">' + j.empatados + '</b> · ' +
    'P <b class="p">' + j.perdidos + '</b></div>' +
    '<div class="pcard-stats">' + stats + estrellas + '</div>' +
    '</div>';
}

// Convierte un valor 1-5 en estrellas llenas (★) y vacías (☆).
function dibujarEstrellas(valor) {
  var n = Number(valor);
  if (isNaN(n)) n = 0;
  var texto = '';
  for (var i = 1; i <= 5; i++) {
    if (i <= n) texto = texto + '★';
    else texto = texto + '☆';
  }
  return texto;
}

function renderJugadores() {
  var grid = el('players-grid');
  el('players-empty').classList.toggle('hidden', jugadores.length > 0);
  grid.classList.toggle('hidden', jugadores.length === 0);

  // Ordenamos una copia de mayor a menor OVR (la lista original no se toca).
  var ordenados = jugadores.slice().sort(function (a, b) {
    return b.ovr - a.ovr;
  });

  var html = '';
  for (var i = 0; i < ordenados.length; i++) {
    html = html + tarjetaHTML(ordenados[i]);
  }
  grid.innerHTML = html;
}

// Clic sobre una tarjeta: editar o eliminar.
el('players-grid').addEventListener('click', function (evento) {
  var tarjeta = evento.target.closest('.player-card');
  if (!tarjeta) return;
  var id = tarjeta.dataset.id;

  if (evento.target.closest('.del')) {
    // Borrar jugador y refrescar todo.
    var nueva = [];
    for (var i = 0; i < jugadores.length; i++) {
      if (jugadores[i].id !== id) nueva.push(jugadores[i]);
    }
    jugadores = nueva;
    guardarJugadores(jugadores);
    renderJugadores();
    preseleccionar();          // la selección se corrige sola
    renderSeleccion();
    actualizarSeleccionUI();
    limpiarCancha();
  } else if (evento.target.closest('.edit')) {
    var jugador = buscarJugador(id);
    if (jugador) abrirModal(jugador);
  }
});

// ---------- Formulario (alta / edición) ----------

function abrirModal(jugador) {
  editandoId = jugador ? jugador.id : null;
  fotoActual = jugador ? jugador.foto : '';
  el('modal-title').textContent = jugador ? 'Editar jugador' : 'Nuevo jugador';
  el('f-nombre').value = jugador ? jugador.nombre : '';
  el('f-pos').value = jugador ? jugador.posicion : 'DEL';
  // Estrellas: por defecto 3 si el jugador no tiene.
  el('f-habilidad').value = jugador ? jugador.habilidad : 3;
  el('f-pierna').value = jugador ? jugador.piernaMala : 3;

  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    var fila = document.querySelector('.slider-row[data-key="' + stat + '"]');
    var slider = fila.querySelector('input');
    var valor = jugador ? jugador[stat] : 50;
    slider.value = valor;
    fila.querySelector('b').textContent = valor;
    slider.style.setProperty('--fill', valor + '%');
  }

  actualizarFotoPreview();
  actualizarOVRPreview();
  el('modal-overlay').classList.remove('hidden');
}

function cerrarModal() {
  el('modal-overlay').classList.add('hidden');
  editandoId = null;
  fotoActual = '';
  el('player-form').reset();
  actualizarFotoPreview();
}

el('btn-agregar').addEventListener('click', function () { abrirModal(null); });
el('modal-cancel').addEventListener('click', cerrarModal);
el('modal-close').addEventListener('click', cerrarModal);
// Clic afuera del modal también cierra.
el('modal-overlay').addEventListener('click', function (evento) {
  if (evento.target === el('modal-overlay')) cerrarModal();
});

// Sliders: cada vez que se mueven, se actualiza el número y el OVR.
var sliderFilas = document.querySelectorAll('.slider-row');
for (var s = 0; s < sliderFilas.length; s++) {
  (function (fila) {
    var slider = fila.querySelector('input');
    slider.addEventListener('input', function () {
      fila.querySelector('b').textContent = slider.value;
      slider.style.setProperty('--fill', slider.value + '%');
      actualizarOVRPreview();
    });
  })(sliderFilas[s]);
}

// Lee los 5 valores de los sliders del formulario.
function leerStatsForm() {
  var valores = {};
  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    valores[stat] = Number(document.querySelector('.slider-row[data-key="' + stat + '"] input').value);
  }
  return valores;
}

// Muestra el OVR que tendría el jugador con los valores actuales.
function actualizarOVRPreview() {
  var vals = leerStatsForm();
  // Se arma con el loop de ORDEN_STATS para incluir TODAS las stats
  // (la vista previa así sigue en vivo aunque se toque cualquiera).
  var prueba = {
    nombre: el('f-nombre').value || 'X',
    posicion: el('f-pos').value
  };
  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    prueba[stat] = vals[stat];
  }
  var jugadorPreview = crearJugador(prueba);
  el('modal-ovr').textContent = jugadorPreview.ovr;
}

el('f-pos').addEventListener('change', actualizarOVRPreview);
el('f-nombre').addEventListener('input', actualizarOVRPreview);

// ---------- Foto del jugador ----------

function actualizarFotoPreview() {
  var img = el('photo-prev');
  var fb = el('photo-fallback');
  if (fotoActual) {
    img.src = fotoActual;
    img.classList.remove('none');
    fb.classList.add('hidden');
    el('photo-remove').classList.remove('hidden');
  } else {
    img.classList.add('none');
    fb.classList.remove('hidden');
    el('photo-remove').classList.add('hidden');
  }
}

el('photo-remove').addEventListener('click', function () {
  fotoActual = '';
  actualizarFotoPreview();
});

el('photo-input').addEventListener('change', function () {
  var archivo = this.files && this.files[0];
  if (!archivo) return;
  redimensionarFoto(archivo).then(function (dataURL) {
    fotoActual = dataURL;
    actualizarFotoPreview();
  });
  this.value = '';
});

// Reduce la imagen a 320px y la convierte en texto (dataURL) para guardarla.
function redimensionarFoto(archivo) {
  return new Promise(function (resolver, rechazar) {
    var lector = new FileReader();
    lector.onload = function (evento) {
      var imagen = new Image();
      imagen.onload = function () {
        var max = 320;
        var escala = Math.min(max / imagen.width, max / imagen.height, 1);
        var ancho = Math.round(imagen.width * escala);
        var alto = Math.round(imagen.height * escala);
        var canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        canvas.getContext('2d').drawImage(imagen, 0, 0, ancho, alto);
        resolver(canvas.toDataURL('image/jpeg', 0.82));
      };
      imagen.onerror = rechazar;
      imagen.src = evento.target.result;
    };
    lector.onerror = rechazar;
    lector.readAsDataURL(archivo);
  });
}

// Guardar el formulario (alta o edición). Los G/E/P ya existentes
// NO se tocan al editar: solo cambian cuando se carga un resultado.
el('player-form').addEventListener('submit', function (evento) {
  evento.preventDefault();
  var nombre = el('f-nombre').value.trim();
  if (!nombre) {
    el('f-nombre').focus();
    return;
  }
  var vals = leerStatsForm();
  // Armamos los datos con la lista maestra ORDEN_STATS: así SIEMPRE
  // se incluyen todas las estadísticas del formulario (si mañana se
  // agrega una, esta parte ya la toma sola sin tocarla).
  var datos = {
    nombre: nombre,
    posicion: el('f-pos').value,
    habilidad: Number(el('f-habilidad').value),
    piernaMala: Number(el('f-pierna').value),
    foto: fotoActual
  };
  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    datos[stat] = vals[stat];
  }

  if (editandoId) {
    // Edición: conservamos el id y el registro G/E/P.
    var idx = -1;
    for (var i = 0; i < jugadores.length; i++) {
      if (jugadores[i].id === editandoId) idx = i;
    }
    if (idx !== -1) {
      var jugadorEditado = crearJugador(datos);
      jugadorEditado.id = editandoId;
      jugadorEditado.partidos = jugadores[idx].partidos;
      jugadorEditado.ganados = jugadores[idx].ganados;
      jugadorEditado.empatados = jugadores[idx].empatados;
      jugadorEditado.perdidos = jugadores[idx].perdidos;
      jugadores[idx] = jugadorEditado;
    }
  } else {
    jugadores.push(crearJugador(datos));
  }

  guardarJugadores(jugadores);
  cerrarModal();
  renderJugadores();
  renderSeleccion();
  actualizarSeleccionUI();
  limpiarCancha(); // si había un armado viejo, ya no sirve
});

// ============================================================
//  PESTAÑA 2 · ARMAR EQUIPOS
// ============================================================

// Paso 1: mostrar todos los jugadores como tarjetas "tocables".
function renderSeleccion() {
  var grid = el('seleccion-grid');
  var html = '';
  for (var i = 0; i < jugadores.length; i++) {
    var j = jugadores[i];
    var marcado = estaSeleccionado(j.id);
    var foto = j.foto
      ? '<img src="' + j.foto + '" alt="' + j.nombre + '">'
      : '<div class="sel-fallback">' + iniciales(j.nombre) + '</div>';
    html = html +
      '<div class="sel-card' + (marcado ? ' marcado' : '') + '" data-id="' + j.id + '">' +
      '<span class="sel-check">✓</span>' +
      '<div class="sel-foto">' + foto + '</div>' +
      '<div class="sel-nombre">' + j.nombre + '</div>' +
      '<div class="sel-meta">' + NOMBRES_POSICION[j.posicion] + ' · OVR ' + j.ovr + '</div>' +
      '<div class="sel-record">PJ ' + j.partidos + ' · G ' + j.ganados + ' · E ' + j.empatados + ' · P ' + j.perdidos + '</div>' +
      '</div>';
  }
  grid.innerHTML = html;
}

function estaSeleccionado(id) {
  return seleccion.indexOf(id) !== -1;
}

// Tocar una tarjeta la marca / desmarca.
el('seleccion-grid').addEventListener('click', function (evento) {
  var tarjeta = evento.target.closest('.sel-card');
  if (!tarjeta) return;
  var id = tarjeta.dataset.id;
  var pos = seleccion.indexOf(id);
  if (pos === -1) seleccion.push(id);
  else seleccion.splice(pos, 1);
  renderSeleccion();
  actualizarSeleccionUI();
  limpiarCancha();
  // Si estábamos armando a mano, la selección cambió: salimos del modo manual.
  el('manual-builder').classList.add('hidden');
});

// Al inicio, marcamos automáticamente los mejores por OVR (se pueden cambiar).
function preseleccionar() {
  var necesidad = config.equipos * config.porEquipo;
  var ordenados = jugadores.slice().sort(function (a, b) {
    return b.ovr - a.ovr;
  });
  seleccion = [];
  var limite = Math.min(necesidad, ordenados.length);
  for (var i = 0; i < limite; i++) {
    seleccion.push(ordenados[i].id);
  }
}

// Actualiza el contador (10/10) y avisa si falta elegir o sobran.
function actualizarSeleccionUI() {
  var necesidad = config.equipos * config.porEquipo;
  var cantidad = seleccion.length;

  var contador = el('sel-contador');
  contador.textContent = cantidad + ' / ' + necesidad;
  contador.classList.remove('ok', 'err');
  if (cantidad === necesidad) contador.classList.add('ok');
  else contador.classList.add('err');

  var mensaje = el('sel-msg');
  mensaje.classList.remove('err', 'warn', 'hidden');
  if (cantidad < necesidad) {
    mensaje.textContent = 'Faltan ' + (necesidad - cantidad) + ' jugadores para armar el partido. Tocá más tarjetas.';
    mensaje.classList.add('err');
  } else if (cantidad > necesidad) {
    mensaje.textContent = 'Sobran ' + (cantidad - necesidad) + '. Para un ' + config.equipos + ' vs ' + config.equipos +
      ' se juega con ' + necesidad + ' jugadores. Tocá una tarjeta verde para sacarla.';
    mensaje.classList.add('err');
  } else if (config.forzarArqueros && contarArquerosSeleccionados() === 0) {
    mensaje.textContent = 'No seleccionaste ningún arquero. Igual podés armar, la opción solo intenta repartirlos.';
    mensaje.classList.add('warn');
  } else {
    mensaje.classList.add('hidden');
  }

  // El botón recién se habilita cuando hay la cantidad exacta.
  el('btn-armar').disabled = cantidad !== necesidad;
  el('btn-armar-manual').disabled = cantidad !== necesidad;
}

function contarArquerosSeleccionados() {
  var total = 0;
  for (var i = 0; i < seleccion.length; i++) {
    var jug = buscarJugador(seleccion[i]);
    if (jug && jug.posicion === 'POR') total++;
  }
  return total;
}

// Al tocar la config (equipos, cantidad, arquero) se recalcula todo.
function aplicarConfig() {
  config.equipos = Number(el('cfg-equipos').value);
  config.porEquipo = Number(el('cfg-por-equipo').value);
  config.forzarArqueros = el('cfg-arqueros').checked;
  guardarConfig(config);

  var necesidad = config.equipos * config.porEquipo;
  if (seleccion.length > necesidad) seleccion = seleccion.slice(0, necesidad);
  if (seleccion.length === 0) preseleccionar();

  renderSeleccion();
  actualizarSeleccionUI();
  limpiarCancha();
  el('manual-builder').classList.add('hidden');
}

el('cfg-equipos').addEventListener('change', aplicarConfig);
el('cfg-por-equipo').addEventListener('change', aplicarConfig);
el('cfg-arqueros').addEventListener('change', aplicarConfig);

// ---------- Paso 2: Armar y mostrar la cancha ----------

function generarArmado() {
  var necesidad = config.equipos * config.porEquipo;
  if (seleccion.length !== necesidad) return;

  // Armamos la lista de objetos con la selección actual.
  var elegidos = [];
  for (var i = 0; i < seleccion.length; i++) {
    var jug = buscarJugador(seleccion[i]);
    if (jug) elegidos.push(jug);
  }

  var armado = armarEquipos(elegidos, config.equipos, config.forzarArqueros);
  if (!armado) {
    mostrarToast('No se pudo armar el partido');
    return;
  }
  // Armado automático: el botón "Barajar de nuevo" sí tiene sentido.
  modoManual = false;
  el('btn-barajar').style.display = '';
  ultimoArmado = armado;
  renderizarCancha(armado);
}

el('btn-armar').addEventListener('click', generarArmado);
el('btn-barajar').addEventListener('click', generarArmado);

function limpiarCancha() {
  ultimoArmado = null;
  el('pitch-area').classList.add('hidden');
}

// ================================================================
//  MODO MANUAL · ARMAR LOS EQUIPOS A MANO
//  En vez de usar el algoritmo, el usuario reparte los jugadores
//  seleccionados tocándolos. Al confirmar, la cancha y el botón
//  "Partido jugado → cargar resultado" funcionan igual que siempre.
// ================================================================
var manualEquipos = []; // manualEquipos[equipo] = [ids de jugadores]
var manualPile = [];    // ids de jugadores todavía sin asignar
var modoManual = false; // true si el último armado se hizo a mano

// Entra al modo manual y le pone los jugadores seleccionados arriba.
function iniciarManual() {
  var necesidad = config.equipos * config.porEquipo;
  if (seleccion.length !== necesidad) return;

  manualEquipos = [];
  for (var t = 0; t < config.equipos; t++) manualEquipos.push([]);
  manualPile = seleccion.slice();

  el('pitch-area').classList.add('hidden');
  el('manual-builder').classList.remove('hidden');
  renderManual();
}

function cerrarManual() {
  el('manual-builder').classList.add('hidden');
}

// Dibuja el pile de libres y las columnas de cada equipo.
function renderManual() {
  // Jugadores libres (arriba, en columnas).
  var pileHtml = '';
  for (var i = 0; i < manualPile.length; i++) {
    var libre = buscarJugador(manualPile[i]);
    if (libre) pileHtml = pileHtml + manualCarta(libre, -1);
  }

  // Columnas de cada equipo (con su suma de OVR en vivo).
  var colsHtml = '';
  for (var t = 0; t < manualEquipos.length; t++) {
    var equipoHtml = '';
    var suma = 0;
    for (var k = 0; k < manualEquipos[t].length; k++) {
      var jug = buscarJugador(manualEquipos[t][k]);
      if (jug) {
        equipoHtml = equipoHtml + manualCarta(jug, t);
        suma = suma + jug.ovr;
      }
    }
    colsHtml = colsHtml +
      '<div class="manual-col">' +
      '<div class="manual-col-head" style="--mcolor:' + COLOR_EQUIPOS[t % COLOR_EQUIPOS.length] + '">' +
      'Equipo ' + (t + 1) + ' · <b>' + manualEquipos[t].length + '/' + config.porEquipo + '</b>' +
      '<span class="manual-suma">Suma ' + suma + '</span>' +
      '</div>' +
      '<div class="manual-list">' + (equipoHtml || '<span class="manual-vacio">Vacío</span>') + '</div>' +
      '</div>';
  }

  el('manual-join').innerHTML =
    '<div class="manual-pile"><div class="manual-pile-title">Jugadores libres</div>' +
    '<div class="manual-pile-list">' + (pileHtml || '<span class="manual-vacio">Ya están todos asignados</span>') + '</div></div>' +
    '<div class="manual-cols">' + colsHtml + '</div>';

  // Confirmar recién se habilita cuando TODOS los equipos están completos.
  var completo = true;
  for (t = 0; t < manualEquipos.length; t++) {
    if (manualEquipos[t].length !== config.porEquipo) completo = false;
  }
  el('btn-confirmar-manual').disabled = !completo;
}

// Una tarjeta jugador del armador manual.
// teamIdx = -1 → está en "jugadores libres" (con botones E1, E2, ...)
// teamIdx >= 0 → está en esa columna (con botón ✕ para devolverlo).
function manualCarta(jugador, teamIdx) {
  var foto = jugador.foto
    ? '<img src="' + jugador.foto + '" alt="' + jugador.nombre + '">'
    : '<div class="m-fallback">' + iniciales(jugador.nombre) + '</div>';
  var html =
    '<div class="manual-card">' +
    foto +
    '<div class="m-info">' +
    '<span class="m-nombre">' + jugador.nombre + '</span>' +
    '<span class="m-pos">' + NOMBRES_POSICION[jugador.posicion] + ' · OVR ' + jugador.ovr + '</span>' +
    '</div>';

  if (teamIdx === -1) {
    // En jugadores libres: un botón por equipo para mandarlo ahí.
    html = html + '<div class="m-btns">';
    for (var t = 0; t < manualEquipos.length; t++) {
      var lleno = manualEquipos[t].length >= config.porEquipo;
      html = html + '<button class="m-push" data-move="' + jugador.id + '" data-eq="' + t + '"' +
        (lleno ? ' disabled' : '') + '>E' + (t + 1) + '</button>';
    }
    html = html + '</div>';
  } else {
    // Dentro de un equipo: botón para devolverlo a jugadores libres.
    html = html + '<button class="m-back" data-back="' + jugador.id + '" data-eq="' + teamIdx + '">✕</button>';
  }
  return html + '</div>';
}

// Tocar una carta del armador manual.
el('manual-builder').addEventListener('click', function (evento) {
  var push = evento.target.closest('.m-push');
  if (push && !push.disabled) {
    var idJ = push.dataset.move;
    var equipoDestino = Number(push.dataset.eq);
    var enPile = manualPile.indexOf(idJ);
    if (enPile !== -1 && manualEquipos[equipoDestino].length < config.porEquipo) {
      manualPile.splice(enPile, 1);
      manualEquipos[equipoDestino].push(idJ);
    }
    renderManual();
    return;
  }

  var back = evento.target.closest('.m-back');
  if (back) {
    var idVuelta = back.dataset.back;
    var equipoOrigen = Number(back.dataset.eq);
    var posEquipo = manualEquipos[equipoOrigen].indexOf(idVuelta);
    if (posEquipo !== -1) {
      manualEquipos[equipoOrigen].splice(posEquipo, 1);
      manualPile.push(idVuelta);
    }
    renderManual();
  }
});

// Confirmar el armado manual: arma el mismo formato que el algoritmo
// (arreglo de equipos) y lo pasa a la cancha + botón de resultado.
el('btn-confirmar-manual').addEventListener('click', function () {
  var completo = true;
  var armado = [];
  for (var t = 0; t < manualEquipos.length; t++) {
    if (manualEquipos[t].length !== config.porEquipo) {
      completo = false;
      break;
    }
    var equipo = [];
    for (var i = 0; i < manualEquipos[t].length; i++) {
      var jug = buscarJugador(manualEquipos[t][i]);
      if (jug) equipo.push(jug);
    }
    armado.push(equipo);
  }
  if (!completo) return;

  modoManual = true;
  ultimoArmado = armado;
  el('manual-builder').classList.add('hidden');
  el('btn-barajar').style.display = 'none'; // no tiene sentido barajar un armado a mano
  renderizarCancha(armado);
});

el('btn-armar-manual').addEventListener('click', iniciarManual);
el('btn-cerrar-manual').addEventListener('click', cerrarManual);

// ---------- La cancha 5 vs 5 ----------

// Posiciones horizontales (en %) para una cantidad de jugadores en una fila.
function posicionesX(cantidad) {
  if (cantidad === 1) return [50];
  if (cantidad === 2) return [32, 68];
  if (cantidad === 3) return [20, 50, 80];
  var xs = [];
  for (var i = 0; i < cantidad; i++) {
    xs.push(Math.round((i + 1) * 100 / (cantidad + 1)));
  }
  return xs;
}

// Tarjeta chica que se ubica sobre la cancha.
function tarjetaCancha(jugador, x, y, color) {
  var foto = jugador.foto
    ? '<img src="' + jugador.foto + '" alt="' + jugador.nombre + '">'
    : '<div class="pc-fallback">' + iniciales(jugador.nombre) + '</div>';
  return '<div class="pitch-card" style="left:' + x + '%;top:' + y + '%">' +
    foto +
    '<span class="pc-nombre">' + jugador.nombre + '</span>' +
    '<span class="pc-pos">' + NOMBRES_POSICION[jugador.posicion] + '</span>' +
    '<span class="pc-ovr" style="background:' + color + '">' + jugador.ovr + '</span>' +
    '</div>';
}

// Dibuja toda la cancha: cada equipo en una franja horizontal con su arco.
function renderizarCancha(armado) {
  var cantidad = armado.length;
  var html = '';

  // Franja superior con el resumen de cada equipo (suma y promedio de OVR).
  html = html + '<div class="pitch-bands">';
  for (var t = 0; t < cantidad; t++) {
    var suma = 0;
    for (var i = 0; i < armado[t].length; i++) suma = suma + armado[t][i].ovr;
    html = html +
      '<div class="band" style="border-color:' + COLOR_EQUIPOS[t % COLOR_EQUIPOS.length] + '">' +
      '<b>Equipo ' + (t + 1) + '</b>' +
      '<span>Suma ' + suma + ' · Promedio ' + (suma / armado[t].length).toFixed(1) + '</span>' +
      '</div>';
  }
  html = html + '</div>';

  // La cancha.
  html = html + '<div class="pitch">';
  html = html + '<div class="center-circle"></div><div class="center-line"></div>';

  for (t = 0; t < cantidad; t++) {
    // Las franjas impares tienen el arco abajo (y le damos la vuelta).
    var golAbajo = (t % 2 === 1);
    html = html + '<div class="half" style="top:' + Math.round(t * 100 / cantidad) + '%;height:' +
      Math.round(100 / cantidad) + '%">';
    html = html + '<div class="goal ' + (golAbajo ? 'gb' : 'gt') + '"></div>';

    // Todos los jugadores del equipo en UNA sola línea horizontal,
    // repartidos parejo en el centro de su franja (uno al lado del otro).
    var yLinea = 50;
    var xs = posicionesX(armado[t].length);
    for (var k = 0; k < armado[t].length; k++) {
      var x = xs[k];
      if (golAbajo) x = 100 - x; // espejo para el equipo del otro lado
      html = html + tarjetaCancha(armado[t][k], x, yLinea,
        COLOR_EQUIPOS[t % COLOR_EQUIPOS.length]);
    }
    html = html + '</div>';
  }
  html = html + '</div>';

  el('cancha').innerHTML = html;
  el('pitch-area').classList.remove('hidden');
}

// ============================================================
//  PASO 3 · RESULTADO DEL PARTIDO
// ============================================================

el('btn-resultado').addEventListener('click', function () {
  if (!ultimoArmado) return;
  el('goles-1').value = 0;
  el('goles-2').value = 0;
  el('rst-eq1').textContent = 'Equipo 1';
  el('rst-eq2').textContent = 'Equipo 2';
  // Mostramos la suma de OVR de cada equipo para elegir con contexto.
  var suma1 = 0, suma2 = 0;
  for (var i = 0; i < ultimoArmado[0].length; i++) suma1 = suma1 + ultimoArmado[0][i].ovr;
  for (var j = 0; j < ultimoArmado[1].length; j++) suma2 = suma2 + ultimoArmado[1][j].ovr;
  el('rst-det1').textContent = 'Suma OVR ' + suma1;
  el('rst-det2').textContent = 'Suma OVR ' + suma2;
  el('resultado-overlay').classList.remove('hidden');
});

function cerrarResultado() {
  el('resultado-overlay').classList.add('hidden');
}

el('resultado-close').addEventListener('click', cerrarResultado);
el('btn-cerrar-resultado').addEventListener('click', cerrarResultado);
el('resultado-overlay').addEventListener('click', function (evento) {
  if (evento.target === el('resultado-overlay')) cerrarResultado();
});

// Según los goles de todos, dice si el equipo del índice es G/E/P.
function resultadoDelEquipo(goles, indice) {
  var maximo = 0;
  for (var i = 0; i < goles.length; i++) {
    if (goles[i] > maximo) maximo = goles[i];
  }
  // Ganadores = equipos que alcanzaron el máximo de goles.
  var ganadores = [];
  for (i = 0; i < goles.length; i++) {
    if (goles[i] === maximo) ganadores.push(i);
  }
  if (ganadores.length === goles.length) return 'E';       // todos iguales
  if (ganadores.indexOf(indice) !== -1) return 'G';        // ganó el suyo
  return 'P';                                              // perdió el suyo
}

el('btn-confirmar-resultado').addEventListener('click', function () {
  if (!ultimoArmado) return;

  // Leemos los goles (si está vacío, asumimos 0).
  function leerGoles(id) {
    var n = parseInt(el(id).value, 10);
    if (isNaN(n) || n < 0) return 0;
    return n;
  }
  var goles = [leerGoles('goles-1'), leerGoles('goles-2')];

  // Guardamos el partido en el historial (con la alineación copiada).
  var partido = crearPartido(ultimoArmado, goles, formatoFecha(new Date()));
  historial.push(partido);
  guardarHistorial(historial);

  // Sumamos al registro de cada jugador según el resultado de su equipo.
  for (var t = 0; t < ultimoArmado.length; t++) {
    var resultado = resultadoDelEquipo(goles, t);
    for (var i = 0; i < ultimoArmado[t].length; i++) {
      var jug = ultimoArmado[t][i];
      jug.partidos = jug.partidos + 1;
      if (resultado === 'G') jug.ganados = jug.ganados + 1;
      else if (resultado === 'E') jug.empatados = jug.empatados + 1;
      else jug.perdidos = jug.perdidos + 1;
    }
  }
  guardarJugadores(jugadores);

  cerrarResultado();
  limpiarCancha();
  renderJugadores();
  renderHistorial();
  mostrarToast('Resultado guardado ✓');
});

// ============================================================
//  PESTAÑA 3 · HISTORIAL DE PARTIDOS
// ============================================================

function renderHistorial() {
  var contenedor = el('historial-list');
  el('historial-empty').classList.toggle('hidden', historial.length > 0);
  contenedor.classList.toggle('hidden', historial.length === 0);

  var html = '';
  // Recorremos de atrás para adelante (partido más reciente primero).
  for (var p = historial.length - 1; p >= 0; p--) {
    var partido = historial[p];
    // Guardamos la posición real en la lista (p) para poder borrarlo.
    html = html + '<div class="hist-row" data-index="' + p + '">';

    // Botón para borrar este partido.
    html = html + '<button class="hist-del" title="Borrar partido">🗑</button>';

    html = html + '<div class="hist-fecha">' + partido.fecha + '</div>';

    // Resultado: Equipo 1 3 - 2 Equipo 2
    html = html + '<div class="hist-equipos">';
    for (var t = 0; t < partido.equipos.length; t++) {
      html = html + '<div class="hist-equipo">' +
        '<b style="color:' + COLOR_EQUIPOS[t % COLOR_EQUIPOS.length] + '">Equipo ' + (t + 1) + '</b>' +
        '<span class="score">' + partido.goles[t] + '</span>' +
        '</div>';
    }
    html = html + '</div>';

    // Alineación de cada equipo (quiénes jugaron ese día).
    html = html + '<div class="hist-lineups">';
    for (t = 0; t < partido.equipos.length; t++) {
      html = html + '<div class="hist-lin">' +
        '<span class="lin-tag" style="background:' + COLOR_EQUIPOS[t % COLOR_EQUIPOS.length] + '">Equipo ' + (t + 1) + '</span>';
      for (var i = 0; i < partido.equipos[t].length; i++) {
        var jug = partido.equipos[t][i];
        html = html + '<span class="chip">' + jug.nombre + ' (' + jug.ovr + ')</span>';
      }
      html = html + '</div>';
    }
    html = html + '</div></div>';
  }
  contenedor.innerHTML = html;
}

// Borrar un partido puntual del historial.
// Además REVIERTE el registro de los jugadores que jugaron ese día:
// por cada jugador se resta 1 a PJ y a su G/E/P según el resultado
// del partido borrado. Si el jugador ya no está en el plantel, se saltea.
el('historial-list').addEventListener('click', function (evento) {
  var boton = evento.target.closest('.hist-del');
  if (!boton) return;
  var fila = boton.closest('.hist-row');
  var indice = Number(fila.dataset.index);
  if (!confirm('¿Borrar este partido del historial?')) return;

  var partido = historial[indice];

  // Restamos el partido a cada jugador que lo jugó.
  for (var t = 0; t < partido.equipos.length; t++) {
    var resultado = resultadoDelEquipo(partido.goles, t);
    for (var i = 0; i < partido.equipos[t].length; i++) {
      var idJugador = partido.equipos[t][i].id;
      var jug = buscarJugador(idJugador);
      if (!jug) continue; // ya no existe en el plantel, nada que restar
      // Math.max(0, ...) evita que quede un número negativo.
      jug.partidos = Math.max(0, jug.partidos - 1);
      if (resultado === 'G') jug.ganados = Math.max(0, jug.ganados - 1);
      else if (resultado === 'E') jug.empatados = Math.max(0, jug.empatados - 1);
      else jug.perdidos = Math.max(0, jug.perdidos - 1);
    }
  }
  guardarJugadores(jugadores);

  historial.splice(indice, 1);
  guardarHistorial(historial);
  renderHistorial();
  renderJugadores();
});

// --------------------------------------------------------
// RESET TOTAL: borra el historial y pone en 0 el registro
// (PJ/G/E/P) de todos los jugadores. Útil para probar o
// empezar de cero sin perder las cartas.
// --------------------------------------------------------
el('btn-resetear').addEventListener('click', function () {
  if (!confirm('¿Resetear a 0 los registros de todos los jugadores y borrar todo el historial?')) return;
  for (var i = 0; i < jugadores.length; i++) {
    jugadores[i].partidos = 0;
    jugadores[i].ganados = 0;
    jugadores[i].empatados = 0;
    jugadores[i].perdidos = 0;
  }
  guardarJugadores(jugadores);

  historial = [];
  guardarHistorial(historial);

  renderJugadores();
  renderHistorial();
  mostrarToast('Registros reiniciados a 0');
});

// ============================================================
//  INICIO
// ============================================================

function iniciar() {
  // Pestañas.
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    (function (tab) {
      tab.addEventListener('click', function () { cambiarPestana(tab.dataset.view); });
    })(tabs[i]);
  }

  // Configuración en pantalla.
  el('cfg-equipos').value = config.equipos;
  el('cfg-por-equipo').value = config.porEquipo;
  el('cfg-arqueros').checked = config.forzarArqueros;

  // Jugador de ejemplo si está vacío el plantel.
  el('btn-demo').addEventListener('click', function () {
    jugadores = jugadoresDemo();
    guardarJugadores(jugadores);
    renderJugadores();
    preseleccionar();
    renderSeleccion();
    actualizarSeleccionUI();
  });

  preseleccionar();
  renderJugadores();
  renderSeleccion();
  actualizarSeleccionUI();
  renderHistorial();
  cambiarPestana('jugadores');
}

iniciar();