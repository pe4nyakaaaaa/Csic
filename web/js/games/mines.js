import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function minesGame() {
  let mines = 3;
  const picks = new Set();

  const grid = el('div', { class: 'mines-grid' });
  const cells = [];
  for (let i = 0; i < 25; i++) {
    const c = el('div', { class: 'mine-cell', onclick: () => togglePick(i) }, '');
    cells.push(c); grid.appendChild(c);
  }

  const minesInput = el('input', {
    class: 'input', type: 'number', min: '1', max: '24', step: '1', value: '3'
  });
  minesInput.addEventListener('input', () => {
    mines = Math.max(1, Math.min(24, parseInt(minesInput.value) || 3));
  });

  const status = el('div', { class: 'muted mt-8 center' }, 'Выберите клетки и нажмите «Раскрыть»');

  function togglePick(i) {
    if (cells[i].classList.contains('disabled')) return;
    if (picks.has(i)) {
      picks.delete(i); cells[i].textContent = ''; cells[i].style.outline = '';
    } else {
      if (picks.size + mines > 25) return toast('Слишком много клеток для такого числа мин', 'error');
      picks.add(i); cells[i].textContent = '✓'; cells[i].style.outline = '2px solid var(--accent)';
    }
    status.textContent = `Выбрано: ${picks.size}`;
  }

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      if (picks.size === 0) return toast('Выберите хотя бы одну клетку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Раскрываем…';
      try {
        const r = await api.play('mines', bet, { mines, picks: Array.from(picks) });
        // animate reveal
        for (const rv of r.result.revealed) {
          await delay(110);
          const c = cells[rv.cell];
          c.textContent = rv.mine ? '💣' : '💎';
          c.classList.add(rv.mine ? 'bomb' : 'safe');
          c.classList.add('disabled');
          c.style.outline = '';
        }
        if (r.win) {
          status.innerHTML = `🎉 Выигрыш +${fmt(r.payout)} AC (${r.multiplier}×)`;
          confettiBurst(50);
        } else {
          // Reveal mines
          for (const m of r.result.mine_cells || []) {
            const c = cells[m];
            if (!c.textContent) { c.textContent = '💣'; c.classList.add('bomb'); }
          }
          status.innerHTML = `<span class="lose">Бомба! Проигрыш</span>`;
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
    label: '💎 Раскрыть',
  });

  function reset() {
    picks.clear();
    cells.forEach(c => { c.textContent = ''; c.className = 'mine-cell'; c.style.outline = ''; });
    status.textContent = 'Выберите клетки и нажмите «Раскрыть»';
  }

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '💣 Mines'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    el('div', { class: 'card', style: { padding: '12px' } }, grid),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'row between' },
        el('div', {}, el('div', { class: 'label' }, 'Мин на поле (1-24)'), minesInput),
        el('button', { class: 'btn outline', onclick: reset }, '🔄 Сброс'),
      ),
      status,
    ),
    ctrl.node,
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
