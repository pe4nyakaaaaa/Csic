// Reactive shared state.

import { api } from './api.js';

const subscribers = new Set();

export const state = {
  user: null,
  gamesInfo: null,
  loaded: false,
  ref: null,
};

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of subscribers) {
    try { fn(state); } catch (e) { console.error(e); }
  }
}

export async function refreshUser() {
  try {
    const me = await api.me();
    setState({ user: me });
    return me;
  } catch (err) {
    console.error('refreshUser failed', err);
    throw err;
  }
}

export async function loadGamesInfo() {
  try {
    const info = await api.listGames();
    setState({ gamesInfo: info });
    return info;
  } catch (err) {
    console.error('listGames failed', err);
    return null;
  }
}
