// ============================================================
//  data.js · DATOS Y MODELO
//  Acá está todo lo relacionado con la información:
//  cómo es un jugador, cómo se guarda y se carga, cómo se
//  calcula su OVR y qué forma tiene un partido del historial.
//
//  NOTA: por ahora guardamos en localStorage (memoria del
//  navegador). En la próxima etapa esto se reemplaza por la
//  base de datos + login, pero el resto del código no cambia.
// ============================================================

// ---------- Constantes del modelo ----------

// Los 7 atributos que tiene cada jugador, en orden fijo.
var ORDEN_STATS = ['fisica', 'velocidad', 'control', 'pase', 'definicion', 'gambeta', 'defensa'];

// Etiqueta corta que se muestra en las tarjetas.
var ETIQUETA_STATS = {
  fisica: 'FÍS',
  velocidad: 'VEL',
  control: 'CON',
  pase: 'PAS',
  definicion: 'TIR',   // se muestra como "Tiro"
  gambeta: 'GAM',
  defensa: 'DEF'
};

// Las 2 estadísticas de estrellas (estilo FIFA, de 1 a 5).
// NO entran en ORDEN_STATS porque no usan barra 1-100 ni pesos:
// se muestran como estrellas y no afectan el OVR.
var ESTRELLAS_STATS = ['habilidad', 'piernaMala'];

// Etiqueta corta de cada estrella.
var ETIQUETA_ESTRELLAS = {
  habilidad: 'SKILL',
  piernaMala: 'PIERNA'
};

// Nombre completo de cada posición.
var NOMBRES_POSICION = {
  POR: 'Arquero',
  DEF: 'Defensor',
  MED: 'Medio',
  DEL: 'Delantero'
};

// Peso de cada atributo según la posición.
// El OVR se calcula como el promedio ponderado: atributo × peso.
// Por ejemplo un DELANTERO pesa más el tiro (definicion) y la
// velocidad, y un ARQUERO pesa más el tiro (su tarea principal).
// Todos los pesos de una posición suman 1.
var PESOS_POSICION = {
  POR: { fisica: 0.2, velocidad: 0.1, control: 0.15, pase: 0.1, definicion: 0.2, gambeta: 0.05, defensa: 0.2 },
  DEF: { fisica: 0.2, velocidad: 0.1, control: 0.1, pase: 0.15, definicion: 0.15, gambeta: 0.05, defensa: 0.25 },
  MED: { fisica: 0.1, velocidad: 0.15, control: 0.15, pase: 0.25, definicion: 0.1, gambeta: 0.1, defensa: 0.15 },
  DEL: { fisica: 0.1, velocidad: 0.15, control: 0.15, pase: 0.05, definicion: 0.3, gambeta: 0.2, defensa: 0.05 }
};

// Claves con las que se guarda cada cosa en localStorage.
var CLAVE_JUGADORES = 'balancefutbol_players_v1';
var CLAVE_CONFIG = 'balancefutbol_config_v1';
var CLAVE_HISTORIAL = 'balancefutbol_historial_v1';

// ---------- Guardar y cargar jugadores ----------

// Carga la lista de jugadores guardada. Si no hay nada, devuelve [].
// Cada jugador pasa por normalizarJugador para que nunca falte
// ningún atributo ni el registro (así la carta no muestra "undefined").
function cargarJugadores() {
  var texto = localStorage.getItem(CLAVE_JUGADORES);
  if (!texto) return [];
  try {
    var lista = JSON.parse(texto);
    for (var i = 0; i < lista.length; i++) {
      lista[i] = normalizarJugador(lista[i]);
    }
    return lista;
  } catch (e) {
    return [];
  }
}

// Completa un jugador viejo con los campos que le faltan.
// - Los atributos que faltan valen 50 (neutro).
// - El registro (partidos/ganados/empatados/perdidos) que falta vale 0.
function normalizarJugador(j) {
  var atributosDefault = { fisica: 50, velocidad: 50, control: 50, pase: 50, definicion: 50, gambeta: 50, defensa: 50 };
  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    var valor = j[stat];
    if (valor === undefined || valor === null || isNaN(Number(valor))) {
      j[stat] = atributosDefault[stat];
    } else {
      j[stat] = ajustarStat(valor);
    }
  }
  if (j.partidos === undefined) j.partidos = 0;
  if (j.ganados === undefined) j.ganados = 0;
  if (j.empatados === undefined) j.empatados = 0;
  if (j.perdidos === undefined) j.perdidos = 0;
  if (!j.posicion) j.posicion = 'MED';
  if (j.foto === undefined) j.foto = '';
  // Las estrellas que faltan valen 3 (ni buenas ni malas).
  if (j.habilidad === undefined) j.habilidad = 3;
  if (j.piernaMala === undefined) j.piernaMala = 3;
  j.ovr = calcularOVR(j);
  return j;
}

// Guarda toda la lista de jugadores.
function guardarJugadores(lista) {
  localStorage.setItem(CLAVE_JUGADORES, JSON.stringify(lista));
}

// ---------- Configuración del partido ----------

function cargarConfig() {
  var config = { equipos: 2, porEquipo: 5, forzarArqueros: true };
  var texto = localStorage.getItem(CLAVE_CONFIG);
  if (texto) {
    try {
      var guardada = JSON.parse(texto);
      // Copiamos los valores guardados encima de los valores por defecto.
      config.equipos = guardada.equipos;
      config.porEquipo = guardada.porEquipo;
      config.forzarArqueros = guardada.forzarArqueros;
    } catch (e) { /* si está corrupta, usamos la de defecto */ }
  }
  return config;
}

function guardarConfig(config) {
  localStorage.setItem(CLAVE_CONFIG, JSON.stringify(config));
}

// ---------- Crear un jugador ----------

// Recibe un objeto con nombre, posicion y los 6 atributos,
// y devuelve un jugador completo con todo lo que necesita la app.
// partidos/ganados/empatados/perdidos son el registro del jugador:
// cada vez que se carga un resultado, se actualizan. Siempre empiezan en 0.
function crearJugador(datos) {
  var jugador = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    nombre: datos.nombre || '',
    posicion: datos.posicion || 'MED',
    fisica: ajustarStat(datos.fisica),
    velocidad: ajustarStat(datos.velocidad),
    control: ajustarStat(datos.control),
    pase: ajustarStat(datos.pase),
    definicion: ajustarStat(datos.definicion),
    gambeta: ajustarStat(datos.gambeta),
    defensa: ajustarStat(datos.defensa),
    habilidad: ajustarEstrella(datos.habilidad),
    piernaMala: ajustarEstrella(datos.piernaMala),
    foto: datos.foto || '',
    partidos: 0,
    ganados: 0,
    empatados: 0,
    perdidos: 0
  };
  jugador.ovr = calcularOVR(jugador);
  return jugador;
}

// Fuerza que una estrella (skill/pierna mala) esté siempre entre 1 y 5.
function ajustarEstrella(valor) {
  var n = Number(valor);
  if (isNaN(n)) return 3;
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n);
}

// Fuerza que un atributo esté siempre entre 1 y 100.
function ajustarStat(valor) {
  var n = Number(valor);
  if (isNaN(n)) return 50;
  if (n < 1) return 1;
  if (n > 100) return 100;
  return Math.round(n);
}

// ---------- Cálculo del OVR ----------

// OVR = suma de (atributo × peso) según la posición.
function calcularOVR(jugador) {
  var pesos = PESOS_POSICION[jugador.posicion] || PESOS_POSICION.MED;
  var total = 0;
  for (var i = 0; i < ORDEN_STATS.length; i++) {
    var stat = ORDEN_STATS[i];
    total = total + (jugador[stat] || 0) * pesos[stat];
  }
  return Math.round(total);
}

// Devuelve los 2 colores del degradado de la tarjeta según el OVR.
function colorRating(ovr) {
  if (ovr >= 99) return {c1:  '#e9c708', c2: '#fbfbff' };     // icono
  if (ovr >= 98) return {c1:  '#e9c708', c2: '#1b06d8' };    // Toty
  if (ovr >= 90) return {c1:  '#8826f8', c2: '#9002ac' };    // nashe
  if (ovr >= 85) return { c1: '#ffd900', c2: '#f70909' };   // oro especial
  if (ovr >= 80) return { c1: '#e3e938', c2: '#d97706' };   // oro brillante
  if (ovr >= 75) return { c1: '#b99009', c2: '#bd792c' };   // oro pobre
  if (ovr >= 55) return { c1: '#9ca3af', c2: '#6b7280' };   // plateado
  return { c1: '#814216', c2: '#3d1916' };                  // bronce
}

// ---------- Historial de partidos ----------

// Un partido guarda:
//  - fecha: texto legible
//  - goles: arreglo con los goles de cada equipo
//  - equipos: los jugadores que jugaron, copiados (snapshot)
// Se copian porque si después se edita un jugador, el partido
// tiene que seguir mostrando cómo estaba ese día.
function crearPartido(equiposJugados, goles, fecha) {
  var copias = [];
  for (var t = 0; t < equiposJugados.length; t++) {
    var equipo = [];
    for (var i = 0; i < equiposJugados[t].length; i++) {
      var jug = equiposJugados[t][i];
      equipo.push({
        id: jug.id,
        nombre: jug.nombre,
        posicion: jug.posicion,
        ovr: jug.ovr
      });
    }
    copias.push(equipo);
  }
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    fecha: fecha,
    goles: goles,
    equipos: copias
  };
}

function cargarHistorial() {
  var texto = localStorage.getItem(CLAVE_HISTORIAL);
  if (!texto) return [];
  try {
    return JSON.parse(texto);
  } catch (e) {
    return [];
  }
}

function guardarHistorial(lista) {
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista));
}

// ---------- Jugadores de ejemplo ----------

// Crea 10 jugadores de prueba para que puedas probar la app.
// El registro (PJ/G/E/P) arranca en 0 para todos.
function jugadoresDemo() {
  var datosBase = [
    ['Nico',   'DEL', 78, 82, 74, 62, 88, 80, 40],
    ['Santi',  'DEL', 70, 68, 75, 71, 80, 72, 45],
    ['Lucas',  'MED', 74, 66, 82, 84, 60, 78, 60],
    ['Tomi',   'MED', 71, 62, 76, 79, 68, 74, 58],
    ['Ramiro', 'DEF', 80, 58, 62, 70, 79, 40, 85],
    ['Coki',   'DEF', 84, 63, 60, 65, 76, 45, 88],
    ['Juampi', 'POR', 76, 55, 66, 64, 82, 35, 80],
    ['Fran',   'POR', 68, 48, 63, 60, 86, 30, 75],
    ['Bauti',  'DEL', 82, 90, 80, 68, 85, 92, 38],
    ['Marco',  'MED', 66, 60, 70, 74, 62, 66, 55]
  ];
  var lista = [];
  for (var i = 0; i < datosBase.length; i++) {
    var d = datosBase[i];
    lista.push(crearJugador({
      nombre: d[0],
      posicion: d[1],
      fisica: d[2],
      velocidad: d[3],
      control: d[4],
      pase: d[5],
      definicion: d[6],
      gambeta: d[7],
      defensa: d[8]
    }));
  }
  return lista;
}