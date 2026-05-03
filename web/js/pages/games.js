import { el } from '../ui.js';
import { state, loadGamesInfo } from '../state.js';
import { GAMES_META } from '../games_meta.js';

export async function gamesPage() {
  if (!state.gamesInfo) await loadGamesInfo();
  const info = state.gamesInfo || { house_edge: {} };

  const tiles = GAMES_META.map(g => {
    const edge = info.house_edge[g.id];
    const rtp = edge != null ? `RTP ${(100 - edge).toFixed(2)}%` : g.desc;
    const tile = document.createElement('a');
    tile.className = `game-tile ${g.tag}`;
    tile.href = `#/game-${g.id}`;
    if (g.badge) {
      const cls = g.badge === 'HOT' ? 'badge hot' : g.badge === 'NEW' ? 'badge new' : 'badge';
      const b = document.createElement('span');
      b.className = cls;
      b.textContent = g.badge;
      tile.appendChild(b);
    }
    const iconWrap = document.createElement('div');
    iconWrap.className = 'icon';
    iconWrap.innerHTML = g.icon;
    tile.appendChild(iconWrap);
    tile.appendChild(el('div', { class: 'name' }, g.name));
    tile.appendChild(el('div', { class: 'rtp' }, rtp));
    return tile;
  });

  return el('div', { class: 'page' },
    el('div', { class: 'section-title' }, el('span', {}, '🎮 Все игры')),
    el('div', { class: 'games-grid' }, ...tiles),
    el('div', { class: 'card mt-16' },
      el('div', { class: 'kicker' }, '🔐 Provably-fair'),
      el('div', { class: 'h' }, 'Каждая ставка проверяема'),
      el('p', { class: 'muted' },
        'Исход определяется HMAC-SHA512(server_seed, client_seed:nonce). Hash server_seed публикуется до ставки; ',
        'после ротации сам seed раскрывается. Преимущество казино = 100 − RTP, это математика, а не подкрутка.',
      ),
      el('a', { class: 'btn outline mt-12 full', href: '#/provably-fair' }, 'Подробнее →'),
    ),
  );
}
