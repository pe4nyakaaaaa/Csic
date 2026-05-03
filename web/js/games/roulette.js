import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const HISTORY = [];

export function rouletteGame() {
  let betType = 'red';
  let value = null;

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'История' });

  const wheelW = el('div', { class: 'roulette-wheel' });
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 300;
  canvas.style.cssText = 'width:100%;height:100%;display:block;border-radius:50%;';
  drawWheel(canvas, 0);
  wheelW.style.cssText = 'width:240px;height:240px;border:8px solid #4a2a00;border-radius:50%;background:none;position:relative;box-shadow:0 8px 30px rgba(0,0,0,0.6);overflow:hidden;';
  wheelW.appendChild(canvas);

  const pointer = el('div', { class: 'roulette-pointer' });
  const wheelWrap = el('div', { style: 'position:relative;display:flex;align-items:center;justify-content:center;' }, pointer, wheelW);

  const result = el('div', { class: 'roulette-result' }, '—');

  const stage = el('div', { class: 'stage roulette-stage' }, wheelWrap, result);

  const board = el('div', { class: 'roulette-board' });
  const types = [
    ['red', '🔴 Красное', 'red'],
    ['black', '⚫ Чёрное', 'black'],
    ['low', '1-18', 'lo'],
    ['even', 'Чёт', 'even'],
    ['odd', 'Нечёт', 'odd'],
    ['high', '19-36', 'hi'],
    ['dozen1', '1-12', ''],
    ['dozen2', '13-24', ''],
    ['dozen3', '25-36', ''],
  ];
  types.forEach(([id, label, cls]) => {
    const b = el('button', { class: `roulette-bet ${cls}` }, label);
    b.addEventListener('click', () => {
      betType = id; value = null;
      Array.from(board.children).forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      strInput.value = '';
    });
    if (id === 'red') b.classList.add('selected');
    board.appendChild(b);
  });

  const strInput = document.createElement('input');
  strInput.type = 'number'; strInput.min = '0'; strInput.max = '36';
  strInput.placeholder = '0..36';
  strInput.style.cssText = 'width:100%;background:transparent;border:0;outline:none;color:var(--text);font-size:16px;font-weight:900;font-family:inherit;';
  strInput.addEventListener('input', () => {
    const n = parseInt(strInput.value);
    if (!isNaN(n) && n >= 0 && n <= 36) {
      betType = 'straight'; value = n;
      Array.from(board.children).forEach(x => x.classList.remove('selected'));
    }
  });
  const straight = el('div', { class: 'field-card' },
    el('div', { class: 'lbl' }, 'Прямая (×36)'),
    strInput,
  );

  const panel = betPanel({
    label: 'Запуск',
    payoutText: 'Выплата',
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('roulette', bet, { bet_type: betType, value });
        const pocket = r.result.pocket;
        await spinWheel(canvas, pocket);
        const color = pocket === 0 ? '🟢' : (RED.has(pocket) ? '🔴' : '⚫');
        result.textContent = `${color} ${pocket}`;
        result.style.color = pocket === 0 ? '#2ee49a' : RED.has(pocket) ? '#ff4d8b' : '#fff';
        HISTORY.unshift({ value: String(pocket), win: r.win, lose: !r.win, big: pocket === 0 });
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
    gameId: 'roulette',
    title: 'Roulette',
    history: histStrip,
    stage,
    extras: [board, straight],
    controls: panel.node,
  });
}

function drawWheel(canvas, angle = 0) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 4;
  ctx.clearRect(0, 0, W, H);
  const N = ORDER.length;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
    const num = ORDER[i];
    let color;
    if (num === 0) color = '#006400';
    else if (RED.has(num)) color = '#c41e3a';
    else color = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save();
    ctx.rotate((a0 + a1) / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(num), r - 6, 4);
    ctx.restore();
  }
  ctx.restore();
  // hub
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 28);
  grad.addColorStop(0, '#a06000');
  grad.addColorStop(1, '#2a1500');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffc857'; ctx.lineWidth = 2; ctx.stroke();
}

function spinWheel(canvas, finalPocket) {
  return new Promise(res => {
    const N = ORDER.length;
    const idx = ORDER.indexOf(finalPocket);
    const targetAngle = -((idx / N) * Math.PI * 2) - Math.PI * 8; // 4 full revolutions + offset
    const t0 = performance.now();
    const dur = 3200;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      const a = targetAngle * eased;
      drawWheel(canvas, a);
      if (p < 1) requestAnimationFrame(step);
      else res();
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
