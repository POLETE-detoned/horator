# Horator

Juego móvil (PWA, mobile-first) para mejorar la **oratoria** y el **vocabulario en español** en ratos muertos: partidas de 2 a 5 minutos, a una mano y, si hace falta, en silencio.

## Modos

| Modo | Qué entrena | Cómo se juega |
| --- | --- | --- |
| 🎙️ **Notas de voz** | Persuasión | Chat estilo WhatsApp con personajes IA (Lucía, Marta la entrevistadora, Don Ramiro el cliente difícil). Te mandan una nota de voz (TTS); mantienes pulsado para responder y al soltar se envía. Ganas de 1 a 3 ⭐ al instante (riqueza léxica + tiempo de reacción) y el personaje responde según lo que has dicho. Un medidor de convencimiento decide si ganas en 4 turnos. |
| 📸 **Arcade 60 s** | Claridad | Cámara frontal a pantalla completa y un reto aleatorio (tema × tono). HUD en vivo: medidor de ritmo (ppm) con muelle, destello rojo + vibración por cada muletilla, aviso de silencios largos, palabras expertas que aparecen al decirlas. Resultado en tarjeta compartible (PNG, sin vídeo). **El vídeo nunca se graba ni se sube.** |
| 🃏 **Caza-sinónimos** | Léxico | Frase plana arriba; desliza tarjetas (→ elegir, ← descartar) con física de inercia, rebote y rotación. Combos con multiplicador, 5 niveles de dificultad léxica desbloqueables y una explicación breve por cada trampa. 100 % jugable sin sonido. |

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

Las respuestas de los personajes las genera Claude desde una función serverless (`api/roleplay.ts` → `server/roleplay.ts`) con salida JSON estructurada (`reply`, `persuasion_delta`, `mood`), esfuerzo bajo para minimizar latencia y *fallback* de servidor activado (`fallbacks: "default"`) por si el modelo declina una petición.

```bash
cp .env.example .env.local   # añade ANTHROPIC_API_KEY
```

- En desarrollo, Vite sirve `/api/roleplay` con el mismo manejador.
- En Vercel, `api/roleplay.ts` se despliega como función; define `ANTHROPIC_API_KEY` en las variables del proyecto.
- **Sin clave o sin conexión** el juego sigue funcionando: el endpoint responde 503 y el cliente usa el motor local de respuestas de cada escenario.

## Publicar en GitHub Pages

El workflow `.github/workflows/pages.yml` compila, pasa los tests y publica `dist/` en cada push a `main`.

1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Haz merge a `main` (o lanza el workflow a mano desde *Actions*).
3. La app queda en `https://<usuario>.github.io/horator/`. En el móvil: ábrela y usa *Añadir a pantalla de inicio*.

La web no se indexa en buscadores (`noindex` + `robots.txt`), pero quien tenga el enlace puede abrirla. Pages es estático: los personajes usan el motor local (la IA necesita la función serverless, p. ej. en Vercel). Publicar Pages desde un repo privado requiere GitHub Pro.

## Arquitectura

```
src/
  lib/        lexicon (puntuación, muletillas, ritmo) · speech (Web Speech API) · tts · feedback (hápticos + sfx sintetizados) · share (tarjeta PNG) · roleplayApi
  data/       personajes y escenarios · retos Arcade · rondas de sinónimos · árbol de poderes · misiones
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
