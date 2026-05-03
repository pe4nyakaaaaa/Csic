// Aurora Casino — API client.

const TOKEN_KEY = 'aurora.jwt';

export const api = {
  base: '/api',
  token: localStorage.getItem(TOKEN_KEY) || '',

  setToken(t) {
    this.token = t || '';
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  },

  async req(path, { method = 'GET', body, signal } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const resp = await fetch(this.base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    let data;
    const text = await resp.text();
    try { data = text ? JSON.parse(text) : null; }
    catch { data = { detail: text }; }
    if (!resp.ok) {
      const err = new Error(data?.detail || `HTTP ${resp.status}`);
      err.status = resp.status; err.data = data;
      throw err;
    }
    return data;
  },

  // --- Auth ---
  authTelegram(initData, ref) {
    return this.req('/auth/telegram', { method: 'POST', body: { init_data: initData, ref } });
  },

  // --- User ---
  me() { return this.req('/user/me'); },
  transactions(limit = 50) { return this.req(`/user/transactions?limit=${limit}`); },
  bets(limit = 50) { return this.req(`/user/bets?limit=${limit}`); },
  rotateSeeds(client_seed) {
    return this.req('/user/seeds/rotate', { method: 'POST', body: { client_seed } });
  },
  selfExclude(days) {
    return this.req('/user/self-exclude', { method: 'POST', body: { days } });
  },

  // --- Games ---
  listGames() { return this.req('/games/list'); },
  play(game, bet, params, client_seed) {
    return this.req(`/games/${game}/play`, {
      method: 'POST',
      body: { bet, params, client_seed },
    });
  },

  // --- Bonuses ---
  daily() { return this.req('/bonuses/daily', { method: 'POST' }); },
  cashback() { return this.req('/bonuses/cashback', { method: 'POST' }); },

  // --- Referrals ---
  refInfo()   { return this.req('/referrals/info'); },
  refClaim()  { return this.req('/referrals/claim', { method: 'POST' }); },
  refEarnings() { return this.req('/referrals/earnings'); },

  // --- Payments ---
  deposit(amount_rub, method) {
    return this.req('/payments/deposit', { method: 'POST', body: { amount_rub, method } });
  },
  devConfirm(order_id) {
    return this.req('/payments/dev-confirm', { method: 'POST', body: { order_id } });
  },
  withdraw(amount_rub, method, wallet) {
    return this.req('/payments/withdraw', { method: 'POST', body: { amount_rub, method, wallet } });
  },

  // --- Content ---
  privacy()      { return this.req('/content/privacy'); },
  terms()        { return this.req('/content/terms'); },
  responsible()  { return this.req('/content/responsible'); },
  faq()          { return this.req('/content/faq'); },
  support()      { return this.req('/content/support'); },
};
