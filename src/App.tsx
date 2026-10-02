import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { RewardLayer } from './components/RewardLayer';
import { unlockAudio } from './lib/feedback';
import { getTg, initTelegram } from './lib/telegram';
import { ArcadeScreen } from './modes/arcade/ArcadeScreen';
import { RoleplayScreen } from './modes/roleplay/RoleplayScreen';
import { SynonymScreen } from './modes/synonyms/SynonymScreen';
import { Lobby } from './screens/Lobby';
import { Powers } from './screens/Powers';
import { useGame } from './store/game';

export type Route = 'lobby' | 'powers' | 'roleplay' | 'arcade' | 'synonyms';

const TABS: Route[] = ['lobby', 'powers'];

export default function App() {
  const [route, setRoute] = useState<Route>('lobby');
  const refreshDay = useGame((s) => s.refreshDay);
  const [tgReady, setTgReady] = useState(false);

  const go = useCallback((r: Route) => {
    unlockAudio();
    // El gesto "atrás" de Android vuelve al lobby en vez de cerrar la app.
    if (!TABS.includes(r)) history.pushState({ r }, '');
    setRoute(r);
  }, []);

  useEffect(() => {
    const onPop = () => setRoute('lobby');
    const onVisible = () => document.visibilityState === 'visible' && refreshDay();
    window.addEventListener('popstate', onPop);
    document.addEventListener('visibilitychange', onVisible);
    refreshDay();
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshDay]);

  const back = useCallback(() => {
    if (history.state?.r) history.back();
    else setRoute('lobby');
  }, []);

  const inGame = !TABS.includes(route);

  useEffect(() => {
    void initTelegram().then(setTgReady);
  }, []);

  // Dentro de Telegram, el botón Atrás nativo (cabecera) sustituye al gesto del sistema.
  useEffect(() => {
    const w = tgReady ? getTg() : undefined;
    if (!w) return;
    if (!inGame) {
      w.BackButton.hide();
      return;
    }
    w.BackButton.show();
    w.BackButton.onClick(back);
    return () => w.BackButton.offClick(back);
  }, [tgReady, inGame, back]);

  return (
    <div className="app">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={route}
          className="screen"
          initial={{ opacity: 0, y: inGame ? 40 : 0, scale: inGame ? 0.98 : 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          style={{ padding: inGame ? 0 : undefined }}
        >
          {route === 'lobby' && <Lobby go={go} />}
          {route === 'powers' && <Powers go={go} />}
          {route === 'roleplay' && <RoleplayScreen onExit={back} />}
          {route === 'arcade' && <ArcadeScreen onExit={back} />}
          {route === 'synonyms' && <SynonymScreen onExit={back} />}
        </motion.div>
      </AnimatePresence>
      <RewardLayer />
    </div>
  );
}
