import { el } from '../ui.js';
import { state, refreshUser } from '../state.js';
import { GAMES_META } from '../games_meta.js';

export async function lobbyPage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || { vip_name: 'Bronze', balance: 0, vip_progress: 0 };
  const firstName = u.first_name ? `, ${u.first_name}` : '';

  const hero = el('section', { class: 'hero' },
    el('div', { class: 'kicker' }, '✨ Welcome to Aurora'),
    el('h1', {}, `Привет${firstName}`),
    el('p', {}, 'Provably-fair казино c 10+ играми. Прозрачный RNG, мгновенные выплаты, бонусы каждый день.'),
    el('div', { class: 'hero-cta' },
      el('a', { class: 'btn primary', href: '#/games' }, '🎰 Играть'),
      el('a', { class: 'btn outline', href: '#/bonuses' }, '🎁 Бонусы'),
    ),
    el('div', { class: 'hero-coin' }, 'A'),
  );

  const promo = el('section', { class: 'card glow mt-16' },
    el('div', { class: 'kicker' }, '🎁 Welcome bonus'),
    el('div', { class: 'h' }, '+100% на первый депозит'),
    el('div', { class: 'muted', style: { marginBottom: '12px' } },
      'Удвоим до 10 000 AC. Wagering ×30. Доступно один раз.'),
    el('a', { class: 'btn primary full', href: '#/wallet' }, 'Внести депозит'),
  );

  const stats = el('div', { class: 'stats-grid' },
    statCard('Баланс', `${(u.balance || 0).toFixed(2)}`, 'gold'),
    statCard('VIP', u.vip_name || 'Bronze', 'cyan'),
    statCard('XP', Math.round(u.xp || 0), 'pink'),
  );

  const featured = el('section', {},
    el('div', { class: 'section-title' },
      el('span', {}, '🔥 Популярные'),
      el('a', { class: 'more', href: '#/games' }, 'все →'),
    ),
    el('div', { class: 'games-grid' },
      ...GAMES_META.slice(0, 6).map(gameTile),
    ),
  );

  const liveTicker = el('section', { class: 'mt-16' },
    el('div', { class: 'kicker', style: { padding: '0 4px' } }, '🟢 Live'),
    el('div', { class: 'ticker' },
      tickerItem('🚀', 'Crash', '×8.42', '+842'),
      tickerItem('💣', 'Mines', '×5.10', '+510'),
      tickerItem('🎰', 'Slots', '×120', '+1200'),
      tickerItem('🎲', 'Dice', '×1.95', '+195'),
      tickerItem('🃏', 'Hi-Lo', '×3.80', '+380'),
      tickerItem('🎡', 'Roulette', '×36', '+3600'),
    ),
  );

  return el('div', { class: 'page' }, hero, stats, promo, liveTicker, featured);
}

function statCard(label, value, accent) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'lbl' }, label),
    el('div', { class: `val ${accent}` }, value),
  );
}

function tickerItem(emoji, game, mult, amount) {
  return el('div', { class: 'ticker-item' },
    el('span', {}, emoji),
    el('span', { class: 'game' }, game),
    el('span', { class: 'mult' }, mult),
  );
}

function gameTile(g) {
  const tile = el('a', { class: `game-tile ${g.tag}`, href: `#/game-${g.id}` });
  if (g.badge) {
    const badgeClass = g.badge === 'HOT' ? 'badge hot' : g.badge === 'NEW' ? 'badge new' : 'badge';
    const b = document.createElement('span');
    b.className = badgeClass;
    b.textContent = g.badge;
    tile.appendChild(b);
  }
  const iconWrap = document.createElement('div');
  iconWrap.className = 'icon';
  iconWrap.innerHTML = g.icon;
  tile.appendChild(iconWrap);
  tile.appendChild(el('div', { class: 'name' }, g.name));
  tile.appendChild(el('div', { class: 'rtp' }, g.desc));
  return tile;
}
