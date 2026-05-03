import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];

export function wheelGame() {
  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Спины' });

  const canvas = document.createElement('canvas');
  canvas.width = 280; canvas.height = 280;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  const wheelBox = el('div', { style: 'width:260px;height:260px;border-radius:50%;background:#1a1a1a;border:8px solid #1a1a1a;box-shadow:0 0 40px rgba(197,255,0,0.18);overflow:hidden;position:relative;' }, canvas);

  const pointer = el('div', { class: 'wof-pointer' });
  const wheelWrap = el('div', { style: 'position:relative;display:flex;align-items:center;justify-content:center;' }, pointer, wheelBox);

  const multResult = el('div', { class: 'wof-multiplier' }, 'Жми крутить');

  const stage = el('div', { class: 'stage wof-stage' }, wheelWrap, multResult);

  drawSimpleWheel(canvas, 0);

  const panel = betPanel({
    label: 'Крутить',
    payoutText: 'Возможный приз',
    payoutValue: '×10',
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('wheel', bet, {});
        await spinSimpleWheel(canvas, r.result.segment, r.result.segments.length);
        multResult.textContent = `${r.multiplier}×`;
        multResult.style.color = r.win ? 'var(--lime)' : '#ff7a8a';
        HISTORY.unshift({ value: r.multiplier + '×', win: r.win, lose: !r.win, big: r.multiplier >= 5 });
        rerender(histStrip);
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
      } finally {
        panel.setBusy(false);
      }
    },
  });

  return gameShell({
    gameId: 'wheel',
    title: 'Wheel of Fortune',
    history: histStrip,
    stage,
    controls: panel.node,
  });
}

function drawSimpleWheel(canvas, angle) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 4;
  ctx.clearRect(0, 0, W, H);
  const N = 12;
  const colors = ['#c5ff00', '#4dd9ff', '#ff4d8b', '#ffc857', '#b85cff', '#2ee49a'];
  const labels = ['×2', '×0', '×1.5', '×0', '×3', '×0', '×2', '×0', '×5', '×0', '×10', '×0'];
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
    ctx.fillStyle = labels[i] === '×0' ? '#1a1a1a' : colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    // label
    ctx.save();
    ctx.rotate((a0 + a1) / 2 + Math.PI / 2);
    ctx.fillStyle = labels[i] === '×0' ? '#666' : '#0a0a0a';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], 0, -r * 0.65);
    ctx.restore();
  }
  ctx.restore();
  // hub
  const hub = ctx.createRadialGradient(cx, cy, 4, cx, cy, 28);
  hub.addColorStop(0, '#c5ff00'); hub.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = hub;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c5ff00'; ctx.lineWidth = 3; ctx.stroke();
}

function spinSimpleWheel(canvas, idx, N) {
  return new Promise(res => {
    const turns = 5 + Math.random() * 2;
    const finalAngle = -((idx + 0.5) / N) * Math.PI * 2 - turns * Math.PI * 2;
    const t0 = performance.now(); const dur = 3200;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      drawSimpleWheel(canvas, finalAngle * eased);
      if (p < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
}

function rerender(strip) {
  while (strip.children.length > 1) strip.removeChild(strip.lastChild);
  HISTORY.slice(0, 12).forEach(it => {
    const cls = 'hist-pill' + (it.big ? ' big' : it.win ? ' win' : ' lose');
    const sp = document.createElement('span');
    sp.className = cls;
    sp.textContent = it.value;
    strip.appendChild(sp);
  });
}
