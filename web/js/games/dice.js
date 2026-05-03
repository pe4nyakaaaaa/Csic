import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];

export function diceGame() {
  let target = 50, direction = 'under';

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Броски' });

  const result = el('div', { class: 'dice-result' }, '50.00');

  const track = el('div', { class: 'dice-track' });
  const winZone = el('div', { class: 'win-zone' });
  const loseZone = el('div', { class: 'lose-zone' });
  const marker = el('div', { class: 'marker' });
  track.append(loseZone, winZone, marker);

  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '1'; slider.max = '99'; slider.step = '0.01'; slider.value = '50';
  slider.style.cssText = 'width:100%;margin-top:4px;accent-color:#c5ff00;';

  const dirRow = el('div', { class: 'dice-mode' });
  const underBtn = el('button', { class: 'active' }, 'Под');
  const overBtn = el('button', {}, 'Над');
  underBtn.addEventListener('click', () => { direction = 'under'; underBtn.classList.add('active'); overBtn.classList.remove('active'); update(); });
  overBtn.addEventListener('click', () => { direction = 'over'; overBtn.classList.add('active'); underBtn.classList.remove('active'); update(); });
  dirRow.append(underBtn, overBtn);

  const stage = el('div', { class: 'stage dice-stage' },
    result,
    track,
    slider,
    dirRow,
  );

  function update() {
    target = Math.max(1, Math.min(99, Number(slider.value) || 50));
    if (direction === 'under') {
      winZone.style.left = '0%';
      winZone.style.width = target + '%';
      loseZone.style.left = target + '%';
      loseZone.style.width = (100 - target) + '%';
    } else {
      loseZone.style.left = '0%';
      loseZone.style.width = target + '%';
      winZone.style.left = target + '%';
      winZone.style.width = (100 - target) + '%';
    }
    marker.style.left = target + '%';
    const chance = direction === 'under' ? target : (100 - target);
    const mult = chance > 0 ? (99 / chance) : 0;
    panel.setMultiplier(mult.toFixed(2) + '×');
    panel.setPayout(fmt(panel.getValue() * mult));
  }
  slider.addEventListener('input', update);

  const panel = betPanel({
    label: 'Бросить',
    payoutText: 'Выплата',
    onAmountChange: () => update(),
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('dice', bet, { target, direction });
        // animate roll
        await rollAnimation(result, r.result.roll);
        HISTORY.unshift({ value: r.result.roll.toFixed(2), win: r.win, lose: !r.win });
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

  // initial paint
  update();

  return gameShell({
    gameId: 'dice',
    title: 'Dice',
    history: histStrip,
    stage,
    controls: panel.node,
  });
}

function rollAnimation(node, finalVal) {
  return new Promise(res => {
    const t0 = performance.now();
    const dur = 700;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      if (p < 1) {
        node.textContent = (Math.random() * 100).toFixed(2);
        requestAnimationFrame(step);
      } else {
        node.textContent = finalVal.toFixed(2);
        res();
      }
    }
    requestAnimationFrame(step);
  });
}

function rerender(strip) {
  while (strip.children.length > 1) strip.removeChild(strip.lastChild);
  HISTORY.slice(0, 12).forEach(it => {
    const cls = 'hist-pill' + (it.win ? ' win' : ' lose');
    const sp = document.createElement('span');
    sp.className = cls;
    sp.textContent = it.value;
    strip.appendChild(sp);
  });
}
