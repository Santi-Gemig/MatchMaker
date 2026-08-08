// ============================================================
//  balance.js · EL "CEREBRO": ARMA LOS EQUIPOS MÁS PAREJOS
//  Idea general:
//   1) Empezamos armando los equipos de una forma ordenada
//      ("draft de serpiente": los mejores se reparten alternados).
//   2) Después probamos millones de intercambios de jugadores
//      entre equipos y nos quedamos con el que más iguala la
//      suma de OVR de cada equipo.
//   3) Repetimos con varios armados aleatorios y al final
//      nos quedamos con el más parejo de todos.
//
//  IMPORTANTE: esta función ya NO elige quién juega. Recibe la
//  lista de jugadores que el usuario marcó en la interfaz.
// ============================================================

// ---------- Utilidades ----------

// Devuelve la lista mezclada al azar (barajar cartas).
function mezclar(lista) {
  var copia = lista.slice();
  for (var i = copia.length - 1; i > 0; i--) {
    var posicionAzar = Math.floor(Math.random() * (i + 1));
    var aux = copia[i];
    copia[i] = copia[posicionAzar];
    copia[posicionAzar] = aux;
  }
  return copia;
}

// Devuelve una copia nueva de los equipos (para no romper la anterior).
function clonarEquipos(equipos) {
  var copia = [];
  for (var t = 0; t < equipos.length; t++) {
    copia.push(equipos[t].slice());
  }
  return copia;
}

// Cuenta cuántos arqueros (POR) hay en un equipo.
function contarArqueros(equipo) {
  var total = 0;
  for (var i = 0; i < equipo.length; i++) {
    if (equipo[i].posicion === 'POR') total++;
  }
  return total;
}

// ---------- Armados iniciales ----------

// "Draft de serpiente": ordenamos los jugadores del mejor al peor
// y los repartimos uno por uno. El primero (el mejor) va al equipo 1,
// el segundo al 2, así hasta el final, y en la segunda vuelta se invierte
// el orden. Así el mejor jugador lleva al rival del que le sigue.
function armadoEnSerpiente(elegidos, cantEquipos) {
  var ordenados = elegidos.slice().sort(function (a, b) {
    return b.ovr - a.ovr; // de mayor a menor OVR
  });
  var equipos = [];
  for (var e = 0; e < cantEquipos; e++) equipos.push([]);

  for (var i = 0; i < ordenados.length; i++) {
    var vuelta = Math.floor(i / cantEquipos);
    var col;
    if (vuelta % 2 === 0) {
      col = i % cantEquipos;                  // vuelta normal
    } else {
      col = cantEquipos - 1 - (i % cantEquipos); // vuelta invertida
    }
    equipos[col].push(ordenados[i]);
  }
  return equipos;
}

// Armado al azar: mezclamos los jugadores y los vamos poniendo
// en el equipo que tenga, en ese momento, la suma de OVR más chica.
// (así el reparto queda balanceado de entrada).
function armadoAleatorio(elegidos, cantEquipos) {
  var mezclados = mezclar(elegidos);
  var equipos = [];
  var sumas = [];
  for (var e = 0; e < cantEquipos; e++) {
    equipos.push([]);
    sumas.push(0);
  }
  for (var i = 0; i < mezclados.length; i++) {
    var mejorEquipo = 0;
    for (var t = 1; t < cantEquipos; t++) {
      if (sumas[t] < sumas[mejorEquipo]) mejorEquipo = t;
    }
    equipos[mejorEquipo].push(mezclados[i]);
    sumas[mejorEquipo] = sumas[mejorEquipo] + mezclados[i].ovr;
  }
  return equipos;
}

// ---------- Qué tan "parejo" está un armado (costo) ----------

// Un armado perfecto tiene costo 0 (todos los equipos suman lo mismo).
// Cuanto más grande la diferencia entre el equipo más fuerte y el más
// débil, más alto es el costo (peor es el armado).
// Si activamos "forzar arqueros", un equipo sin arquero o con más de
// uno también suma un castigo muy grande (60 puntos).
function calcularCosto(equipos, forzarArqueros) {
  var mayor = -1;
  var menor = 999999;
  for (var t = 0; t < equipos.length; t++) {
    var suma = 0;
    for (var i = 0; i < equipos[t].length; i++) {
      suma = suma + equipos[t][i].ovr;
    }
    if (suma > mayor) mayor = suma;
    if (suma < menor) menor = suma;
  }

  var costo = mayor - menor;

  if (forzarArqueros) {
    for (var e = 0; e < equipos.length; e++) {
      var gk = contarArqueros(equipos[e]);
      if (gk === 0) costo = costo + 60;            // le falta arquero
      if (gk > 1) costo = costo + 60 * (gk - 1);   // sobran arqueros
    }
  }
  return costo;
}

// ---------- Mejorar un armado (intercambios) ----------

// Proba intercambiar 1 jugador del equipo A con 1 del equipo B.
// Si el intercambio baja el costo, lo guardamos. Al final de la
// vuelta aplicamos "el mejor intercambio" encontrado y repetimos
// hasta que ya no haya ninguna mejora posible.
function mejorarEquipos(equipos, forzarArqueros) {
  var costoActual = calcularCosto(equipos, forzarArqueros);
  var cantEquipos = equipos.length;

  for (var intento = 0; intento < 900; intento++) {
    var mejorCosto = costoActual;
    var mejorMovimiento = null; // [equipoA, equipoB, posicionA, posicionB]

    for (var a = 0; a < cantEquipos; a++) {
      for (var b = a + 1; b < cantEquipos; b++) {
        var equipoA = equipos[a];
        var equipoB = equipos[b];
        for (var i = 0; i < equipoA.length; i++) {
          for (var j = 0; j < equipoB.length; j++) {
            // Probamos el intercambio y medimos el costo.
            var jugadorA = equipoA[i];
            var jugadorB = equipoB[j];
            equipoA[i] = jugadorB;
            equipoB[j] = jugadorA;
            var costoNuevo = calcularCosto(equipos, forzarArqueros);
            if (costoNuevo < mejorCosto) {
              mejorCosto = costoNuevo;
              mejorMovimiento = [a, b, i, j];
            }
            // Deshacemos el intento para probar el siguiente.
            equipoA[i] = jugadorA;
            equipoB[j] = jugadorB;
          }
        }
      }
    }

    // Si ningún intercambio mejora, ya está parejo como se puede.
    if (!mejorMovimiento) break;

    // Aplicamos el mejor intercambio encontrado.
    var ta = mejorMovimiento[0];
    var tb = mejorMovimiento[1];
    var pi = mejorMovimiento[2];
    var pj = mejorMovimiento[3];
    var aux = equipos[ta][pi];
    equipos[ta][pi] = equipos[tb][pj];
    equipos[tb][pj] = aux;
    costoActual = mejorCosto;
  }
  return equipos;
}

// ---------- Función principal ----------

// Recibe: los jugadores ELEGIDOS por el usuario, cuántos equipos hay
// y si se intenta repartir arqueros. Devuelve el mejor armado
// (arreglo de equipos) o null si el reparto no es exacto.
function armarEquipos(elegidos, cantEquipos, forzarArqueros) {
  // Los jugadores deben repartirse en partes iguales.
  if (elegidos.length % cantEquipos !== 0) return null;

  var mejorResultado = null;
  var mejorCosto = 999999; // "infinito"

  // Hacemos varios intentos y nos quedamos con el más parejo.
  for (var intento = 0; intento < 80; intento++) {
    var equipos;
    if (intento === 0) {
      // El primer intento usa el draft de serpiente.
      equipos = armadoEnSerpiente(elegidos, cantEquipos);
    } else {
      // Los demás intentos empiezan al azar.
      equipos = armadoAleatorio(elegidos, cantEquipos);
    }

    mejorarEquipos(equipos, forzarArqueros);

    var costo = calcularCosto(equipos, forzarArqueros);
    if (!mejorResultado || costo < mejorCosto) {
      mejorResultado = clonarEquipos(equipos);
      mejorCosto = costo;
    } else if (costo === mejorCosto && intento > 0 && Math.random() < 0.5) {
      // Empate de parejo: a veces dejamos pasar el armado alternativo.
      // Así el botón "Barajar de nuevo" puede mostrar un resultado
      // distinto aunque los equipos queden igual de parejos.
      mejorResultado = clonarEquipos(equipos);
    }
  }

  return mejorResultado;
}