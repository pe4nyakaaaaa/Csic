import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function diceGame() {
  let target = 50, direction = 'under';

  const display = el('div', { class: 'dice-roll-display' }, '00.00');
  const status = el('div', { class: 'muted center mt-8' }, 'Сделайте ставку');
  const stage = el('div', { class: 'dice-stage' }, display, status);

  const slider = el('input', { class: 'slider', type: 'range', min: '1', max: '99', step: '0.01', value: '50' });
  slider.style.setProperty('--pct', `${target}%`);
  const targetLabel = el('span', { class: 'kicker' }, 'Цель');
  const targetVal = el('div', { style: { fontSize: '20px', fontWeight: 800 } }, target.toFixed(2));
  const winChance = el('span', { class: 'muted' }, `Шанс: ${target.toFixed(2)}%`);
  const multLabel = el('span', { style: { fontWeight: 800 } }, '1.98×');

  const dirChips = el('div', { class: 'row gap-8' },
    chip('Под', 'under', true),
    chip('Над', 'over', false),
  );
  function chip(text, value, isActive) {
    const c = el('button', { class: `chip ${isActive ? 'active' : ''}`, onclick: () => {
      direction = value;
      Array.from(dirChips.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      updateMath();
    } }, text);
    return c;
  }

  function updateMath() {
    targetVal.textContent = target.toFixed(2);
    const chance = direction === 'under' ? target : (100 - target);
    winChance.textContent = `Шанс: ${chance.toFixed(2)}%`;
    const mult = chance > 0 ? (99 / chance) : 0;
    multLabel.textContent = `${mult.toFixed(2)}×`;
    slider.style.setProperty('--pct', `${target}%`);
  }
  slider.addEventListener('input', () => { target = Number(slider.value); updateMath(); });

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите сумму ставки', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Бросаем кубик…';
      try {
        const r = await api.play('dice', bet, { target, direction });
        const { result, win, multiplier, payout } = r;
        display.textContent = result.roll.toFixed(2);
        if (win) {
          status.innerHTML = `🎉 Выигрыш: <span class="win">+${fmt(payout, 2)} AC</span> (${multiplier}×)`;
          confettiBurst(40);
        } else {
          status.innerHTML = `<span class="lose">Проигрыш</span> · бросок ${result.roll.toFixed(2)}`;
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
  });

  return el('div', { class: 'page' },
    gameHeader('🎲', 'Dice'),
    stage,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'row between' },
        el('div', {}, targetLabel, targetVal),
        el('div', { class: 'right' },
          el('div', { class: 'kicker' }, 'Множитель'),
          multLabel,
        ),
      ),
      el('div', { class: 'mt-12' }, slider),
      el('div', { class: 'row between mt-8' }, winChance, dirChips),
    ),
    ctrl.node,
  );
}

function gameHeader(emoji, name) {
  return el('div', { class: 'game-header' },
    el('div', { class: 'title' }, el('span', {}, emoji), el('span', {}, name)),
    el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
  );
}
