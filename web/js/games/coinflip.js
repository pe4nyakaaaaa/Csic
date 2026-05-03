import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function coinflipGame() {
  let side = 'heads';

  const coin = el('div', { class: 'center', style: {
    fontSize: '80px', height: '160px',
    transition: 'transform 0.6s cubic-bezier(.2,.8,.2,1)',
  } }, '🪙');
  const stage = el('div', { class: 'card center', style: { padding: '20px' } }, coin);
  const status = el('div', { class: 'muted center mt-8' }, 'Выберите сторону');

  const sideRow = el('div', { class: 'row gap-8' },
    chip('Орёл', 'heads', true),
    chip('Решка', 'tails', false),
  );
  function chip(text, value, isActive) {
    const c = el('button', { class: `chip ${isActive ? 'active' : ''}`, onclick: () => {
      side = value;
      Array.from(sideRow.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    } }, text);
    return c;
  }

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите сумму ставки', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Подбрасываем монетку…';
      coin.style.transform = 'rotateY(720deg)';
      try {
        const r = await api.play('coinflip', bet, { side });
        await new Promise(res => setTimeout(res, 600));
        coin.textContent = r.result.outcome === 'heads' ? '🪙' : '🌟';
        coin.style.transform = 'rotateY(0)';
        if (r.win) {
          status.innerHTML = `🎉 Выигрыш: <span class="win">+${fmt(r.payout)} AC</span>`;
          confettiBurst(40);
        } else {
          status.innerHTML = `<span class="lose">Не повезло</span>`;
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
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🪙 Coinflip'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    status,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, 'Сторона'),
      sideRow,
    ),
    ctrl.node,
  );
}
