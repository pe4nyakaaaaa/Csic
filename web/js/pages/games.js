import { el } from '../ui.js';
import { state, loadGamesInfo } from '../state.js';
import { GAMES_META } from '../games_meta.js';

export async function gamesPage() {
  if (!state.gamesInfo) await loadGamesInfo();
  const info = state.gamesInfo || { house_edge: {} };

  const gamesGrid = el('div', { class: 'games-grid' });
  GAMES_META.forEach(g => {
    const tile = el('a', { class: `game-tile ${g.tag}`, href: `#/game-${g.id}` });
    if (g.badge) {
      const cls = g.badge === 'HOT' ? 'badge hot' : g.badge === 'NEW' ? 'badge new' : 'badge';
      const b = document.createElement('span');
      b.className = cls;
      b.textContent = g.badge;
      tile.appendChild(b);
    }
    const art = document.createElement('div');
    art.className = 'art';
    art.innerHTML = g.icon;
    tile.appendChild(art);
    const edge = info.house_edge?.[g.id];
    const rtp = edge != null ? `RTP ${(100 - edge).toFixed(1)}%` : '';
    if (rtp) tile.appendChild(el('div', { class: 'game-rtp' }, rtp));
    tile.appendChild(el('div', { class: 'game-name' }, g.name));
    gamesGrid.appendChild(tile);
  });

  return el('div', { class: 'page' },
    el('div', { class: 'sec-head' },
      el('div', { class: 'title' }, 'Все игры'),
    ),
    gamesGrid,
    el('div', { class: 'card mt-16' },
      el('div', { class: 'kicker' }, 'Provably-fair'),
      el('div', { class: 'h' }, 'Каждая ставка проверяема'),
      el('p', { class: 'muted' },
        'Исход определяется HMAC-SHA512(server_seed, client_seed:nonce). ',
        'Hash server_seed публикуется до ставки; после ротации сам seed раскрывается.'),
      el('a', { class: 'btn outline mt-12 full', href: '#/provably-fair' }, 'Подробнее →'),
    ),
  );
}
