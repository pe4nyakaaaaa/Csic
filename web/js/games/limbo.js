import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];

export function limboGame() {
  let target = 2.0;

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Crashes' });

  const mult = el('div', { class: 'limbo-mult' }, '1.00×');
  const targetLine = el('div', { class: 'limbo-target' }, `Цель: ${target.toFixed(2)}× · Шанс ${(99 / target).toFixed(2)}%`);
  const stage = el('div', { class: 'stage limbo-stage' }, mult, targetLine);

  const targetField = el('div', { class: 'field-card' },
    el('div', { class: 'lbl' }, 'Цель множителя (≥ 1.01)'),
    Object.assign(document.createElement('input'), {
      type: 'number', min: '1.01', step: '0.01', value: target.toString(),
      oninput(e) {
        target = Math.max(1.01, Number(e.target.value) || 1.01);
        targetLine.textContent = `Цель: ${target.toFixed(2)}× · Шанс ${(99 / target).toFixed(2)}%`;
        panel.setMultiplier(target.toFixed(2) + '×');
        panel.setPayout(fmt(panel.getValue() * target));
      }
    }),
  );

  const panel = betPanel({
    label: 'Запуск',
    payoutText: 'Выигрыш',
    multiplierValue: target.toFixed(2) + '×',
    onAmountChange: (v) => panel.setPayout(fmt(v * target)),
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('limbo', bet, { target });
        await animateTo(mult, r.result.crash, r.win);
        HISTORY.unshift({ value: r.result.crash.toFixed(2) + '×', win: r.win, lose: !r.win, big: r.result.crash >= 5 });
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
  panel.setPayout(fmt(panel.getValue() * target));

  return gameShell({
    gameId: 'limbo',
    title: 'Limbo',
    history: histStrip,
    stage,
    extras: targetField,
    controls: panel.node,
  });
}

function animateTo(node, finalValue, won) {
  return new Promise(res => {
    node.classList.remove('lose');
    const t0 = performance.now();
    const dur = Math.min(1800, 600 + Math.log(Math.max(1.5, finalValue)) * 350);
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = 1 + (finalValue - 1) * eased;
      node.textContent = v.toFixed(2) + '×';
      if (p < 1) requestAnimationFrame(step);
      else {
        node.textContent = finalValue.toFixed(2) + '×';
        if (!won) node.classList.add('lose');
        res();
      }
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
