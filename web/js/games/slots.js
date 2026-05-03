import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];
const ALL_SYMBOLS = ['🍒','🍋','🍇','🔔','7','💎'];
const PAYOUTS = [
  { sym: '💎💎💎', mul: '×100' },
  { sym: '7  7  7', mul: '×25' },
  { sym: '🔔🔔🔔', mul: '×12' },
  { sym: '🍇🍇🍇', mul: '×6' },
  { sym: '🍋🍋🍋', mul: '×4' },
  { sym: '🍒🍒🍒', mul: '×2' },
];

export function slotsGame() {
  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Спины' });

  const reels = [];
  const symbols = [];
  for (let i = 0; i < 3; i++) {
    const r = document.createElement('div');
    r.className = 'slot-reel-v2';
    const s = document.createElement('div');
    s.className = 'symbol';
    s.textContent = '?';
    r.appendChild(s);
    reels.push(r); symbols.push(s);
  }

  const reelGrid = el('div', { class: 'slots-reels' }, ...reels);
  const frame = el('div', { class: 'slots-frame' }, reelGrid);
  const status = el('div', { style: 'text-align:center;margin-top:10px;font-size:13px;color:var(--muted);font-weight:700;' }, 'Готов к спину');
  const stage = el('div', { class: 'slots-stage-v2' }, frame, status);

  const paytable = el('div', { class: 'card' },
    el('div', { class: 'kicker' }, 'Таблица выплат'),
    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;font-size:13px;' },
      ...PAYOUTS.map(p => el('div', { class: 'row between', style: 'background:var(--bg-3);padding:8px 10px;border-radius:8px;' },
        el('span', { style: 'font-size:14px;letter-spacing:2px;' }, p.sym),
        el('span', { style: 'color:var(--lime);font-weight:800;' }, p.mul),
      )),
    ),
  );

  const panel = betPanel({
    label: 'Крутить',
    payoutText: 'Макс. выплата',
    payoutValue: '×100',
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      status.textContent = 'Барабаны крутятся…';
      reels.forEach(r => r.classList.add('spinning'));
      const tickers = symbols.map(s => setInterval(() => {
        s.textContent = ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
      }, 70));
      try {
        const r = await api.play('slots', bet, {});
        await new Promise(res => setTimeout(res, 600));
        clearInterval(tickers[0]);
        symbols[0].textContent = String(r.result.reels[0]);
        reels[0].classList.remove('spinning');
        await new Promise(res => setTimeout(res, 250));
        clearInterval(tickers[1]);
        symbols[1].textContent = String(r.result.reels[1]);
        reels[1].classList.remove('spinning');
        await new Promise(res => setTimeout(res, 250));
        clearInterval(tickers[2]);
        symbols[2].textContent = String(r.result.reels[2]);
        reels[2].classList.remove('spinning');

        if (r.win) {
          status.innerHTML = `<span style="color:var(--lime);">+${fmt(r.payout)} AC (${r.multiplier}×)</span>`;
        } else {
          status.textContent = 'Не повезло';
        }
        HISTORY.unshift({ value: r.win ? `+${fmt(r.payout)}` : '—', win: r.win, lose: !r.win, big: r.multiplier >= 10 });
        rerender(histStrip);
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        tickers.forEach(t => clearInterval(t));
        reels.forEach(r => r.classList.remove('spinning'));
        toast(err.message || 'Ошибка', 'error');
      } finally {
        panel.setBusy(false);
      }
    },
  });

  return gameShell({
    gameId: 'slots',
    title: 'Slots',
    history: histStrip,
    stage,
    extras: paytable,
    controls: panel.node,
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
