// Configuración de los proveedores de IA de los personajes.

export interface CustomAi {
  /** Base de una API compatible con OpenAI (p. ej. https://api.groq.com/openai/v1). */
  url: string;
  model: string;
  /** Se guarda solo en este dispositivo y solo se envía a la URL indicada. */
  key: string;
}

export interface AiConfig {
  /** IA pública y gratuita sin clave: el texto transcrito sale a un servicio de terceros, así que requiere consentimiento. */
  freeAi: 'unset' | 'on' | 'off';
  custom: CustomAi;
}

export const DEFAULT_AI: AiConfig = { freeAi: 'unset', custom: { url: '', model: '', key: '' } };

/** Preset de IA gratuita y pública. Se puede cambiar al compilar con VITE_FREE_AI_URL / VITE_FREE_AI_MODEL. */
export const FREE_PRESET = {
  name: 'Pollinations',
  url: (import.meta.env?.VITE_FREE_AI_URL as string | undefined) ?? 'https://text.pollinations.ai/openai',
  model: (import.meta.env?.VITE_FREE_AI_MODEL as string | undefined) ?? 'openai',
};

export function customEndpoint(c: CustomAi): string | null {
  const base = c.url.trim().replace(/\/+$/, '');
  if (!base || !c.model.trim()) return null;
  // Solo HTTPS (o localhost para desarrollo): la clave nunca viaja en claro.
  if (!/^https:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base)) return null;
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
}
