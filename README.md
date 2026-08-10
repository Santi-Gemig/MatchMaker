# ⚽ MatchMaker · Armá los equipos más parejos

Web app que arma **equipos equilibrados de fútbol 5 vs 5** en segundos.

Cargás a los jugadores de tu partido (con su foto y sus atributos), marcás quiénes juegan y MatchMaker reparte los equipos para que la suma de OVR quede lo más pareja posible. ¿Después del partido? Cargás el resultado y el historial de cada jugador se actualiza solo.

## ✨ ¿Qué hace?

- **Jugadores con atributos estilo FIFA**: 7 habilidades (1–100) que definen el OVR según la posición, más 2 estrellas (skill y pierna mala) que no afectan el puntaje.
- **OVR por posición**: el arquero pesa más el tiro y el físico, el delantero pesa más el tiro y la gambeta... Cada posición tiene sus propios pesos.
- **Armado automático (`⚖️`)**: snake draft + miles de intercambios simulados + varias semillas aleatorias → el armado más parejo (con opción "🎲 Barajar de nuevo" si das el visto bueno con 50% a otro igual de parejo).
- **Armado manual (`✋`)**: tocás los jugadores libres y los mandás al equipo E1 / E2 (o 3, o 4). La suma de OVR se actualiza en vivo.
- **Cancha 5 vs 5**: los equipos se dibujan con las fotos, posiciones y OVR. La banda de arriba muestra suma y promedio por equipo.
- **Partido jugado → cargar resultado**: elegís cuántos goles hizo cada equipo y el historial suma G/E/P automáticamente.
- **Historial por jugador y por partido**: cada entrada guarda la formación, archivos, resultado y reverte los registros si borrás el partido.
- **Fotos de perfil**: imagen local o fallback con iniciales.
- **Avatares demo**: un toque y tenés jugadores de ejemplo para probar.

## 🚀 Cómo usarla

No necesita instalación ni servidor:

1. Descargá/cloná el proyecto.
2. Abrí `index.html` en cualquier navegador (funciona de maravilla en el **celular**).
3. Cargá tus jugadores y ¡a armar!

Todo se guarda en el **localStorage** de tu navegador, así que tus jugadores y el historial persisten entre visitas.

## 🧠 Cómo funciona el algoritmo

1. **Preselección**: se marcan automáticamente los mejores por OVR (cambiables).
2. **Draft de serpiente**: los jugadores se reparten alternados (el mejor al E1, el segundo al E2, el tercero al E2...).
3. **Optimización**: se prueban miles de intercambios de un jugador entre equipos y se conserva el que más iguala la suma de OVR.
4. **Varias semillas**: se repite con varios armados aleatorios y se elige el más parejo (con `forzar arqueros` reparte los arquero cuando hay más de uno).
5. **Empates**: si hay armados con el mismo costo, a veces (50% aleatorio) se muestra uno distinto para variar.

## 📁 Estructura

```
.
├── index.html          # Interfaz: jugadores, armado (auto + manual), historial
├── css/
│   └── style.css       # Tema oscuro, cancha, tarjetas, modales
└── js/
    ├── data.js         # Modelo del jugador, pesos por posición, OVR, localStorage
    ├── balance.js      # El "cerebro": arma los equipos más parejos
    └── app.js          # Interfaz: pestañas, tarjetas, cancha, historial, armado manual
```

Vanilla JavaScript, **cero dependencias**, sin frameworks ni build. Código con comentarios en español pensado para aprender.

## 🗺️ Próximos pasos

- [ ] Base de datos + login (reemplazar `localStorage`)
- [ ] Deploy en la nube (Netlify/Cloudflare Pages)
- [ ] Más modos (fútbol 7, fechas de liga, ranking)

---
Hecho con 🧡 para los partidos del barrio.
