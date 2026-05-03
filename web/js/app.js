// Aurora Casino — Mini App entry point.

import { api } from './api.js';
import { addRoute, bindTopNav, render } from './router.js';
import { el, toast } from './ui.js';
import { refreshUser, setState, state, subscribe } from './state.js';

import { lobbyPage } from './pages/lobby.js';
import { gamesPage } from './pages/games.js';
import { bonusesPage } from './pages/bonuses.js';
import { walletPage, depositPage, withdrawPage, historyPage, betsPage } from './pages/wallet.js';
import { referralsPage } from './pages/referrals.js';
import { profilePage, provablyFairPage } from './pages/profile.js';
import { privacyPage, termsPage, responsiblePage, faqPage, supportPage } from './pages/legal.js';

import { diceGame } from './games/dice.js';
import { coinflipGame } from './games/coinflip.js';
import { limboGame } from './games/limbo.js';
import { crashGame } from './games/crash.js';
import { minesGame } from './games/mines.js';
import { slotsGame } from './games/slots.js';
import { rouletteGame } from './games/roulette.js';
import { plinkoGame } from './games/plinko.js';
import { wheelGame } from './games/wheel.js';
import { hiloGame } from './games/hilo.js';

// --- Init Telegram WebApp SDK ---
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');
  } catch (e) { /* ignore */ }
}

function getRefFromQuery() {
  const params = new URLSearchParams(location.search);
  return params.get('ref') || tg?.initDataUnsafe?.start_param || null;
}

async function authenticate() {
  const initData = tg?.initData;
  if (!initData) {
    // Dev fallback: try to use stored token; if missing, show notice
    if (!api.token) {
      document.getElementById('app').appendChild(el('div', { class: 'card glow' },
        el('div', { class: 'h' }, '⚠️ Запустите из Telegram'),
        el('p', { class: 'muted' },
          'Aurora Casino — это Telegram Mini App. Откройте его через бота, ' +
          'иначе аутентификация невозможна.'),
      ));
      throw new Error('not in telegram');
    }
    return;
  }
  try {
    const ref = getRefFromQuery();
    const r = await api.authTelegram(initData, ref);
    api.setToken(r.token);
    setState({ user: r.user, ref });
  } catch (err) {
    api.setToken('');
    toast('Не удалось войти: ' + err.message, 'error');
    throw err;
  }
}

function setupRoutes() {
  addRoute('lobby', lobbyPage);
  addRoute('home', lobbyPage);
  addRoute('games', gamesPage);
  addRoute('bonuses', bonusesPage);
  addRoute('wallet', walletPage);
  addRoute('deposit', depositPage);
  addRoute('withdraw', withdrawPage);
  addRoute('history', historyPage);
  addRoute('bets', betsPage);
  addRoute('referrals', referralsPage);
  addRoute('profile', profilePage);
  addRoute('provably-fair', provablyFairPage);
  addRoute('privacy', privacyPage);
  addRoute('terms', termsPage);
  addRoute('responsible', responsiblePage);
  addRoute('faq', faqPage);
  addRoute('support', supportPage);

  addRoute('game-dice', diceGame);
  addRoute('game-coinflip', coinflipGame);
  addRoute('game-limbo', limboGame);
  addRoute('game-crash', crashGame);
  addRoute('game-mines', minesGame);
  addRoute('game-slots', slotsGame);
  addRoute('game-roulette', rouletteGame);
  addRoute('game-plinko', plinkoGame);
  addRoute('game-wheel', wheelGame);
  addRoute('game-hilo', hiloGame);
}

function bindBalanceUpdates() {
  const pill = document.getElementById('balance-pill');
  if (!pill) return;
  function update() {
    const u = state.user;
    if (!u) return;
    const valNode = pill.querySelector('.bal-value');
    if (valNode) valNode.textContent = (u.balance + u.bonus_balance).toFixed(2);
  }
  subscribe(update);
  update();
}

async function boot() {
  bindTopNav();
  setupRoutes();
  bindBalanceUpdates();
  try {
    await authenticate();
    await refreshUser();
  } catch (err) {
    console.warn('boot auth failed', err);
  }
  await render();
}

boot();
