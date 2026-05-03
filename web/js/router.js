// Hash-based router. Routes are registered as `addRoute(name, fn)`; the fn
// receives ({ params }) and returns a DOM node.

import { clear, el } from './ui.js';

const routes = new Map();
let currentParams = null;

export function addRoute(name, fn) { routes.set(name, fn); }

export function navigate(name, params = {}) {
  const search = new URLSearchParams(params).toString();
  const hash = '#/' + name + (search ? '?' + search : '');
  if (location.hash === hash) {
    render();
  } else {
    location.hash = hash;
  }
}

export function go(name, params) { navigate(name, params); }

export function getCurrent() {
  const h = (location.hash || '#/lobby').slice(2);
  const [name, query] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  return { name: name || 'lobby', params };
}

export async function render() {
  const { name, params } = getCurrent();
  currentParams = params;
  const handler = routes.get(name) || routes.get('lobby');
  const app = document.getElementById('app');
  if (!handler || !app) return;
  // mark active tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', tabRouteFor(name) === t.dataset.route);
  });

  clear(app);
  const loading = el('div', { class: 'card' }, 'Загрузка…');
  app.appendChild(loading);
  try {
    const node = await handler({ params });
    clear(app);
    app.appendChild(node);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    console.error(err);
    clear(app);
    app.appendChild(el('div', { class: 'card' },
      el('div', { class: 'h' }, 'Ошибка'),
      el('div', { class: 'muted' }, err.message || String(err)),
    ));
  }
}

function tabRouteFor(name) {
  if (name === 'lobby' || name === 'home') return 'lobby';
  if (name.startsWith('game-') || name === 'games') return 'games';
  if (name === 'bonuses') return 'bonuses';
  if (name === 'wallet' || name === 'deposit' || name === 'withdraw' || name === 'history')
    return 'wallet';
  if (name === 'profile' || name === 'referrals' || name === 'legal' ||
      name === 'privacy' || name === 'terms' || name === 'responsible' ||
      name === 'faq' || name === 'support' || name === 'provably-fair')
    return 'profile';
  return name;
}

export function bindTopNav() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-route]');
    if (!target) return;
    const rt = target.dataset.route;
    if (rt) navigate(rt);
  });
}

window.addEventListener('hashchange', render);
