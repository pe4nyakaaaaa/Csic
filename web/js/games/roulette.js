import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export function rouletteGame() {
  let betType = 'red';
  let value = null;

  const stage = el('div', { class: 'roulette-stage' });
  const canvas = el('canvas', { width: 320, height: 320 });
  const result = el('div', { class: 'roulette-result' }, '—');
  stage.append(canvas, result);
  drawWheel(canvas, 0);

  const status = el('div', { class: 'muted center mt-8' }, 'Сделайте ставку');

  const types = [
    ['red', '🔴 Красное', '×2'],
    ['black', '⚫ Чёрное', '×2'],
    ['even', 'Чётное', '×2'],
    ['odd', 'Нечётное', '×2'],
    ['low', '1-18', '×2'],
    ['high', '19-36', '×2'],
    ['dozen1', '1-12', '×3'],
    ['dozen2', '13-24', '×3'],
    ['dozen3', '25-36', '×3'],
    ['column1', 'Кол. 1', '×3'],
    ['column2', 'Кол. 2', '×3'],
    ['column3', 'Кол. 3', '×3'],
  ];
  const chips = el('div', { class: 'row wrap gap-6' });
  types.forEach(([id, label]) => {
    const c = el('button', { class: 'chip', onclick: () => {
      betType = id; value = null;
      Array.from(chips.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      strInput.value = '';
    } }, label);
    if (id === 'red') c.classList.add('active');
    chips.appendChild(c);
  });

  const strInput = el('input', {
    class: 'input', type: 'number', min: '0', max: '36', placeholder: '0..36',
  });
  strInput.addEventListener('input', () => {
    const n = parseInt(strInput.value);
    if (!isNaN(n) && n >= 0 && n <= 36) {
      betType = 'straight'; value = n;
      Array.from(chips.children).forEach(x => x.classList.remove('active'));
    }
  });

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Колесо крутится…';
      try {
        const r = await api.play('roulette', bet, { bet_type: betType, value });
        const pocket = r.result.pocket;
        await spinWheel(canvas, pocket);
        const colorEmoji = pocket === 0 ? '🟢' : (RED.has(pocket) ? '🔴' : '⚫');
        result.textContent = `${colorEmoji} ${pocket}`;
        if (r.win) {
          status.innerHTML = `🎉 ${pocket} ${colorEmoji} — выигрыш +${fmt(r.payout)} AC`;
          confettiBurst(50);
        } else {
          status.innerHTML = `<span class="lose">${pocket} ${colorEmoji} — проигрыш</span>`;
        }
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
      } finally {
        ctrl.setBusy(false);
      }
    },
    label: '🎡 Запуск',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🎡 Roulette'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    status,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, 'Тип ставки'),
      chips,
      el('div', { class: 'label mt-12' }, 'Прямая (×36)'),
      strInput,
    ),
    ctrl.node,
  );
}

function drawWheel(canvas, angle = 0) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 6;
  ctx.clearRect(0, 0, W, H);
  // Order matches European wheel
  const order = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const N = order.length;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
    const num = order[i];
    let color = '#222';
    if (num === 0) color = '#2ee49a';
    else if (RED.has(num)) color = '#ff4d8b';
    else color = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.stroke();
    // number
    ctx.save();
    ctx.rotate((a0 + a1) / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(num), r - 8, 4);
    ctx.restore();
  }
  ctx.restore();
  // pointer
  ctx.fillStyle = '#ffc857';
  ctx.beginPath();
  ctx.moveTo(cx - 8, 4); ctx.lineTo(cx + 8, 4); ctx.lineTo(cx, 22); ctx.closePath();
  ctx.fill();
  // center hub
  ctx.fillStyle = '#0a0e1a';
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b85cff'; ctx.lineWidth = 2; ctx.stroke();
}

function spinWheel(canvas, finalPocket) {
  return new Promise(res => {
    const order = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    const N = order.length;
    const targetIdx = order.indexOf(finalPocket);
    const turns = 4 + Math.random() * 2;
    const finalAngle = -((targetIdx + 0.5) / N) * Math.PI * 2 - turns * Math.PI * 2;
    const t0 = performance.now(); const dur = 2400;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      drawWheel(canvas, finalAngle * eased);
      if (p < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
}
