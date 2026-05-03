import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function limboGame() {
  let target = 2.0;

  const stage = el('div', { class: 'curve-stage' });
  const mult = el('div', { class: 'curve-mult' }, '⚡ ' + target.toFixed(2) + '×');
  const status = el('div', { class: 'curve-status' }, 'Введите цель и ставку');
  stage.append(mult, status);

  const targetInput = el('input', {
    class: 'input', type: 'number', min: '1.01', step: '0.01', value: target.toString()
  });
  targetInput.addEventListener('input', () => {
    target = Math.max(1.01, Number(targetInput.value) || 1.01);
    mult.textContent = '⚡ ' + target.toFixed(2) + '×';
  });

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите сумму ставки', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Считаем…';
      try {
        const r = await api.play('limbo', bet, { target });
        // Animate counter from 1.00 to crash
        await animateTo(mult, r.result.crash);
        if (r.win) {
          status.innerHTML = `🎉 Цель ${target.toFixed(2)}× достигнута! ` +
            `Crash: ${r.result.crash.toFixed(2)}×, выигрыш +${fmt(r.payout)} AC`;
          confettiBurst(50);
        } else {
          status.innerHTML = `<span class="lose">Crash на ${r.result.crash.toFixed(2)}×</span>`;
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
    label: '⚡ Запуск',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '⚡ Limbo'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, 'Цель множителя (≥ 1.01)'),
      targetInput,
    ),
    ctrl.node,
  );
}

function animateTo(node, finalValue) {
  return new Promise(res => {
    const t0 = performance.now();
    const dur = Math.min(1800, 600 + Math.log(Math.max(1.5, finalValue)) * 350);
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = 1 + (finalValue - 1) * eased;
      node.textContent = v.toFixed(2) + '×';
      if (p < 1) requestAnimationFrame(step);
      else { node.textContent = finalValue.toFixed(2) + '×'; res(); }
    }
    requestAnimationFrame(step);
  });
}
