import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureFeedback, haptic } from '../src/lib/feedback';
import { getTg, inTelegram, looksLikeTelegram } from '../src/lib/telegram';

const fakeWebApp = (initData = 'query_id=1') => ({
  initData,
  HapticFeedback: { impactOccurred: vi.fn(), notificationOccurred: vi.fn(), selectionChanged: vi.fn() },
});

afterEach(() => vi.unstubAllGlobals());

describe('Telegram', () => {
  it('detecta la Mini App por el hash y por initData', () => {
    vi.stubGlobal('location', { hash: '#tgWebAppData=abc&tgWebAppVersion=8.0' });
    expect(looksLikeTelegram()).toBe(true);
    vi.stubGlobal('location', { hash: '' });
    expect(looksLikeTelegram()).toBe(false);

    vi.stubGlobal('window', { Telegram: { WebApp: fakeWebApp('') } });
    expect(inTelegram()).toBe(false); // el SDK existe pero no estamos dentro de Telegram
    vi.stubGlobal('window', { Telegram: { WebApp: fakeWebApp() } });
    expect(getTg()).toBeDefined();
  });

  it('los hápticos usan el motor nativo de Telegram y respetan el ajuste', () => {
    const wa = fakeWebApp();
    vi.stubGlobal('window', { Telegram: { WebApp: wa } });
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    configureFeedback({ sound: true, haptics: true });
    haptic.tap();
    haptic.success();
    haptic.error();
    haptic.filler();
    expect(wa.HapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
    expect(wa.HapticFeedback.impactOccurred).toHaveBeenCalledWith('rigid');
    expect(wa.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');
    expect(wa.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('error');
    expect(vibrate).not.toHaveBeenCalled();

    configureFeedback({ sound: true, haptics: false });
    haptic.tap();
    expect(wa.HapticFeedback.impactOccurred).toHaveBeenCalledTimes(2);
  });

  it('fuera de Telegram usa navigator.vibrate', () => {
    vi.stubGlobal('window', {});
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    configureFeedback({ sound: true, haptics: true });
    haptic.success();
    expect(vibrate).toHaveBeenCalled();
  });
});
