import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = []; // recent crash multipliers (session-local)

export function crashGame() {
  let auto = 2.0;

  const histStrip = historyStrip(buildHistory(), { label: 'История' });

  const stage = el('div', { class: 'stage crash-stage' });
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 280;
  stage.appendChild(canvas);
  const multBig = el('div', { class: 'crash-mult-big' }, '1.00×');
  stage.appendChild(multBig);
  const status = el('div', { class: 'crash-status' }, 'Поставь ставку и взлетай');
  stage.appendChild(status);

  // initial chart
  drawChart(canvas, 1, 2, false, 0);

  const autoInput = document.createElement('input');
  autoInput.type = 'number'; autoInput.min = '1.01'; autoInput.step = '0.01'; autoInput.value = String(auto);
  autoInput.addEventListener('input', () => {
    auto = Math.max(1.01, Number(autoInput.value) || 1.01);
    panel.setMultiplier(auto.toFixed(2) + '×');
  });

  const autoCard = el('div', { class: 'field-card' },
    el('div', { class: 'lbl' }, 'Авто-кэшаут'),
    autoInput,
  );

  const panel = betPanel({
    label: 'Старт',
    payoutText: 'Выигрыш',
    payoutValue: '—',
    multiplierValue: auto.toFixed(2) + '×',
    onAmountChange: (v) => panel.setPayout(fmt(v * auto)),
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      status.textContent = 'Полёт…';
      multBig.classList.remove('crashed');
      try {
        const r = await api.play('crash', bet, { auto_cashout: auto });
        await animate(canvas, multBig, r.result.crash, auto, r.win);
        if (r.win) {
          status.innerHTML = `Кэшаут на ${auto.toFixed(2)}× &middot; +${fmt(r.payout)} AC`;
        } else {
          status.innerHTML = `Crash на ${r.result.crash.toFixed(2)}×`;
          multBig.classList.add('crashed');
        }
        HISTORY.unshift({ value: r.result.crash.toFixed(2) + '×', big: r.result.crash >= 5, win: r.win, lose: !r.win });
        rerenderHistory(histStrip);
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
        status.textContent = 'Ошибка';
      } finally {
        panel.setBusy(false);
      }
    },
  });
  panel.setPayout(fmt(panel.getValue() * auto));

  return gameShell({
    gameId: 'crash',
    title: 'Crash',
    history: histStrip,
    stage,
    extras: autoCard,
    controls: panel.node,
  });
}

function buildHistory() {
  return HISTORY.slice(0, 12).map(h => ({ value: h.value, win: h.win, lose: h.lose, big: h.big }));
}
function rerenderHistory(strip) {
  // remove all but label
  while (strip.children.length > 1) strip.removeChild(strip.lastChild);
  buildHistory().forEach(it => {
    const cls = 'hist-pill' + (it.big ? ' big' : it.win ? ' win' : it.lose ? ' lose' : '');
    const sp = document.createElement('span');
    sp.className = cls;
    sp.textContent = it.value;
    strip.appendChild(sp);
  });
  if (HISTORY.length === 0) strip.appendChild(Object.assign(document.createElement('span'), { className: 'hist-pill', textContent: '—' }));
}

function drawChart(canvas, current, target, crashed, progress) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = H * i / 5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const x = W * i / 6;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // curve
  const yMax = Math.max(2, target);
  const cap = (val) => Math.min(1, (val - 1) / Math.max(0.1, yMax - 1));
  const points = 80;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const px = i / points * progress;
    const cx = px * W;
    const yy = 1 + (current - 1) * Math.pow(i / points, 1.6);
    const cy = H - 8 - cap(yy) * (H - 16);
    if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  }
  if (crashed) {
    ctx.strokeStyle = '#ff3a4f';
  } else {
    const grad = ctx.createLinearGradient(0, H, W, 0);
    grad.addColorStop(0, '#4dd9ff');
    grad.addColorStop(.5, '#c5ff00');
    grad.addColorStop(1, '#ffc857');
    ctx.strokeStyle = grad;
  }
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // fill area below curve
  ctx.lineTo(progress * W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = crashed
    ? 'rgba(255,58,79,0.08)'
    : 'rgba(197,255,0,0.07)';
  ctx.fill();

  // rocket dot
  const lastY = H - 8 - cap(current) * (H - 16);
  const lastX = progress * W;
  ctx.fillStyle = crashed ? '#ff3a4f' : '#c5ff00';
  ctx.shadowColor = crashed ? '#ff3a4f' : '#c5ff00';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function animate(canvas, multNode, finalCrash, autoCashout, won) {
  return new Promise(res => {
    const t0 = performance.now();
    const dur = Math.min(2800, 900 + Math.log(Math.max(1.5, finalCrash)) * 700);
    const target = won ? autoCashout : finalCrash;
    const yScale = Math.max(2, finalCrash * 1.15);

    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = 1 + (target - 1) * eased;
      multNode.textContent = cur.toFixed(2) + '×';
      drawChart(canvas, cur, yScale, false, eased);
      if (p < 1) requestAnimationFrame(step);
      else {
        multNode.textContent = (won ? autoCashout : finalCrash).toFixed(2) + '×';
        if (!won) {
          drawChart(canvas, finalCrash, yScale, true, 1);
        }
        res();
      }
    }
    requestAnimationFrame(step);
  });
}
