# Horator en Telegram (Mini App)

Una Mini App es esta misma web abierta dentro de Telegram. **No hay que programar ni alojar un bot**: solo registrar la URL pública de la web con @BotFather.

## Por qué Telegram y no la App Store

| | Telegram Mini App | App de iOS |
| --- | --- | --- |
| Coste | Gratis | 99 $/año (Apple Developer) |
| Requisitos | Un móvil y la URL HTTPS de la web | Mac con Xcode, empaquetar con Capacitor, certificados |
| Revisión | Ninguna | Revisión de Apple (las webs empaquetadas se rechazan con frecuencia) |
| Tiempo | ~10 minutos | Días o semanas |
| Actualizar | Haces push a `main` y listo | Nueva versión + nueva revisión |

En iPhone también puedes instalarla sin nada de esto: Safari → Compartir → **Añadir a pantalla de inicio**.

## Requisitos

1. La web publicada en una URL **HTTPS** pública (p. ej. `https://polete-detoned.github.io/horator/`; ver la sección de GitHub Pages del README).
2. Una cuenta de Telegram.

## Crear la Mini App

En Telegram, abre [@BotFather](https://t.me/BotFather):

1. `/newbot` → elige nombre y usuario (debe acabar en `bot`). Guarda el *token*; **no hace falta para Horator**, no lo pegues en ningún sitio.
2. `/newapp` → elige tu bot y rellena:
   - **Título:** `Horator`
   - **Descripción:** `Mejora tu oratoria y tu vocabulario jugando partidas de 2 minutos.`
   - **Foto (640×360):** sube `docs/telegram-banner-640x360.png`.
   - **GIF demo:** `/empty` (opcional).
   - **URL de la Web App:** la de tu web HTTPS.
   - **Nombre corto:** `horator`.
3. Telegram te da un enlace directo: `https://t.me/<tu_bot>/horator`. Compártelo y se abre a pantalla completa.

Para que además aparezca un botón **«Jugar»** en el chat del bot: `/mybots` → tu bot → **Bot Settings → Menu Button → Configure menu button** → pega la URL y pon el texto `🎮 Jugar`.

## Qué hace la app dentro de Telegram

- Se expande a pantalla completa, usa los colores de la app en la cabecera y **desactiva el cierre por deslizamiento** (si no, deslizar tarjetas o hacer scroll cerraría la Mini App).
- El botón **Atrás** nativo de la cabecera aparece dentro de cada partida.
- **Hápticos nativos** de Telegram (en iPhone `navigator.vibrate` no existe).
- Si el dictado por voz no está disponible, ofrece abrir la web en el navegador del móvil.

## Limitaciones

- **Dictado por voz:** la Web Speech API suele no estar disponible en el navegador interno de Telegram, sobre todo en iPhone. Dentro de Telegram, **Caza-sinónimos funciona entero**; Notas de voz funciona escribiendo, y para hablar o usar las métricas del Arcade hay un botón **«Abrir en el navegador»**.
- **Cámara (Arcade):** depende de la versión de Telegram y de los permisos de cámara del móvil.
- **Compartir la tarjeta del Arcade:** el menú de compartir del sistema puede no estar disponible dentro de Telegram.
- Esto se ha probado con un Telegram simulado en navegador, no en la app real: prueba el enlace en tu móvil antes de compartirlo.

## Privacidad

El progreso se guarda en el almacenamiento local del navegador de Telegram. Si activas la IA gratuita, tus respuestas **transcritas** se envían al servicio externo elegido (sin audio ni vídeo). La app no lee tu identidad de Telegram.
