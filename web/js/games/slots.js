import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const ALL_SYMBOLS = ['🍒','🍋','🍇','🔔','7️⃣','💎'];

export function slotsGame() {
  const reels = [
    el('div', { class: 'slot-reel' }, el('span', { class: 'slot-symbol' }, '🎰')),
    el('div', { class: 'slot-reel' }, el('span', { class: 'slot-symbol' }, '🎰')),
    el('div', { class: 'slot-reel' }, el('span', { class: 'slot-symbol' }, '🎰')),
  ];
  const stage = el('div', { class: 'slots-stage' }, ...reels);
  const status = el('div', { class: 'muted center mt-8' }, 'Нажмите «Крутить»');

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Барабаны крутятся…';
      reels.forEach(r => r.classList.add('spinning'));
      const tickers = reels.map(r => {
        return setInterval(() => {
          r.firstChild.textContent = ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
        }, 80);
      });
      try {
        const r = await api.play('slots', bet, {});
        await new Promise(res => setTimeout(res, 700));
        tickers.forEach(t => clearInterval(t));
        reels.forEach((reel, i) => {
          reel.classList.remove('spinning');
          reel.firstChild.textContent = r.result.reels[i];
        });
        if (r.win) {
          status.innerHTML = `🎉 +${fmt(r.payout)} AC (${r.multiplier}×)`;
          confettiBurst(50);
        } else {
          status.innerHTML = `<span class="lose">Не выиграли</span>`;
        }
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        tickers.forEach(t => clearInterval(t));
        reels.forEach(r => r.classList.remove('spinning'));
        toast(err.message || 'Ошибка', 'error');
      } finally {
        ctrl.setBusy(false);
      }
    },
    label: '🎰 Крутить',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🎰 Slots'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    status,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, 'Таблица выплат'),
      el('div', { class: 'col gap-6' },
        ...[
          ['💎 💎 💎', '×100'],
          ['7️⃣ 7️⃣ 7️⃣', '×25'],
          ['🔔 🔔 🔔', '×12'],
          ['🍇 🍇 🍇', '×6'],
          ['🍋 🍋 🍋', '×4'],
          ['🍒 🍒 🍒', '×2'],
          ['Любая пара', '×0.5'],
        ].map(([k, v]) => el('div', { class: 'row between' },
          el('span', {}, k), el('span', { class: 'muted' }, v)
        )),
      ),
    ),
    ctrl.node,
  );
}
