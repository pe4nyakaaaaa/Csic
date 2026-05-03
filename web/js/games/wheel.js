import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function wheelGame() {
  const stage = el('div', { class: 'roulette-stage' });
  const canvas = el('canvas', { width: 320, height: 320 });
  const result = el('div', { class: 'roulette-result' }, '—');
  stage.append(canvas, result);
  drawSimpleWheel(canvas, 0);
  const status = el('div', { class: 'muted center mt-8' }, 'Сделайте ставку и крутите');

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Колесо крутится…';
      try {
        const r = await api.play('wheel', bet, {});
        await spinSimpleWheel(canvas, r.result.segment, r.result.segments.length);
        if (r.win) {
          status.innerHTML = `🎉 Сегмент ${r.result.segment + 1} · ${r.multiplier}× — +${fmt(r.payout)} AC`;
          confettiBurst(50);
        } else {
          status.innerHTML = `<span class="lose">Пусто</span>`;
        }
        result.textContent = `${r.multiplier}×`;
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
      } finally {
        ctrl.setBusy(false);
      }
    },
    label: '🎯 Крутить',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🎯 Wheel'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    status,
    ctrl.node,
  );
}

function drawSimpleWheel(canvas, angle) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 6;
  ctx.clearRect(0, 0, W, H);
  const N = 20;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  const colors = ['#b85cff','#ff4d8b','#ffc857','#4dffea','#2ee49a'];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
    ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = (i % 2 === 0) ? 0.6 : 0.3;
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#ffc857';
  ctx.beginPath(); ctx.moveTo(cx - 8, 4); ctx.lineTo(cx + 8, 4); ctx.lineTo(cx, 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0a0e1a';
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
}

function spinSimpleWheel(canvas, idx, N) {
  return new Promise(res => {
    const turns = 4 + Math.random() * 2;
    const finalAngle = -((idx + 0.5) / N) * Math.PI * 2 - turns * Math.PI * 2;
    const t0 = performance.now(); const dur = 2400;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      drawSimpleWheel(canvas, finalAngle * eased);
      if (p < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
}
