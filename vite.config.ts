import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** En desarrollo sirve /api/roleplay con el mismo manejador que la función serverless. */
function devApi(): Plugin {
  return {
    name: 'horator-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/roleplay', async (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const { handleRoleplay } = (await server.ssrLoadModule('/server/roleplay.ts')) as typeof import('./server/roleplay');
        const response = await handleRoleplay(
          new Request('http://localhost/api/roleplay', {
            method: req.method,
            headers: { 'content-type': 'application/json' },
            body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
          }),
        );
        res.statusCode = response.status;
        res.setHeader('content-type', 'application/json');
        res.end(await response.text());
      });
    },
  };
}

/**
 * Service worker con precache: tras la primera visita todo el juego (JS, CSS, fuentes, iconos)
 * está en caché → cero pantallas de carga y jugable sin conexión (salvo las respuestas IA).
 */
function serviceWorker(): Plugin {
  return {
    name: 'horator-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      // Solo subconjuntos latinos de la fuente: el resto no se usa en español.
      const assets = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !/(cyrillic|greek|vietnamese)/.test(f));
      const extra = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon.svg'];
      const version = Date.now().toString(36);
      const template = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify([...extra, ...assets.map((a) => `./${a}`)])),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // La clave solo se expone al proceso de Node (middleware de desarrollo), nunca al bundle del cliente.
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY ??= env.ANTHROPIC_API_KEY;
  return {
    base: './',
    plugins: [react(), devApi(), serviceWorker()],
    server: { host: true },
    build: { target: 'es2022', assetsInlineLimit: 0 },
  };
});
