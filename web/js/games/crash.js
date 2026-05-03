import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function crashGame() {
  let auto = 2.0;

  const stage = el('div', { class: 'curve-stage' });
  const canvas = el('canvas', { width: 300, height: 200 });
  const mult = el('div', { class: 'curve-mult' }, '🚀 ' + auto.toFixed(2) + '×');
  const status = el('div', { class: 'curve-status' }, 'Введите авто-кэшаут');
  stage.append(canvas, mult, status);

  const autoInput = el('input', {
    class: 'input', type: 'number', min: '1.01', step: '0.01', value: auto.toString()
  });
  autoInput.addEventListener('input', () => {
    auto = Math.max(1.01, Number(autoInput.value) || 1.01);
    mult.textContent = '🚀 ' + auto.toFixed(2) + '×';
  });

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Полёт…';
      try {
        const r = await api.play('crash', bet, { auto_cashout: auto });
        await animateCrash(canvas, mult, r.result.crash, auto, r.win);
        if (r.win) {
          status.innerHTML = `🎉 Кэшаут на ${auto.toFixed(2)}× — +${fmt(r.payout)} AC`;
          confettiBurst(50);
        } else {
          status.innerHTML = `<span class="lose">💥 Crash на ${r.result.crash.toFixed(2)}×</span>`;
        }
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
        status.textContent = 'Ошибка';
      } finally {
        ctrl.setBusy(false);
      }
    },
    label: '🚀 Старт',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🚀 Crash'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, 'Авто-кэшаут (×)'),
      autoInput,
    ),
    ctrl.node,
  );
}

function animateCrash(canvas, multNode, finalCrash, autoCashout, won) {
  return new Promise(res => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const t0 = performance.now();
    const dur = Math.min(2400, 800 + Math.log(Math.max(1.5, finalCrash)) * 600);
    const target = won ? autoCashout : finalCrash;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = 1 + (target - 1) * eased;
      multNode.textContent = cur.toFixed(2) + '×';
      // Draw curve
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = 0; y < H; y += H / 5) ctx.fillRect(0, y, W, 1);
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#b85cff'); grad.addColorStop(1, '#ff4d8b');
      ctx.strokeStyle = grad; ctx.lineWidth = 3;
      ctx.beginPath();
      const points = 60;
      for (let i = 0; i <= points; i++) {
        const px = i / points;
        const cx = px * W;
        const yy = 1 + (cur - 1) * Math.pow(px, 1.6);
        const yPct = Math.min(1, (yy - 1) / Math.max(1, target));
        const cy = H - 4 - yPct * (H - 12);
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      // Rocket dot
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(W - 4, H - 4 - Math.min(1, (cur - 1) / Math.max(1, target)) * (H - 12), 5, 0, 7); ctx.fill();
      if (p < 1) requestAnimationFrame(step);
      else { multNode.textContent = (won ? autoCashout : finalCrash).toFixed(2) + '×'; res(); }
    }
    requestAnimationFrame(step);
  });
}
