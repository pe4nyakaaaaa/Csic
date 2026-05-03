// Shared game page layout: header, history strip, stage, bet panel.

import { el } from './ui.js';
import { state } from './state.js';
import { GAMES_META } from './games_meta.js';

export function gameHeader(gameId, title) {
  const meta = GAMES_META.find(g => g.id === gameId);
  const ic = el('span', { class: 'ic' });
  if (meta) ic.innerHTML = meta.icon;
  return el('div', { class: 'gp-head' },
    el('a', { class: 'back', href: '#/lobby' }, '←'),
    el('div', { class: 'gp-title' }, ic, el('span', {}, title || (meta?.name || gameId))),
  );
}

// History strip: array of items {value, win, big?}
export function historyStrip(items, opts = {}) {
  const strip = el('div', { class: 'hist-strip' });
  strip.appendChild(el('span', { class: 'lbl' }, opts.label || 'Последние'));
  if (!items || !items.length) {
    strip.appendChild(el('span', { class: 'hist-pill' }, '—'));
    return strip;
  }
  items.slice(0, 12).forEach(it => {
    const cls = 'hist-pill' + (it.big ? ' big' : it.win ? ' win' : it.lose ? ' lose' : '');
    strip.appendChild(el('span', { class: cls }, it.value));
  });
  return strip;
}

// Bet panel v2: amount input, quick buttons, info row, big play button
export function betPanel({
  initial = 100,
  payoutText = null,
  payoutValue = '—',
  multiplierValue = '—',
  label = 'Играть',
  onPlay,
  onAmountChange,
}) {
  let value = Number(initial) || 0;

  const valInput = el('input', {
    type: 'number', class: 'val', min: '0', step: '1', value: String(value),
    inputmode: 'decimal',
  });

  const setVal = (v) => {
    value = Math.max(0, Math.round(Number(v) * 100) / 100);
    valInput.value = String(value);
    onAmountChange?.(value);
  };
  valInput.addEventListener('input', () => setVal(valInput.value || 0));

  const minus = el('button', { class: 'qb', onclick: () => setVal(value / 2) }, '½');
  const plus  = el('button', { class: 'qb', onclick: () => setVal(value * 2) }, '×2');
  const max   = el('button', { class: 'qb', onclick: () => setVal(state.user?.balance || 0) }, 'MAX');

  const amountField = el('div', { class: 'field' },
    el('div', { class: 'lbl' }, 'Ставка'),
    valInput,
  );
  const amount = el('div', { class: 'bp-amount' }, amountField, minus, plus, max);

  const quick = el('div', { class: 'bp-quick' });
  [10, 50, 100, 500].forEach(v => {
    quick.appendChild(el('button', { onclick: () => setVal(v) }, String(v)));
  });

  const payoutPi = el('div', { class: 'pi' },
    el('div', { class: 'lbl' }, payoutText || 'Выплата'),
    el('div', { class: 'val' }, String(payoutValue)),
  );
  const multPi = el('div', { class: 'pi' },
    el('div', { class: 'lbl' }, 'Множитель'),
    el('div', { class: 'val muted' }, String(multiplierValue)),
  );
  const info = el('div', { class: 'bp-info' }, payoutPi, multPi);

  const playBtn = el('button', { class: 'bp-play', onclick: () => onPlay?.(value) },
    el('span', { class: 'label' }, label),
  );

  const node = el('div', { class: 'bp' }, amount, quick, info, playBtn);

  return {
    node,
    getValue: () => value,
    setValue: setVal,
    setBusy: (busy) => {
      playBtn.disabled = busy;
      const lbl = playBtn.querySelector('.label');
      if (lbl) lbl.textContent = busy ? 'Идёт игра…' : label;
    },
    setPayout: (v) => { payoutPi.querySelector('.val').textContent = String(v); },
    setMultiplier: (v) => { multPi.querySelector('.val').textContent = String(v); },
  };
}

// Compose the standard game shell
export function gameShell({ gameId, title, history, stage, controls, extras }) {
  const parts = [
    gameHeader(gameId, title),
  ];
  if (history) parts.push(history);
  if (stage) parts.push(stage);
  if (extras) parts.push(...(Array.isArray(extras) ? extras : [extras]));
  if (controls) parts.push(controls);
  return el('div', { class: 'gp' }, ...parts);
}
