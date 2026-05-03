import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];

export function plinkoGame() {
  let rows = 12, risk = 'medium';

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Броски' });

  const stage = el('div', { class: 'stage plinko-stage' });
  const canvas = document.createElement('canvas');
  canvas.width = 360; canvas.height = 360;
  stage.appendChild(canvas);
  drawPlinko(canvas, rows, [], null, []);

  const binsHost = el('div', { style: 'display:grid;gap:4px;margin-top:6px;', id: 'plinko-bins' });

  // Rows row
  const rowsRow = el('div', { class: 'plinko-rows' });
  [8, 10, 12, 14, 16].forEach(r => {
    const b = el('button', { class: 'plinko-row-btn' + (r === rows ? ' active' : '') }, `${r} рядов`);
    b.addEventListener('click', () => {
      rows = r;
      Array.from(rowsRow.children).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      drawPlinko(canvas, rows, [], null, []);
    });
    rowsRow.appendChild(b);
  });

  const riskRow = el('div', { class: 'plinko-rows' });
  ['low','medium','high'].forEach(rk => {
    const b = el('button', { class: 'plinko-row-btn' + (rk === risk ? ' active' : '') }, rk);
    b.addEventListener('click', () => {
      risk = rk;
      Array.from(riskRow.children).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    riskRow.appendChild(b);
  });

  function renderBins(table, hitIdx) {
    binsHost.innerHTML = '';
    if (!table) return;
    binsHost.style.gridTemplateColumns = `repeat(${table.length}, 1fr)`;
    const max = Math.max(...table);
    table.forEach((m, i) => {
      const intensity = Math.min(1, Math.log(m + 1) / Math.log(max + 1));
      const isHit = i === hitIdx;
      const b = el('div', {
        style: `background: linear-gradient(180deg, rgba(197,255,0,${intensity * 0.4}), rgba(77,217,255,${intensity * 0.3})); padding: 6px 0; text-align: center; font-size: 10px; font-weight: 800; border-radius: 6px; color: ${isHit ? '#0a0a0a' : 'white'}; ${isHit ? 'background: var(--lime);' : ''}`,
      }, `${m}×`);
      binsHost.appendChild(b);
    });
  }

  const panel = betPanel({
    label: 'Бросить',
    payoutText: 'Выплата',
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('plinko', bet, { rows, risk });
        renderBins(r.result.table, r.result.bin);
        await animateBall(canvas, rows, r.result.path, r.result.table, r.result.bin);
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
    gameId: 'plinko',
    title: 'Plinko',
    history: histStrip,
    stage,
    extras: [binsHost, rowsRow, riskRow],
    controls: panel.node,
  });
}

function drawPlinko(canvas, rows, ballPath, ballPos, table) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const padX = 24, padY = 14;
  const usableH = H - padY * 2;
  const dy = usableH / (rows + 1);

  // pegs
  for (let r = 0; r < rows; r++) {
    const cnt = r + 3;
    const totalW = (cnt - 1) * dy * 0.9;
    const offset = (W - totalW) / 2;
    for (let i = 0; i < cnt; i++) {
      const x = offset + i * dy * 0.9;
      const y = padY + dy * (r + 1);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.shadowColor = 'rgba(197,255,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ball trail
  if (ballPath.length) {
    ctx.strokeStyle = 'rgba(197,255,0,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath();
    let xpos = W / 2, ypos = padY;
    ctx.moveTo(xpos, ypos);
    for (let r = 0; r < ballPath.length; r++) {
      const dir = ballPath[r] ? 1 : -1;
      xpos += dir * dy * 0.45;
      ypos += dy;
      ctx.lineTo(xpos, ypos);
    }
    ctx.stroke();
  }

  // ball position
  if (ballPos) {
    ctx.fillStyle = '#c5ff00';
    ctx.shadowColor = '#c5ff00';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ballPos.x, ballPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function animateBall(canvas, rows, path, table, finalBin) {
  return new Promise(res => {
    const W = canvas.width, H = canvas.height;
    const padY = 14;
    const dy = (H - padY * 2) / (rows + 1);
    let step = 0;
    let x = W / 2, y = padY;
    function tick() {
      const trail = path.slice(0, step);
      drawPlinko(canvas, rows, trail, { x, y }, table);
      if (step < path.length) {
        const dir = path[step] ? 1 : -1;
        x += dir * dy * 0.45;
        y += dy;
        step++;
        setTimeout(tick, 60);
      } else {
        res();
      }
    }
    tick();
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
