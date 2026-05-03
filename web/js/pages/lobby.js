import { el } from '../ui.js';
import { state, refreshUser } from '../state.js';
import { GAMES_META } from '../games_meta.js';

export async function lobbyPage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || { vip_name: 'Bronze', balance: 0, vip_progress: 0 };

  const hero = el('section', { class: 'hero' },
    el('div', { class: 'kicker' }, 'Welcome to Aurora'),
    el('h1', {}, `Привет${u.first_name ? ', ' + u.first_name : ''} 🌌`),
    el('p', {}, 'Mini-app казино с честным provably-fair RNG. 10+ игр, бонусы и реферальная программа.'),
    el('div', { class: 'hero-cta' },
      el('a', { class: 'btn primary', href: '#/games' }, '🎰 Играть'),
      el('a', { class: 'btn outline', href: '#/bonuses' }, '🎁 Бонусы'),
    ),
  );

  const featured = el('section', {},
    el('div', { class: 'section-title' },
      el('span', {}, '🔥 Популярные игры'),
      el('a', { class: 'more', href: '#/games' }, 'все →'),
    ),
    el('div', { class: 'games-grid' },
      ...GAMES_META.slice(0, 6).map(gameTile),
    ),
  );

  const stats = el('section', { class: 'card mt-16' },
    el('div', { class: 'h' }, '📊 Ваша статистика'),
    el('div', { class: 'row between' },
      kv('Баланс', `${(u.balance || 0).toFixed(2)} ${u.currency || 'AC'}`),
      kv('VIP', u.vip_name),
    ),
    u.vip_next_threshold ? el('div', { class: 'mt-12' },
      el('div', { class: 'row between' },
        el('span', { class: 'muted' }, 'Прогресс до следующего уровня'),
        el('span', { class: 'muted' },
          `${u.vip_progress?.toFixed?.(0) || 0} / ${(u.vip_next_threshold - (u.xp - u.vip_progress))?.toFixed?.(0)}`),
      ),
      el('div', { class: 'progress mt-8' },
        el('div', { style: { width: `${Math.min(100, (u.vip_progress / (u.vip_next_threshold - (u.xp - u.vip_progress))) * 100)}%` } }),
      ),
    ) : null,
  );

  const promo = el('section', { class: 'card glow mt-16' },
    el('div', { class: 'row between' },
      el('div', {},
        el('div', { class: 'h' }, '🎁 Welcome +100%'),
        el('div', { class: 'muted' }, 'Удвоим ваш первый депозит до 10 000 AC'),
      ),
      el('a', { class: 'btn primary', href: '#/deposit' }, 'Внести'),
    ),
  );

  return el('div', { class: 'page' }, hero, promo, featured, stats);
}

function kv(label, value) {
  return el('div', {},
    el('div', { class: 'muted' }, label),
    el('div', { style: { fontWeight: 800, fontSize: '18px' } }, value),
  );
}

function gameTile(g) {
  return el('a', { class: `game-tile ${g.tag}`, href: `#/game-${g.id}` },
    el('span', { class: 'emoji' }, g.emoji),
    el('div', {},
      el('div', { class: 'name' }, g.name),
      el('div', { class: 'rtp' }, g.desc),
    ),
  );
}
