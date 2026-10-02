// Integración con Telegram Mini Apps (https://core.telegram.org/bots/webapps).
// Una Mini App es esta misma web abierta dentro de Telegram: no hace falta un servidor para el bot.
// El script oficial solo se carga cuando Telegram abre la app, así que el resto de usuarios no lo descargan.

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

export interface TgWebApp {
  initData: string;
  version: string;
  platform?: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(version: string): boolean;
  disableVerticalSwipes?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  HapticFeedback?: {
    impactOccurred(style: HapticImpact): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const THEME_COLOR = '#120d24';
const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';

/** Telegram abre las Mini Apps con parámetros tgWebApp* en el hash de la URL. */
export const looksLikeTelegram = () => typeof location !== 'undefined' && /tgWebApp(Data|Version|Platform)/.test(location.hash);

/** Devuelve el objeto WebApp solo si realmente estamos dentro de Telegram (initData no vacío). */
export function getTg(): TgWebApp | undefined {
  const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  return w && w.initData ? w : undefined;
}

export const inTelegram = () => getTg() !== undefined;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('sdk_load_failed'));
    document.head.appendChild(el);
  });
}

/** Prepara la app para Telegram: pantalla completa, colores, sin cierre accidental al deslizar. */
export async function initTelegram(): Promise<boolean> {
  if (!looksLikeTelegram()) return false;
  if (!window.Telegram?.WebApp) {
    try {
      await loadScript(SDK_URL);
    } catch {
      return false;
    }
  }
  const w = getTg();
  if (!w) return false;
  try {
    w.ready();
    w.expand();
    // Imprescindible: sin esto, deslizar hacia abajo (swipe de tarjetas, scroll) cierra la Mini App.
    if (w.isVersionAtLeast('7.7')) w.disableVerticalSwipes?.();
    if (w.isVersionAtLeast('6.1')) {
      w.setHeaderColor?.(THEME_COLOR);
      w.setBackgroundColor?.(THEME_COLOR);
    }
    if (w.isVersionAtLeast('7.10')) w.setBottomBarColor?.(THEME_COLOR);
  } catch {
    /* clientes antiguos: la app sigue funcionando sin los extras */
  }
  document.documentElement.classList.add('in-telegram');
  return true;
}

/** Abre esta misma web en el navegador del sistema (donde el dictado por voz sí funciona). */
export function openInBrowser() {
  const url = `${location.origin}${location.pathname}`;
  const w = getTg();
  if (w) w.openLink(url, { try_instant_view: false });
  else window.open(url, '_blank', 'noopener');
}
