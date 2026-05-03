import { el } from '../ui.js';
import { state, loadGamesInfo } from '../state.js';
import { GAMES_META } from '../games_meta.js';

export async function gamesPage() {
  if (!state.gamesInfo) await loadGamesInfo();
  const info = state.gamesInfo || { house_edge: {} };

  return el('div', { class: 'page' },
    el('div', { class: 'section-title' }, el('span', {}, '🎮 Все игры')),
    el('div', { class: 'games-grid' },
      ...GAMES_META.map(g => {
        const edge = info.house_edge[g.id];
        const rtp = edge != null ? `RTP ${(100 - edge).toFixed(2)}%` : g.desc;
        return el('a', { class: `game-tile ${g.tag}`, href: `#/game-${g.id}` },
          el('span', { class: 'emoji' }, g.emoji),
          el('div', {},
            el('div', { class: 'name' }, g.name),
            el('div', { class: 'rtp' }, rtp),
          ),
        );
      }),
    ),
    el('div', { class: 'card mt-16' },
      el('div', { class: 'h' }, 'ℹ️ О честности'),
      el('p', { class: 'muted' },
        'Все игры используют provably-fair RNG (HMAC-SHA512 с server seed и client seed). ',
        'Перед каждой ставкой вы видите hash активного server seed; после ротации seed раскрывается ',
        'и вы можете проверить любую прошлую ставку. Преимущество казино = 100% − RTP — это математика, ',
        'а не подкрутка под игрока.',
      ),
      el('a', { class: 'btn outline mt-12', href: '#/provably-fair' }, 'Provably-fair →'),
    ),
  );
}
