import { api } from '../api.js';
import { betControls } from '../bet_controls.js';
import { confettiBurst, el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

export function hiloGame() {
  let current = 6, guess = 'higher';

  const cardCurrent = el('div', { class: 'center', style: cardStyle('#b85cff') }, RANK_LABELS[current]);
  const cardNext = el('div', { class: 'center', style: cardStyle('#ff4d8b', true) }, '?');
  const stage = el('div', { class: 'card row gap-12 center' }, cardCurrent, cardNext);
  const status = el('div', { class: 'muted center mt-8' }, '—');

  const currentInput = el('input', { class: 'input', type: 'number', min: '0', max: '12', value: '6' });
  currentInput.addEventListener('input', () => {
    current = Math.max(0, Math.min(12, parseInt(currentInput.value) || 6));
    cardCurrent.textContent = RANK_LABELS[current];
  });

  const guessRow = el('div', { class: 'row gap-8' },
    chip('▲ Выше', 'higher', true),
    chip('▼ Ниже', 'lower', false),
  );
  function chip(text, value, isActive) {
    const c = el('button', { class: `chip ${isActive ? 'active' : ''}`, onclick: () => {
      guess = value;
      Array.from(guessRow.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    } }, text);
    return c;
  }

  const ctrl = betControls({
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      ctrl.setBusy(true);
      status.textContent = 'Карта раскрывается…';
      cardNext.textContent = '?';
      try {
        const r = await api.play('hilo', bet, { current, guess });
        cardNext.textContent = RANK_LABELS[r.result.next_card];
        cardNext.style.borderColor = r.win ? '#2ee49a' : '#ff5566';
        if (r.win) {
          status.innerHTML = `🎉 ${RANK_LABELS[r.result.next_card]} > ${RANK_LABELS[current]} ` +
            `→ +${fmt(r.payout)} AC`;
          confettiBurst(40);
        } else {
          status.innerHTML = `<span class="lose">${RANK_LABELS[r.result.next_card]} ` +
            `${guess === 'higher' ? '≤' : '≥'} ${RANK_LABELS[current]}</span>`;
        }
        flashEl(document.getElementById('balance-pill'));
        await refreshUser();
      } catch (err) {
        toast(err.message || 'Ошибка', 'error');
      } finally {
        ctrl.setBusy(false);
      }
    },
    label: '🃏 Раскрыть',
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🃏 Hi-Lo'),
      el('a', { class: 'btn outline', href: '#/games' }, '← Назад'),
    ),
    stage,
    status,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, 'Текущий ранг (0=2 … 12=A)'),
      currentInput,
      el('div', { class: 'label mt-12' }, 'Прогноз'),
      guessRow,
    ),
    ctrl.node,
  );
}

function cardStyle(color, dashed = false) {
  return {
    width: '90px', height: '130px', borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
    border: `${dashed ? '2px dashed' : '2px solid'} ${color}`,
    fontSize: '40px', fontWeight: '900',
    boxShadow: `0 8px 24px ${color}40`,
  };
}
