# Horator

Juego móvil (PWA, mobile-first) para mejorar la **oratoria** y el **vocabulario en español** en ratos muertos: partidas de 2 a 5 minutos, a una mano y, si hace falta, en silencio.

## Modos

| Modo | Qué entrena | Cómo se juega |
| --- | --- | --- |
| 🎙️ **Notas de voz** | Persuasión | Chat estilo WhatsApp con personajes IA (Lucía, Marta la entrevistadora, Don Ramiro el cliente difícil). Te mandan una nota de voz (TTS); mantienes pulsado para responder y al soltar se envía. Ganas de 1 a 3 ⭐ al instante (riqueza léxica + tiempo de reacción) y el personaje responde según lo que has dicho. Un medidor de convencimiento decide si ganas en 4 turnos. |
| 📸 **Arcade 60 s** | Claridad | Cámara frontal a pantalla completa y un reto aleatorio (tema × tono). HUD en vivo: medidor de ritmo (ppm) con muelle, destello rojo + vibración por cada muletilla, aviso de silencios largos, palabras expertas que aparecen al decirlas. Resultado en tarjeta compartible (PNG, sin vídeo). **El vídeo nunca se graba ni se sube.** |
| 🃏 **Caza-sinónimos** | Léxico | Frase plana arriba; desliza tarjetas (→ elegir, ← descartar) con física de inercia, rebote y rotación. Combos con multiplicador, 5 niveles de dificultad léxica desbloqueables y una explicación breve por cada trampa. 100 % jugable sin sonido. |

## Contenido sin repeticiones

| Modo | Niveles | Contenido |
| --- | --- | --- |
| 🃏 Caza-sinónimos | Básico, Profesional, Preciso, Culto, Maestro | 550 frases por nivel (2.750), cada una con sus alternativas buenas y sus trampas explicadas |
| 📸 Arcade 60 s | Básico, Medio, Avanzado (se elige antes del reto) | 550 temas por nivel (1.650) × 40 tonos × 3 formatos por nivel |
| 🎙️ Notas de voz | Lucía (Básico), Marta (Medio), Don Ramiro (Avanzado) | 550 situaciones por personaje (1.650) |

Cada nivel funciona como una **bolsa sin repetición** (`src/lib/bag.ts`): no vuelve a salir una frase, un tema o una situación hasta haber jugado todos los de ese nivel, y la bolsa se guarda en el dispositivo, así que tampoco se repite entre partidas.

El contenido está en `src/data/content/` (un elemento por línea) y cada modo lo descarga solo al abrirse:

- `sinonimos/nN-*.ts`: `Frase con el {fragmento}. | buena, buena, buena | trampa = Por qué no vale. | trampa = Por qué no vale.`
- `arcade/nN-*.ts`: el tema como oración que sigue a «Convénceme de que…».
- `escenarios/<personaje>-*.ts`: `Título | Primera nota de voz | Objetivo | palabra, palabra, palabra`. Tras añadir un archivo de situaciones hay que importarlo en `escenarios/index.ts`.

## Metajuego

- **Poderes** (árbol de habilidades): Persuasión, Claridad y Léxico se cargan jugando cada modo. Cada nodo es una ventaja real: nuevos personajes, *Chuleta*, *Metrónomo*, *Radar de muletillas*, *Respiro*, *Comodín*, *Escudo de combo*, *Reloj de arena*, *Multiplicador ×5*…
- **Racha diaria** con protectores (se gana uno cada 7 días).
- **3 misiones diarias** deterministas por fecha + cofre al completarlas.
- **Niveles de jugador** por XP. Todas las recompensas se celebran en una capa global (XP, misión, nuevo poder, subida de nivel).

## Principios aplicados

- **< 3 s para jugar:** “Jugar ya” en el lobby y cada modo arranca directamente (sin menús intermedios). Las rondas siguientes entran sin pantallas de carga y el service worker precachea todo el juego tras la primera visita.
- **Recompensa inmediata:** la puntuación se calcula en el cliente (`src/lib/lexicon.ts`), así que las estrellas aparecen al soltar el botón; la respuesta de la IA llega después como segundo “beat”, disfrazada de “grabando audio…”.
- **El motion es la mecánica:** el medidor de ritmo sube y baja con un muelle, la palabra elegida sustituye al fragmento de la frase, las estrellas aparecen una a una, los bordes destellan con cada muletilla.
- **Modo silencioso** (🔇 en el lobby): sin sonido ni voz; las notas de voz se muestran subtituladas y “Jugar ya” lleva a Caza-sinónimos.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173 (también accesible en la red local)
npm test           # tests del motor léxico, progreso, sinónimos, arcade y API
npm run build      # typecheck + build de producción en dist/
```

Para probar micrófono y cámara en el móvil hace falta HTTPS (p. ej. desplegar en Vercel o usar un túnel).

### Personajes con IA

Los personajes pueden responder con tres niveles, probados en este orden (el primero que responde gana; todo comparte un presupuesto de 10 s y, si ninguno responde, se usa el motor local):

1. **Tu propio proveedor** (⚙️ en el lobby → *Usar mi propio proveedor*): cualquier API compatible con OpenAI (Groq, OpenRouter, Gemini…). La clave se guarda solo en el dispositivo, solo se envía a esa URL y solo se acepta HTTPS.
2. **Servidor propio con Claude** (`api/roleplay.ts` → `server/roleplay.ts`): salida JSON estructurada, esfuerzo bajo y *fallback* de servidor (`fallbacks: "default"`). Requiere desplegar la función (Vercel) con `ANTHROPIC_API_KEY`; la clave nunca llega al navegador.
3. **IA pública y gratuita sin clave** (Pollinations, por defecto): funciona incluso en GitHub Pages. **Requiere consentimiento** (la app lo pregunta una vez) porque las respuestas transcritas salen a un servicio externo; no se envía audio ni vídeo. Se puede cambiar el servicio al compilar con `VITE_FREE_AI_URL` y `VITE_FREE_AI_MODEL`. Tras dos fallos seguidos deja de intentarse en esa sesión.

```bash
cp .env.example .env.local   # solo si usas el servidor propio: añade ANTHROPIC_API_KEY
```

- En desarrollo, Vite sirve `/api/roleplay` con el mismo manejador.
- **Sin ningún proveedor o sin conexión** el juego sigue funcionando con las frases predefinidas de cada escenario.
- Los proveedores sin salida estructurada pueden devolver JSON envuelto en texto: `parseReply` (`src/lib/rolePrompt.ts`) lo tolera y descarta respuestas cortadas para no leer código en voz alta.

## Telegram

Horator funciona como **Telegram Mini App** sin código extra de servidor: se registra la URL de la web en @BotFather y se comparte un enlace `t.me/...`. Guía paso a paso, imagen de portada y limitaciones en [`docs/TELEGRAM.md`](docs/TELEGRAM.md). Es mucho más simple que publicar en la App Store (99 $/año, Mac, revisión de Apple); en iPhone también se puede instalar con *Añadir a pantalla de inicio*.

## Publicar en GitHub Pages

El workflow `.github/workflows/pages.yml` compila, pasa los tests y publica `dist/` en cada push a `main`.

1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Haz merge a `main` (o lanza el workflow a mano desde *Actions*).
3. La app queda en `https://<usuario>.github.io/horator/`. En el móvil: ábrela y usa *Añadir a pantalla de inicio*.

La web no se indexa en buscadores (`noindex` + `robots.txt`), pero quien tenga el enlace puede abrirla. Pages es estático: no hay servidor propio, pero los personajes pueden usar la IA pública gratuita (con tu consentimiento) o tu propio proveedor; la función con Claude necesita Vercel. Publicar Pages desde un repo privado requiere GitHub Pro.

## Arquitectura

```
src/
  lib/        bag (sin repeticiones) · lexicon (puntuación, muletillas, ritmo) · speech (Web Speech API) · tts · feedback (hápticos + sfx sintetizados) · share (tarjeta PNG) · roleplayApi (cadena de proveedores IA) · rolePrompt · telegram (Mini App)
  data/       personajes · retos Arcade · sinónimos · árbol de poderes · misiones · content/ (todas las frases, temas y situaciones)
  store/      progress.ts (lógica pura del metajuego, testeada) · game.ts (zustand + persistencia local)
  modes/      roleplay/ · arcade/ · synonyms/
  screens/    Lobby · Powers
server/       lógica del personaje IA (Claude)
api/          función serverless
tests/        vitest
```

Stack: React 19 + TypeScript + Vite, `motion` para animación/física, `zustand` para estado persistente. Sin backend propio salvo la función del roleplay; el progreso vive en `localStorage`.

## Limitaciones conocidas

- **Reconocimiento de voz:** usa la Web Speech API (Chrome/Android, Safari iOS). Donde no existe (Firefox) el roleplay ofrece responder escribiendo y el Arcade avisa de que no hay métricas.
- Los reconocedores tienden a “limpiar” sonidos como *eh/em*, así que esas muletillas se detectan peor que *o sea*, *en plan* o *bueno*.
- iOS no soporta `navigator.vibrate`: allí el feedback es solo visual y sonoro.
