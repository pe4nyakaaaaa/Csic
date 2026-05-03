import { api } from '../api.js';
import { betPanel, gameShell, historyStrip } from '../game_shell.js';
import { el, fmt, flashEl, toast } from '../ui.js';
import { refreshUser } from '../state.js';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = [
  { sym: '♠', color: 'black' },
  { sym: '♥', color: 'red' },
  { sym: '♣', color: 'black' },
  { sym: '♦', color: 'red' },
];
const HISTORY = [];

export function hiloGame() {
  let current = 6, guess = 'higher';
  let currentSuit = 0;

  const histStrip = historyStrip(HISTORY.slice(0, 12), { label: 'Раскрыто' });

  const stage = el('div', { class: 'stage hilo-stage' });

  const row = el('div', { style: 'display:flex;gap:14px;align-items:center;' });
  const currentCard = renderCard(current, currentSuit);
  const arrow = el('div', { style: 'font-size:32px;color:var(--lime);font-weight:900;' }, '→');
  const nextCard = renderCard(null, null);
  row.append(currentCard, arrow, nextCard);
  stage.appendChild(row);

  const guessRow = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;' });
  const higherBtn = el('button', { class: 'roulette-bet selected' }, '▲ Выше');
  const lowerBtn = el('button', { class: 'roulette-bet' }, '▼ Ниже');
  higherBtn.addEventListener('click', () => { guess = 'higher'; higherBtn.classList.add('selected'); lowerBtn.classList.remove('selected'); });
  lowerBtn.addEventListener('click', () => { guess = 'lower'; lowerBtn.classList.add('selected'); higherBtn.classList.remove('selected'); });
  guessRow.append(higherBtn, lowerBtn);
  stage.appendChild(guessRow);

  const currentField = el('div', { class: 'field-card' },
    el('div', { class: 'lbl' }, 'Текущий ранг (0=2 … 12=A)'),
    Object.assign(document.createElement('input'), {
      type: 'number', min: '0', max: '12', value: '6',
      oninput(e) {
        current = Math.max(0, Math.min(12, parseInt(e.target.value) || 6));
        currentSuit = (currentSuit + 1) % 4;
        const newCard = renderCard(current, currentSuit);
        currentCard.replaceWith(newCard);
        currentCard.parentNode?.replaceChild(newCard, currentCard);
      }
    }),
  );

  const panel = betPanel({
    label: 'Раскрыть',
    payoutText: 'Выплата',
    onPlay: async (bet) => {
      if (bet <= 0) return toast('Введите ставку', 'error');
      panel.setBusy(true);
      try {
        const r = await api.play('hilo', bet, { current, guess });
        const nextSuit = Math.floor(Math.random() * 4);
        const newCard = renderCard(r.result.next_card, nextSuit);
        nextCard.parentNode?.replaceChild(newCard, nextCard);
        HISTORY.unshift({ value: RANKS[r.result.next_card], win: r.win, lose: !r.win });
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

  return gameShell({
    gameId: 'hilo',
    title: 'Hi-Lo',
    history: histStrip,
    stage,
    extras: currentField,
    controls: panel.node,
  });
}

function renderCard(rank, suitIdx) {
  if (rank === null) {
    return el('div', { class: 'hilo-card', style: 'border-style: dashed; opacity:.6;' },
      el('div', { class: 'corner-tl' }, '?'),
      el('div', { class: 'center', style: 'font-size:80px;color:#999;' }, '?'),
      el('div', { class: 'corner-br' }, '?'),
    );
  }
  const suit = SUITS[suitIdx % SUITS.length];
  return el('div', { class: 'hilo-card ' + suit.color },
    el('div', { class: 'corner-tl' },
      el('span', {}, RANKS[rank]),
      el('span', { style: 'font-size:18px;line-height:1;' }, suit.sym),
    ),
    el('div', { class: 'center' }, suit.sym),
    el('div', { class: 'corner-br' },
      el('span', {}, RANKS[rank]),
      el('span', { style: 'font-size:18px;line-height:1;' }, suit.sym),
    ),
  );
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
