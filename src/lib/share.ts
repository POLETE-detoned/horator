// Tarjeta de resultado compartible: se dibuja en un canvas (sin el vídeo del jugador) y se comparte como PNG.

export interface ShareStats {
  grade: string;
  prompt: string;
  expert: string[];
  fillers: number;
  blankSeconds: number;
  wpm: number;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderCard(s: ShareStats): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  await document.fonts?.ready;
  const font = (w: number, size: number) => `${w} ${size}px 'Nunito Variable', system-ui, sans-serif`;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2a1d5c');
  g.addColorStop(1, '#120d24');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#45d6ff';
  ctx.font = font(900, 40);
  ctx.fillText('HORATOR · ARCADE 60 s', 80, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = font(800, 46);
  wrap(ctx, `«${s.prompt}»`, W - 160)
    .slice(0, 4)
    .forEach((l, i) => ctx.fillText(l, 80, 210 + i * 62));

  // Nota
  ctx.font = font(900, 300);
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'center';
  ctx.fillText(s.grade, W / 2, 720);
  ctx.textAlign = 'left';

  const stats: [string, string][] = [
    ['🧠 Palabras expertas', String(s.expert.length)],
    ['🙊 Muletillas', String(s.fillers)],
    ['⏸️ Segundos en blanco', `${Math.round(s.blankSeconds)} s`],
    ['🎚️ Ritmo medio', `${Math.round(s.wpm)} ppm`],
  ];
  stats.forEach(([k, v], i) => {
    const y = 840 + i * 92;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.roundRect(80, y - 60, W - 160, 76, 24);
    ctx.fill();
    ctx.fillStyle = '#d9d2ff';
    ctx.font = font(800, 38);
    ctx.fillText(k, 110, y - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = font(900, 42);
    ctx.textAlign = 'right';
    ctx.fillText(v, W - 110, y - 8);
    ctx.textAlign = 'left';
  });

  if (s.expert.length) {
    ctx.fillStyle = '#c58bff';
    ctx.font = font(800, 34);
    ctx.fillText(wrap(ctx, s.expert.slice(0, 5).join(' · '), W - 160)[0], 80, H - 70);
  }

  return new Promise((r) => c.toBlob(r, 'image/png'));
}

export async function shareCard(s: ShareStats): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await renderCard(s);
  if (!blob) return 'failed';
  const file = new File([blob], 'horator-arcade.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `He sacado una ${s.grade} en Horator 🎙️` });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
