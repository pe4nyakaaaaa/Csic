import { el } from '../ui.js';
import { state, refreshUser, loadGamesInfo } from '../state.js';
import { GAMES_META } from '../games_meta.js';

const SLIDES = [
  {
    cls: 's1',
    pill: 'Welcome bonus',
    title: '+100%',
    sub: 'до 10 000 AC',
    foot: 'для новых игроков',
    cta: '#/wallet',
    art: 'art-1',
  },
  {
    cls: 's2',
    pill: 'Daily reward',
    title: '+50 AC',
    sub: 'каждый день',
    foot: 'забирай в бонусах',
    cta: '#/bonuses',
    art: 'art-2',
  },
  {
    cls: 's3',
    pill: 'Cashback',
    title: '10%',
    sub: 'от потерь',
    foot: 'еженедельный возврат',
    cta: '#/bonuses',
    art: 'art-3',
  },
];

const FILTERS = [
  { id: 'all',  label: 'Все игры', icon: '<svg viewBox="0 0 24 24"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/></svg>' },
  { id: 'live', label: 'Live',     icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'top',  label: 'Топовые',  icon: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5 2 7-6.5-4.5-6.5 4.5 2-7L2 9h7z"/></svg>' },
  { id: 'new',  label: 'Новые',    icon: '<svg viewBox="0 0 24 24"><path d="M12 2v4m6 0l-2.5 2.5M22 12h-4m0 6l-2.5-2.5M12 22v-4m-6 0l2.5-2.5M2 12h4m0-6l2.5 2.5"/></svg>' },
];

export async function lobbyPage() {
  if (!state.user) await refreshUser().catch(() => null);
  if (!state.gamesInfo) await loadGamesInfo().catch(() => null);
  const info = state.gamesInfo || { house_edge: {} };

  // hero carousel
  const track = el('div', { class: 'hero-track' });
  SLIDES.forEach((s, i) => {
    track.appendChild(buildSlide(s));
  });

  const dots = el('div', { class: 'hero-dots' });
  SLIDES.forEach((_, i) => {
    const d = el('div', { class: 'hero-dot' + (i === 0 ? ' active' : '') });
    dots.appendChild(d);
  });

  const carousel = el('div', { class: 'hero-carousel' }, track, dots);

  // auto-rotate
  let active = 0;
  const rotate = () => {
    active = (active + 1) % SLIDES.length;
    track.style.transform = `translateX(-${active * 100}%)`;
    Array.from(dots.children).forEach((d, idx) => {
      d.classList.toggle('active', idx === active);
    });
  };
  let interval = setInterval(rotate, 5000);
  // pause on touch
  carousel.addEventListener('touchstart', () => clearInterval(interval), { passive: true });
  carousel.addEventListener('touchend', () => { interval = setInterval(rotate, 5000); }, { passive: true });

  // mini promo banners
  const promoStrip = el('div', { class: 'promo-strip' },
    promoCard('wheel', 'Крути и получай', 'до 41 400 AC', 'Без депозита!', '#/game-wheel', wheelArt()),
    promoCard('cashback', 'Cashback', 'до 10%', 'Бонус', '#/bonuses', cashbackArt()),
  );

  // live winners ticker (synthetic)
  const liveBar = buildLiveBar();

  // search + chip filters
  const chipScroll = el('div', { class: 'chip-scroll' });
  let activeFilter = 'all';
  FILTERS.forEach(f => {
    const c = el('button', { class: 'chip' + (f.id === activeFilter ? ' active' : ''), onclick: () => {
      activeFilter = f.id;
      Array.from(chipScroll.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      renderGames();
    } });
    const ic = document.createElement('span');
    ic.innerHTML = f.icon;
    ic.style.display = 'inline-flex';
    ic.firstElementChild.style.fill = 'currentColor';
    c.appendChild(ic.firstElementChild);
    c.appendChild(el('span', {}, f.label));
    chipScroll.appendChild(c);
  });
  const searchBtn = el('button', { class: 'search-input', 'aria-label': 'Поиск' });
  searchBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.3 8.7l5 5-1.4 1.4-5-5z"/></svg>';
  const searchRow = el('div', { class: 'search-row' }, searchBtn, chipScroll);

  // section header
  const secHead = el('div', { class: 'sec-head' },
    el('div', { class: 'title' }, 'Популярные'),
    el('div', { class: 'right' },
      el('a', { class: 'pill', href: '#/games' }, 'Все'),
      el('button', { class: 'arrow' }, '‹'),
      el('button', { class: 'arrow' }, '›'),
    ),
  );

  // games grid
  const gamesGrid = el('div', { class: 'games-grid' });
  function renderGames() {
    gamesGrid.innerHTML = '';
    let list = GAMES_META;
    if (activeFilter === 'top') list = GAMES_META.filter(g => g.badge === 'HOT');
    if (activeFilter === 'new') list = GAMES_META.filter(g => g.badge === 'NEW');
    if (activeFilter === 'live') list = GAMES_META.filter(g => g.id === 'crash' || g.id === 'roulette' || g.id === 'wheel');
    list.forEach(g => gamesGrid.appendChild(gameTile(g, info)));
  }
  renderGames();

  // top winners strip
  const winners = buildWinnersStrip();
  const winnersHead = el('div', { class: 'sec-head' },
    el('div', { class: 'title' }, 'Крупные выигрыши'),
    el('div', { class: 'right' }),
  );

  // category rails
  const crashRail = buildCatRail('Crash & Mines', ['crash','mines','limbo','plinko'], info);
  const slotsRail = buildCatRail('Слоты', ['slots','wheel','coinflip'], info);
  const cardsRail = buildCatRail('Столы / Карты', ['roulette','hilo','dice','coinflip'], info);

  return el('div', { class: 'page' },
    carousel,
    promoStrip,
    liveBar,
    searchRow,
    secHead,
    gamesGrid,
    winnersHead,
    winners,
    crashRail,
    slotsRail,
    cardsRail,
  );
}

function buildLiveBar() {
  const wins = [
    ['Артём', 'Crash', '12 480'],
    ['Светлана', 'Mines', '8 920'],
    ['Кирилл', 'Slots', '24 000'],
    ['Мария', 'Plinko', '5 350'],
    ['Олег', 'Roulette', '14 700'],
    ['Анна', 'Wheel', '41 400'],
    ['Виктор', 'Limbo', '3 200'],
    ['Дарья', 'Hi-Lo', '2 100'],
    ['Никита', 'Coinflip', '1 800'],
    ['Юлия', 'Dice', '6 600'],
  ];
  const inner = el('div', { class: 'live-track-inner' });
  // duplicate twice for seamless marquee
  for (let i = 0; i < 2; i++) {
    wins.forEach(w => {
      const item = document.createElement('span');
      item.innerHTML = `${w[0]} в ${w[1]} <b>+${w[2]} AC</b>`;
      inner.appendChild(item);
    });
  }
  const track = el('div', { class: 'live-track' }, inner);
  return el('div', { class: 'live-bar' },
    el('span', { class: 'lbl' }, 'Live'),
    track,
  );
}

function buildWinnersStrip() {
  const winners = [
    { name: 'Sasha', game: 'Crash 18.42×', amt: '12 480' },
    { name: 'Vlad', game: 'Wheel 10×', amt: '41 400' },
    { name: 'Lera', game: 'Mines safe-7', amt: '8 920' },
    { name: 'Roma', game: 'Plinko 12×', amt: '6 050' },
    { name: 'Kira', game: 'Slots 7-7-7', amt: '24 000' },
    { name: 'Max',  game: 'Roulette 36', amt: '14 700' },
  ];
  const strip = el('div', { class: 'winners-strip' });
  winners.forEach(w => {
    const av = el('div', { class: 'av' }, w.name[0]);
    const body = el('div', { class: 'body' },
      el('span', { class: 'name' }, w.name),
      el('span', { class: 'game' }, w.game),
    );
    const amt = el('span', { class: 'amt' }, '+' + w.amt);
    strip.appendChild(el('div', { class: 'winner-card' }, av, body, amt));
  });
  return strip;
}

function buildCatRail(title, ids, info) {
  const head = el('div', { class: 'row-h' },
    el('div', { class: 't' }, title),
    el('a', { class: 'more', href: '#/games' }, 'Все →'),
  );
  const scroll = el('div', { class: 'cat-scroll' });
  ids.forEach(id => {
    const meta = GAMES_META.find(g => g.id === id);
    if (meta) scroll.appendChild(gameTile(meta, info));
  });
  return el('div', { class: 'cat-rail' }, head, scroll);
}

function buildSlide(s) {
  const slide = el('div', { class: `hero-slide ${s.cls}` });
  slide.appendChild(el('div', { class: 'hero-pill' }, s.pill));
  slide.appendChild(el('div', { class: 'hero-title' }, s.title));
  slide.appendChild(el('div', { class: 'hero-sub' }, s.sub));
  slide.appendChild(el('div', { class: 'hero-foot' }, s.foot));
  const a = el('div', { class: 'hero-art' });
  a.innerHTML = heroArt(s.art);
  slide.appendChild(a);
  slide.addEventListener('click', () => { location.hash = s.cta; });
  return slide;
}

function heroArt(kind) {
  if (kind === 'art-1') {
    return `<svg viewBox="0 0 200 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ha1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5ff00"/><stop offset="1" stop-color="#88cc00"/></linearGradient>
        <radialGradient id="ha1g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c5ff00" stop-opacity=".6"/><stop offset="1" stop-color="#c5ff00" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="130" cy="120" r="100" fill="url(#ha1g)"/>
      <ellipse cx="130" cy="200" rx="80" ry="14" fill="#000" opacity=".4"/>
      <path d="M70 180 L130 70 L190 180 Z" fill="url(#ha1)" opacity=".25"/>
      <g transform="translate(110,90)">
        <circle cx="0" cy="0" r="38" fill="#ffe49a"/>
        <circle cx="0" cy="0" r="32" fill="#ffc857"/>
        <text x="0" y="10" font-family="Georgia" font-size="36" font-weight="900" fill="#6b3000" text-anchor="middle">A</text>
      </g>
      <g transform="translate(60,140) rotate(-15)">
        <circle cx="0" cy="0" r="22" fill="#ffe49a"/>
        <circle cx="0" cy="0" r="18" fill="#ffc857"/>
      </g>
      <g transform="translate(170,160) rotate(20)">
        <circle cx="0" cy="0" r="18" fill="#ffe49a"/>
        <circle cx="0" cy="0" r="15" fill="#ffc857"/>
      </g>
    </svg>`;
  }
  if (kind === 'art-2') {
    return `<svg viewBox="0 0 200 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="ha2g" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#ff4d8b" stop-opacity=".6"/><stop offset="1" stop-color="#ff4d8b" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="130" cy="110" r="110" fill="url(#ha2g)"/>
      <g transform="translate(120,110)">
        <rect x="-44" y="-34" width="88" height="68" rx="8" fill="#ffd700"/>
        <rect x="-40" y="-30" width="80" height="60" rx="6" fill="#fff" opacity=".15"/>
        <text x="0" y="6" font-family="Inter" font-size="22" font-weight="900" fill="#6b3000" text-anchor="middle">DAILY</text>
        <text x="0" y="24" font-family="Inter" font-size="14" font-weight="800" fill="#6b3000" text-anchor="middle">+50 AC</text>
      </g>
      <circle cx="60" cy="60" r="6" fill="#fff" opacity=".7"/>
      <circle cx="180" cy="200" r="4" fill="#fff" opacity=".5"/>
      <circle cx="40" cy="180" r="3" fill="#fff" opacity=".4"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 200 220" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="ha3g" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#b85cff" stop-opacity=".6"/><stop offset="1" stop-color="#b85cff" stop-opacity="0"/></radialGradient>
      <linearGradient id="ha3l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c5ff00"/><stop offset="1" stop-color="#4dffea"/></linearGradient>
    </defs>
    <circle cx="130" cy="110" r="110" fill="url(#ha3g)"/>
    <g transform="translate(120,110)">
      <circle cx="0" cy="0" r="48" fill="url(#ha3l)" opacity=".3"/>
      <circle cx="0" cy="0" r="36" fill="#0a0a0a"/>
      <text x="0" y="-2" font-family="Inter" font-size="11" font-weight="800" fill="#c5ff00" text-anchor="middle" letter-spacing="2">CASHBACK</text>
      <text x="0" y="20" font-family="Inter" font-size="22" font-weight="900" fill="#c5ff00" text-anchor="middle">10%</text>
    </g>
    <path d="M40 180 L60 160 L80 175 L100 145 L120 155" stroke="#c5ff00" stroke-width="3" fill="none" opacity=".6"/>
  </svg>`;
}

function promoCard(variant, label, title, ctaLabel, href, artHTML) {
  const card = el('a', { class: `promo-card ${variant}`, href });
  card.appendChild(el('div', { class: 'pc-label' }, label));
  card.appendChild(el('div', { class: 'pc-title' }, title));
  card.appendChild(el('span', { class: 'pc-cta' }, ctaLabel));
  const art = el('div', { class: 'pc-art' });
  art.innerHTML = artHTML;
  card.appendChild(art);
  return card;
}

function wheelArt() {
  return `<svg viewBox="0 0 64 64">
    <defs>
      <linearGradient id="wa1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d8b"/><stop offset="1" stop-color="#ffc857"/></linearGradient>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#wa1)"/>
    <path d="M32 32 L32 6 A26 26 0 0 1 54 19 Z" fill="#4dd9ff"/>
    <path d="M32 32 L54 45 A26 26 0 0 1 32 58 Z" fill="#c5ff00"/>
    <circle cx="32" cy="32" r="6" fill="#0a0a0a"/>
    <path d="M32 2 L36 8 L28 8 Z" fill="#fff"/>
  </svg>`;
}
function cashbackArt() {
  return `<svg viewBox="0 0 64 64">
    <rect x="14" y="20" width="36" height="22" rx="3" fill="#c5ff00"/>
    <rect x="18" y="24" width="28" height="14" rx="2" fill="#0a1a00"/>
    <text x="32" y="35" font-family="Inter" font-size="9" font-weight="900" fill="#c5ff00" text-anchor="middle">10%</text>
    <path d="M16 18 L18 14 L20 18 M44 18 L46 14 L48 18" stroke="#c5ff00" stroke-width="1.5" fill="none"/>
  </svg>`;
}

function gameTile(g, info) {
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
  return tile;
}
