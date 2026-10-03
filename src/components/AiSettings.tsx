import { motion } from 'motion/react';
import { useState } from 'react';
import { customEndpoint, FREE_PRESET } from '../lib/aiConfig';
import { haptic } from '../lib/feedback';
import { useGame } from '../store/game';

const field = {
  width: '100%',
  height: 46,
  borderRadius: 14,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--text)',
  padding: '0 14px',
  font: 'inherit',
  fontSize: 15,
  userSelect: 'text',
} as const;

/** Hoja inferior de ajustes de IA: IA gratuita pública y proveedor propio. */
export function AiSettings({ onClose }: { onClose: () => void }) {
  const ai = useGame((s) => s.settings.ai);
  const setSettings = useGame((s) => s.setSettings);
  const [open, setOpen] = useState(Boolean(ai.custom.url));
  const set = (patch: Partial<typeof ai>) => setSettings({ ai: { ...ai, ...patch } });
  const setCustom = (patch: Partial<typeof ai.custom>) => set({ custom: { ...ai.custom, ...patch } });
  const customOk = customEndpoint(ai.custom) !== null;
  const freeOn = ai.freeAi === 'on';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(5,3,15,.6)', zIndex: 30 }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '88%',
          overflowY: 'auto',
          background: 'var(--bg-2)',
          borderRadius: '28px 28px 0 0',
          padding: '16px 16px calc(var(--safe-b) + 18px)',
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)', margin: '0 auto 14px' }} />
        <h2 className="h2">IA de los personajes</h2>
        <p className="muted" style={{ margin: '4px 0 14px', fontSize: 14 }}>
          Sin IA los personajes responden con frases predefinidas. Con IA reaccionan a lo que dices de verdad.
        </p>

        <button
          className="row"
          onClick={() => {
            haptic.tap();
            set({ freeAi: freeOn ? 'off' : 'on' });
          }}
          aria-pressed={freeOn}
          style={{ width: '100%', gap: 12, padding: 14, borderRadius: 18, background: 'var(--card)', textAlign: 'left', border: `2px solid ${freeOn ? 'var(--good)' : 'var(--line)'}` }}
        >
          <span style={{ fontSize: 26 }}>{freeOn ? '✅' : '⬜'}</span>
          <span style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>IA pública y gratuita</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Sin registro ni clave ({FREE_PRESET.name}). Tus respuestas transcritas se envían a ese servicio externo; no se envía audio ni vídeo.
            </div>
          </span>
        </button>

        <button className="row" onClick={() => setOpen((o) => !o)} style={{ width: '100%', margin: '14px 0 6px', fontWeight: 900 }}>
          <span>{open ? '▾' : '▸'} Usar mi propio proveedor</span>
          {ai.custom.url && <span className="chip" style={{ fontSize: 12, color: customOk ? 'var(--good)' : 'var(--bad)' }}>{customOk ? 'Activo' : 'Revisa los datos'}</span>}
        </button>
        {open && (
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              style={field}
              placeholder="URL base · https://api.groq.com/openai/v1"
              value={ai.custom.url}
              onChange={(e) => setCustom({ url: e.target.value })}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <input style={field} placeholder="Modelo · llama-3.3-70b-versatile" value={ai.custom.model} onChange={(e) => setCustom({ model: e.target.value })} autoCapitalize="none" autoCorrect="off" />
            <input style={field} type="password" placeholder="Clave API (opcional)" value={ai.custom.key} onChange={(e) => setCustom({ key: e.target.value })} autoComplete="off" />
            <div className="muted" style={{ fontSize: 12 }}>
              Vale cualquier API compatible con OpenAI (Groq, OpenRouter, Gemini…). La clave se guarda solo en este dispositivo y solo se envía a esa URL. Usa una clave con límite de gasto.
            </div>
          </div>
        )}
        <button className="btn block" style={{ marginTop: 16 }} onClick={onClose}>
          Listo
        </button>
      </motion.div>
    </motion.div>
  );
}
