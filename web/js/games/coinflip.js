import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const HISTORY = [];

export function coinflipGame() {
  let side = 'heads';
  let totalRot = 0;

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Броски' });

  const headsFace = el('div', { class: 'face heads' }, 'A');
  const tailsFace = el('div', { class: 'face tails' }, 'R');
  const coin = el('div', { class: 'cf-coin' }, headsFace, tailsFace);

  const status = el('div', { style: 'font-size:13px;font-weight:700;color:var(--muted);' }, 'Выбери сторону и брось');

  const pickRow = el('div', { class: 'cf-pick' });
  const headsBtn = el('button', { class: 'active' }, '🟡 Орёл');
  const tailsBtn = el('button', {}, '⚪ Решка');
  headsBtn.addEventListener('click', () => { side = 'heads'; headsBtn.classList.add('active'); tailsBtn.classList.remove('active'); });
  tailsBtn.addEventListener('click', () => { side = 'tails'; tailsBtn.classList.add('active'); headsBtn.classList.remove('active'); });
  pickRow.append(headsBtn, tailsBtn);

  const stage = el('div', { class: 'stage cf-stage' }, coin, status, pickRow);

  const panel = betPanel({
    label: 'Бросить',
    payoutText: 'Выплата',
    multiplierValue: '×2',
    onAmountChange: (v) => panel.setPayout(fmt(v * 2)),
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('coinflip', bet, { side });
        const turns = 5;
        const final = r.result.outcome === 'heads' ? 0 : 180;
        totalRot += turns * 360 + final;
        coin.style.transform = `rotateY(${totalRot}deg)`;
        await new Promise(res => setTimeout(res, 1500));
        if (r.win) {
          status.innerHTML = `<span style="color:var(--lime);">+${fmt(r.payout)} AC</span>`;
        } else {
          status.innerHTML = `Не повезло, выпало ${r.result.outcome === 'heads' ? 'Орёл' : 'Решка'}`;
        }
        HISTORY.unshift({ value: r.result.outcome === 'heads' ? 'A' : 'R', win: r.win, lose: !r.win });
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
  panel.setPayout(fmt(panel.getValue() * 2));

  return gameShell({
    gameId: 'coinflip',
    title: 'Coinflip',
    history: histStrip,
    stage,
    controls: panel.node,
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
