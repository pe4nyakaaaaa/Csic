// DOM utility helpers.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class' || k === 'className') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'data' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    }
    else if (v === false || v == null) {/* skip */}
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number') {
      node.appendChild(document.createTextNode(String(c)));
    } else {
      node.appendChild(c);
    }
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function toast(msg, kind = '') {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const t = el('div', { class: `toast ${kind || ''}` }, msg);
  host.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export function fmt(n, digits = 2) {
  if (n == null) return '-';
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  if (Math.abs(v) >= 1000) return v.toLocaleString('ru-RU', { maximumFractionDigits: digits });
  return v.toFixed(digits);
}

export function coins(n) { return `${fmt(n, 2)}`; }

export function rub(n) { return `${fmt(n, 2)} ₽`; }

export function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function confettiBurst(count = 60) {
  const host = document.createElement('div'); host.className = 'confetti';
  document.body.appendChild(host);
  const colors = ['#b85cff', '#ff4d8b', '#ffc857', '#4dffea', '#2ee49a'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    host.appendChild(c);
  }
  setTimeout(() => host.remove(), 2200);
}

export function modal(title, contentNode) {
  const back = el('div', { class: 'modal-backdrop' });
  const m = el('div', { class: 'modal' });
  const close = () => back.remove();
  m.append(
    el('div', { class: 'row between mb-12' },
      el('h3', {}, title),
      el('button', { class: 'btn outline', onclick: close }, 'Закрыть'),
    ),
    contentNode,
  );
  back.appendChild(m);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.body.appendChild(back);
  return { close, root: m };
}

// Shorthand $/\$\$ DOM selectors
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export function flashEl(node) {
  if (!node) return;
  node.classList.add('flash');
  setTimeout(() => node.classList.remove('flash'), 600);
}
