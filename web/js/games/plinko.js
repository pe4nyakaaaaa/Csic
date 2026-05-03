import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function plinkoGame() {
  let rows = 12, risk = 'medium';
  const stage = el('div', { class: 'plinko-stage' });
  const canvas = el('canvas', { width: 300, height: 280 });
  stage.append(canvas);
  const binsHost = el('div', { class: 'plinko-bins' });

  const status = el('div', { class: 'muted center mt-8' }, 'Бросьте шарик');

  const rowChips = el('div', { class: 'row wrap gap-6' });
  for (const r of [8, 10, 12, 14, 16]) {
    const c = el('button', { class: `chip ${r === rows ? 'active' : ''}`,
      onclick: () => { rows = r;
        Array.from(rowChips.children).forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        renderBins();
      } }, `${r} рядов`);
    rowChips.appendChild(c);
  }
  const riskChips = el('div', { class: 'row wrap gap-6' });
  for (const rk of ['low','medium','high']) {
    const c = el('button', { class: `chip ${rk === risk ? 'active' : ''}`,
      onclick: () => { risk = rk;
        Array.from(riskChips.children).forEach(x => x.classList.remove('active'));
        c.classList.add('active');
      } }, rk);
    riskChips.appendChild(c);
  }

  function renderBins(table) {
    binsHost.innerHTML = '';
    if (!table) return;
    const max = Math.max(...table);
    table.forEach((m, i) => {
      const intensity = Math.min(1, Math.log(m + 1) / Math.log(max + 1));
      const b = el('div', {
        class: 'plinko-bin',
        style: { background: `linear-gradient(180deg, rgba(184,92,255,${intensity * 0.5}), rgba(255,77,139,${intensity * 0.4}))` }
      }, `${m}×`);
      binsHost.appendChild(b);
    });
  }

  drawPlinko(canvas, rows, []);

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Шарик летит…';
      try {
        const r = await api.play('plinko', bet, { rows, risk });
        renderBins(r.result.table);
        await animateBall(canvas, rows, r.result.path);
        if (r.win) {
          status.innerHTML = `🎉 Корзина ${r.result.bin} · ${r.multiplier}× — +${fmt(r.payout)} AC`;
          confettiBurst(50);
        } else {
          status.innerHTML = `<span class="lose">Корзина ${r.result.bin} · ${r.multiplier}×</span>`;
        }
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
      } finally {
        ctrl.setBusy(false);
      }
    },
    label: '🪙 Бросить',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🪙 Plinko'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    binsHost,
    status,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, 'Ряды'),
      rowChips,
      el('div', { class: 'label mt-12' }, 'Риск'),
      riskChips,
    ),
    ctrl.node,
  );
}

function drawPlinko(canvas, rows, ballPath) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const padX = 18, padY = 8;
  const dy = (H - padY * 2 - 20) / rows;
  // pegs
  for (let r = 0; r < rows; r++) {
    const cnt = r + 2;
    for (let i = 0; i < cnt; i++) {
      const x = padX + ((W - padX * 2) / (cnt - 1 || 1)) * i;
      const y = padY + dy * (r + 1);
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    }
  }
  // ball trail
  if (ballPath.length) {
    ctx.strokeStyle = '#ffc857'; ctx.lineWidth = 2;
    ctx.beginPath();
    let xpos = W / 2; let ypos = padY;
    ctx.moveTo(xpos, ypos);
    for (let r = 0; r < ballPath.length; r++) {
      const dir = ballPath[r] ? 1 : -1;
      // shift by half a peg gap
      const cnt = r + 2;
      const gap = (W - padX * 2) / (cnt);
      xpos += dir * gap / 2;
      ypos += dy;
      ctx.lineTo(xpos, ypos);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xpos, ypos, 5, 0, 7); ctx.fill();
  }
}

function animateBall(canvas, rows, path) {
  return new Promise(res => {
    let step = 0;
    function tick() {
      drawPlinko(canvas, rows, path.slice(0, step));
      step++;
      if (step <= path.length) setTimeout(tick, 90);
      else res();
    }
    tick();
  });
}
