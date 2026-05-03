// Reusable bet input row: amount + 1/2 / x2 / max + start button.

import { el } from './ui.js';
import { state } from './state.js';

export function betControls({ initial = 100, onPlay, onChange, label = '🚀 Играть' } = {}) {
  let value = Number(initial);

  const input = el('input', {
    class: 'input',
    type: 'number',
    min: '0',
    step: '1',
    value: String(value),
    inputmode: 'decimal',
  });
  const playBtn = el('button', { class: 'btn primary', onclick: () => onPlay?.(value) }, label);

  function setVal(v) {
    value = Math.max(0, Math.round(Number(v) * 100) / 100);
    input.value = String(value);
    onChange?.(value);
  }
  input.addEventListener('input', () => setVal(input.value || 0));

  const buttons = el('div', { class: 'amount-buttons' },
    el('button', { class: 'chip', onclick: () => setVal(value / 2) }, '½'),
    el('button', { class: 'chip', onclick: () => setVal(value * 2) }, '×2'),
    el('button', { class: 'chip', onclick: () => setVal(100) }, '100'),
    el('button', { class: 'chip', onclick: () => setVal((state.user?.balance || 0)) }, 'Max'),
  );

  return {
    node: el('div', { class: 'bet-controls card' },
      el('div', { class: 'label' }, 'Ставка'),
      el('div', { class: 'bet-row' }, input, buttons),
      playBtn,
    ),
    getValue: () => value,
    setValue: setVal,
    setBusy: (busy) => { playBtn.disabled = busy; playBtn.textContent = busy ? '…' : label; },
  };
}
