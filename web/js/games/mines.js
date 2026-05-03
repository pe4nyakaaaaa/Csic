import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];

const GEM_SVG = `<svg viewBox="0 0 64 64" fill="none">
  <path d="M32 8 L52 28 L32 58 L12 28 Z" fill="white" opacity=".95"/>
  <path d="M32 8 L52 28 L32 28 Z" fill="white" opacity=".7"/>
  <path d="M32 28 L52 28 L32 58 Z" fill="rgba(0,0,0,0.15)"/>
</svg>`;

const BOMB_SVG = `<svg viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="36" r="22" fill="#0a0a0a"/>
  <rect x="30" y="6" width="4" height="10" rx="2" fill="#ffc857"/>
  <circle cx="32" cy="6" r="3" fill="#ffc857"/>
  <ellipse cx="26" cy="32" rx="5" ry="3" fill="#fff" opacity=".4"/>
</svg>`;

export function minesGame() {
  let mines = 3;
  const picks = new Set();

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Раунды' });

  const grid = el('div', { class: 'mines-grid-v2' });
  const cells = [];
  for (let i = 0; i < 25; i++) {
    const c = document.createElement('div');
    c.className = 'mc';
    c.dataset.idx = String(i);
    c.addEventListener('click', () => togglePick(i));
    cells.push(c); grid.appendChild(c);
  }
  const board = el('div', { class: 'mines-board stage' }, grid);

  const minesField = el('div', { class: 'field-card' },
    el('div', { class: 'lbl' }, 'Мин на поле'),
    Object.assign(document.createElement('input'), {
      type: 'number', min: '1', max: '24', value: '3',
      oninput(e) { mines = Math.max(1, Math.min(24, parseInt(e.target.value) || 3)); }
    }),
  );
  const picksField = el('div', { class: 'field-card' },
    el('div', { class: 'lbl' }, 'Выбрано'),
    el('div', { style: 'font-size:18px;font-weight:900;color:var(--lime);', id: 'mines-picks-count' }, '0'),
  );
  const sideRow = el('div', { class: 'mines-side' }, minesField, picksField);

  function togglePick(i) {
    const c = cells[i];
    if (c.classList.contains('gem') || c.classList.contains('bomb')) return;
    if (picks.has(i)) {
      picks.delete(i); c.classList.remove('picked');
    } else {
      if (picks.size + mines > 25) return toast('Слишком много клеток', 'error');
      picks.add(i); c.classList.add('picked');
    }
    document.getElementById('mines-picks-count').textContent = String(picks.size);
  }

  function reset() {
    picks.clear();
    cells.forEach(c => { c.className = 'mc'; });
    document.getElementById('mines-picks-count').textContent = '0';
  }

  const resetBtn = el('button', { class: 'btn ghost full', onclick: reset }, 'Сброс выбора');

  const panel = betPanel({
    label: 'Раскрыть',
    payoutText: 'Выплата',
    multiplierValue: '—',
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      if (picks.size === 0) return toast('Выберите клетки', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('mines', bet, { mines, picks: Array.from(picks) });
        // animate reveal: gems first if win, else show picks then mines
        for (const rv of r.result.revealed) {
          await delay(120);
          const c = cells[rv.cell];
          c.classList.remove('picked');
          if (rv.mine) {
            c.classList.add('bomb');
            c.innerHTML = BOMB_SVG;
          } else {
            c.classList.add('gem');
            c.innerHTML = GEM_SVG;
          }
        }
        if (!r.win) {
          for (const m of r.result.mine_cells || []) {
            const c = cells[m];
            if (!c.classList.contains('bomb') && !c.classList.contains('gem')) {
              c.classList.add('bomb');
              c.innerHTML = BOMB_SVG;
            }
          }
        }
        const mtxt = r.win ? `+${fmt(r.payout)} AC` : `Бомба`;
        HISTORY.unshift({ value: mtxt, win: r.win, lose: !r.win, big: r.multiplier >= 5 });
        rerender(histStrip);
        if (r.win) panel.setMultiplier(r.multiplier + '×');
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
    gameId: 'mines',
    title: 'Mines',
    history: histStrip,
    stage: board,
    extras: [sideRow, resetBtn],
    controls: panel.node,
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function rerender(strip) {
  while (strip.children.length > 1) strip.removeChild(strip.lastChild);
  HISTORY.slice(0, 12).forEach(it => {
    const cls = 'hist-pill' + (it.big ? ' big' : it.win ? ' win' : it.lose ? ' lose' : '');
    const sp = document.createElement('span');
    sp.className = cls;
    sp.textContent = it.value;
    strip.appendChild(sp);
  });
}
