// Game metadata: name, route id, custom SVG icon, gradient + tag.

const ICONS = {
  crash: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_crash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff4d8b"/><stop offset="1" stop-color="#ffc857"/>
    </linearGradient></defs>
    <path d="M50 10c-7 1-13 4-19 9-9 8-15 18-19 28h6c4-8 9-16 17-22 5-4 11-7 15-7 0 4-1 9-4 15-3 7-7 14-12 19l-4-4-3 11 11-3-3-3c5-5 10-12 13-19 4-8 5-14 5-19l-3-5z" fill="url(#g_crash)"/>
    <circle cx="46" cy="20" r="3" fill="#fff"/>
  </svg>`,
  mines: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_mines" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff5566"/><stop offset="1" stop-color="#b85cff"/>
    </linearGradient></defs>
    <circle cx="32" cy="36" r="22" fill="url(#g_mines)"/>
    <rect x="30" y="6" width="4" height="10" rx="2" fill="#ffc857"/>
    <circle cx="32" cy="6" r="3" fill="#ffc857"/>
    <path d="M22 28 L18 24 M42 28 L46 24 M32 18 L32 22" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="26" cy="32" rx="5" ry="3" fill="#fff" opacity=".5"/>
  </svg>`,
  dice: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_dice" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4dffea"/><stop offset="1" stop-color="#00d4ff"/>
    </linearGradient></defs>
    <rect x="14" y="14" width="36" height="36" rx="8" fill="url(#g_dice)"/>
    <rect x="14" y="14" width="36" height="36" rx="8" fill="white" opacity=".15"/>
    <circle cx="22" cy="22" r="3" fill="#0a0e1a"/>
    <circle cx="42" cy="22" r="3" fill="#0a0e1a"/>
    <circle cx="32" cy="32" r="3" fill="#0a0e1a"/>
    <circle cx="22" cy="42" r="3" fill="#0a0e1a"/>
    <circle cx="42" cy="42" r="3" fill="#0a0e1a"/>
  </svg>`,
  plinko: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_plinko" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffc857"/><stop offset="1" stop-color="#ff4d8b"/>
    </linearGradient></defs>
    <circle cx="20" cy="20" r="2.5" fill="white" opacity=".7"/>
    <circle cx="32" cy="20" r="2.5" fill="white" opacity=".7"/>
    <circle cx="44" cy="20" r="2.5" fill="white" opacity=".7"/>
    <circle cx="14" cy="32" r="2.5" fill="white" opacity=".7"/>
    <circle cx="26" cy="32" r="2.5" fill="white" opacity=".7"/>
    <circle cx="38" cy="32" r="2.5" fill="white" opacity=".7"/>
    <circle cx="50" cy="32" r="2.5" fill="white" opacity=".7"/>
    <circle cx="20" cy="44" r="2.5" fill="white" opacity=".7"/>
    <circle cx="32" cy="44" r="2.5" fill="white" opacity=".7"/>
    <circle cx="44" cy="44" r="2.5" fill="white" opacity=".7"/>
    <circle cx="32" cy="10" r="5" fill="url(#g_plinko)"/>
  </svg>`,
  roulette: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_roul" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b85cff"/><stop offset="1" stop-color="#ff4d8b"/>
    </linearGradient></defs>
    <circle cx="32" cy="32" r="24" fill="url(#g_roul)"/>
    <circle cx="32" cy="32" r="20" fill="#0a0e1a" opacity=".4"/>
    <circle cx="32" cy="32" r="14" fill="url(#g_roul)" opacity=".7"/>
    <circle cx="32" cy="32" r="6" fill="#ffc857"/>
    <path d="M32 8 L34 14 L30 14 Z" fill="#ffc857"/>
    <path d="M32 8 L32 56 M8 32 L56 32 M15 15 L49 49 M49 15 L15 49" stroke="white" stroke-width="0.8" opacity=".4"/>
  </svg>`,
  slots: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_slots" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff00aa"/><stop offset="1" stop-color="#ffc857"/>
    </linearGradient></defs>
    <rect x="8" y="14" width="48" height="36" rx="6" fill="url(#g_slots)"/>
    <rect x="14" y="20" width="10" height="24" rx="2" fill="#0a0e1a" opacity=".75"/>
    <rect x="27" y="20" width="10" height="24" rx="2" fill="#0a0e1a" opacity=".75"/>
    <rect x="40" y="20" width="10" height="24" rx="2" fill="#0a0e1a" opacity=".75"/>
    <text x="19" y="36" font-family="Arial" font-size="11" font-weight="900" fill="#ffc857" text-anchor="middle">7</text>
    <text x="32" y="36" font-family="Arial" font-size="11" font-weight="900" fill="#ffc857" text-anchor="middle">7</text>
    <text x="45" y="36" font-family="Arial" font-size="11" font-weight="900" fill="#ffc857" text-anchor="middle">7</text>
  </svg>`,
  coinflip: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g_coin" cx="0.3" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#ffe49a"/><stop offset="0.6" stop-color="#ffc857"/><stop offset="1" stop-color="#c98000"/>
    </radialGradient></defs>
    <ellipse cx="32" cy="32" rx="22" ry="22" fill="url(#g_coin)"/>
    <ellipse cx="32" cy="32" rx="18" ry="18" fill="none" stroke="#c98000" stroke-width="1.5"/>
    <text x="32" y="40" font-family="Georgia" font-size="22" font-weight="900" fill="#6b3000" text-anchor="middle">A</text>
  </svg>`,
  wheel: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g_w1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b85cff"/><stop offset="1" stop-color="#ff4d8b"/></linearGradient>
      <linearGradient id="g_w2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4dffea"/><stop offset="1" stop-color="#00d4ff"/></linearGradient>
    </defs>
    <circle cx="32" cy="32" r="24" fill="url(#g_w1)"/>
    <path d="M32 32 L32 8 A24 24 0 0 1 53 20 Z" fill="url(#g_w2)"/>
    <path d="M32 32 L53 44 A24 24 0 0 1 32 56 Z" fill="#ffc857"/>
    <path d="M32 32 L11 20 A24 24 0 0 1 32 8 Z" fill="#ffc857"/>
    <circle cx="32" cy="32" r="5" fill="#0a0e1a"/>
    <path d="M32 5 L36 11 L28 11 Z" fill="#ffc857" stroke="#0a0e1a" stroke-width="1"/>
  </svg>`,
  limbo: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_limbo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2ee49a"/><stop offset="1" stop-color="#4dffea"/>
    </linearGradient></defs>
    <path d="M14 50 L26 30 L36 38 L50 14" stroke="url(#g_limbo)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="50" cy="14" r="4" fill="#ffc857"/>
    <text x="32" y="58" font-family="Arial" font-size="9" font-weight="700" fill="white" opacity=".7" text-anchor="middle">×∞</text>
  </svg>`,
  hilo: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g_hilo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b85cff"/><stop offset="1" stop-color="#ff00aa"/>
    </linearGradient></defs>
    <rect x="12" y="10" width="22" height="32" rx="3" fill="white" transform="rotate(-8 23 26)"/>
    <rect x="30" y="14" width="22" height="32" rx="3" fill="url(#g_hilo)" transform="rotate(8 41 30)"/>
    <text x="22" y="33" font-family="Georgia" font-size="14" font-weight="900" fill="#ff4d8b" transform="rotate(-8 23 26)" text-anchor="middle">A♥</text>
    <text x="41" y="38" font-family="Georgia" font-size="14" font-weight="900" fill="white" transform="rotate(8 41 30)" text-anchor="middle">K♠</text>
  </svg>`,
};

export const GAMES_META = [
  { id: 'crash',    name: 'Crash',     icon: ICONS.crash,    tag: 'gradient-2', desc: 'Множитель растёт' , badge: 'HOT' },
  { id: 'mines',    name: 'Mines',     icon: ICONS.mines,    tag: 'gradient-1', desc: 'Найди безопасные', badge: 'HOT' },
  { id: 'dice',     name: 'Dice',      icon: ICONS.dice,     tag: 'gradient-6', desc: 'Над/под цели' },
  { id: 'plinko',   name: 'Plinko',    icon: ICONS.plinko,   tag: 'gradient-4', desc: 'Шарик через пеги' },
  { id: 'roulette', name: 'Roulette',  icon: ICONS.roulette, tag: 'gradient-1', desc: 'Европейская' },
  { id: 'slots',    name: 'Slots',     icon: ICONS.slots,    tag: 'gradient-4', desc: 'Барабаны 3×1' },
  { id: 'coinflip', name: 'Coinflip',  icon: ICONS.coinflip, tag: 'gradient-4', desc: 'Орёл / Решка' },
  { id: 'wheel',    name: 'Wheel',     icon: ICONS.wheel,    tag: 'gradient-2', desc: 'Колесо удачи' },
  { id: 'limbo',    name: 'Limbo',     icon: ICONS.limbo,    tag: 'gradient-5', desc: 'Угадай множитель', badge: 'NEW' },
  { id: 'hilo',     name: 'Hi-Lo',     icon: ICONS.hilo,     tag: 'gradient-1', desc: 'Выше или ниже' },
];
