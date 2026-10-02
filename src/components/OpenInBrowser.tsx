import { inTelegram, openInBrowser } from '../lib/telegram';

/** Dentro de Telegram el dictado por voz suele no estar disponible: se ofrece abrir la web en el navegador. */
export function OpenInBrowser({ label = 'Abrir en el navegador' }: { label?: string }) {
  if (!inTelegram()) return null;
  return (
    <button className="chip" onClick={openInBrowser} style={{ background: 'var(--accent)' }}>
      🌐 {label}
    </button>
  );
}
