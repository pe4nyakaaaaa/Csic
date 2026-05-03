import { api } from '../api.js';
import { el, fmt, toast } from '../ui.js';
import { state, refreshUser } from '../state.js';

export async function walletPage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || {};
  return el('div', { class: 'page' },
    el('section', { class: 'card glow' },
      el('div', { class: 'kicker' }, 'Кошелёк'),
      el('div', { class: 'row between mt-8' },
        el('div', { class: 'h', style: { fontSize: '32px' } }, `${fmt(u.balance)} AC`),
        el('div', { class: 'col' },
          el('span', { class: 'muted' }, 'Бонус'),
          el('span', { style: { fontWeight: 700 } }, `${fmt(u.bonus_balance)} AC`),
        ),
      ),
      u.wager_required > 0 ? el('div', { class: 'mt-12' },
        el('div', { class: 'row between' },
          el('span', { class: 'muted' }, 'Wagering'),
          el('span', {}, `${fmt(u.wager_progress)} / ${fmt(u.wager_required)}`),
        ),
        el('div', { class: 'progress mt-8' },
          el('div', { style: { width: `${Math.min(100, (u.wager_progress / u.wager_required) * 100)}%` } }),
        ),
      ) : null,
    ),
    el('div', { class: 'btn-row mt-16' },
      el('a', { class: 'btn primary', href: '#/deposit' }, '⬇️ Депозит'),
      el('a', { class: 'btn outline', href: '#/withdraw' }, '⬆️ Вывод'),
    ),
    el('div', { class: 'card mt-16' },
      el('div', { class: 'h' }, '💎 VIP'),
      el('div', { class: 'row between' },
        el('span', {}, u.vip_name || '—'),
        el('span', { class: 'muted' }, `${fmt(u.xp || 0)} XP`),
      ),
    ),
    el('a', { class: 'btn outline full mt-12', href: '#/history' }, '📜 История транзакций'),
    el('a', { class: 'btn outline full mt-12', href: '#/bets' }, '🎲 История ставок'),
  );
}

export async function depositPage() {
  let amount = 500;
  let method = 'card';
  const amtInput = el('input', {
    class: 'input', type: 'number', min: '100', step: '50', value: '500',
  });
  amtInput.addEventListener('input', () => { amount = Number(amtInput.value); });

  const methods = [
    ['card', '💳 Карта'],
    ['sbp', '⚡ СБП'],
    ['qiwi', '🟠 QIWI'],
    ['yoomoney', '💛 ЮMoney'],
    ['crypto', '₿ Crypto'],
  ];
  const methodChips = el('div', { class: 'row wrap gap-6 mt-8' });
  methods.forEach(([id, name]) => {
    const c = el('button', { class: `chip ${id === method ? 'active' : ''}`, onclick: () => {
      method = id;
      Array.from(methodChips.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    } }, name);
    methodChips.appendChild(c);
  });

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '⬇️ Депозит'),
      el('a', { class: 'btn outline', href: '#/wallet' }, '← Назад'),
    ),
    el('div', { class: 'card' },
      el('div', { class: 'label' }, 'Сумма (₽)'),
      amtInput,
      el('div', { class: 'row gap-6 mt-8' },
        ...[100, 500, 1000, 5000, 10000].map(v =>
          el('button', { class: 'chip', onclick: () => { amount = v; amtInput.value = v; } }, `${v}`)),
      ),
      el('div', { class: 'label mt-12' }, 'Способ оплаты'),
      methodChips,
      el('div', { class: 'mt-12 muted', style: { fontSize: '13px' } },
        'Welcome-бонус +100% начисляется автоматически на первый депозит, до 10 000 AC. ',
        'Бонус нужно прокрутить ×30 в любых играх перед выводом.'),
      el('button', { class: 'btn primary full mt-12', onclick: async (e) => {
        e.target.disabled = true; e.target.textContent = '…';
        try {
          const r = await api.deposit(amount, method);
          if (r.pay_url.startsWith('http')) {
            // open externally
            if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(r.pay_url, { try_instant_view: false });
            else window.open(r.pay_url, '_blank');
            toast('Открываем платёжную форму…');
          } else {
            // dev mode — confirm immediately
            const order = new URL(r.pay_url, location.origin).searchParams.get('order_id');
            await api.devConfirm(order);
            toast(`+${r.amount_coins} AC зачислены (dev mode)`, 'success');
            await refreshUser();
            location.hash = '#/wallet';
          }
        } catch (err) {
          toast(err.message || 'Ошибка', 'error');
        } finally {
          e.target.disabled = false; e.target.textContent = '💳 Перейти к оплате';
        }
      } }, '💳 Перейти к оплате'),
    ),
  );
}

export async function withdrawPage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || {};
  let amount = 500, method = 'card', wallet = '';

  const amtInput = el('input', {
    class: 'input', type: 'number', min: '500', step: '50', value: '500',
  });
  amtInput.addEventListener('input', () => { amount = Number(amtInput.value); });

  const walletInput = el('input', { class: 'input', placeholder: 'Номер карты / кошелька' });
  walletInput.addEventListener('input', () => { wallet = walletInput.value.trim(); });

  const methods = [
    ['card', '💳 Карта'],
    ['sbp', '⚡ СБП'],
    ['qiwi', '🟠 QIWI'],
    ['yoomoney', '💛 ЮMoney'],
  ];
  const methodChips = el('div', { class: 'row wrap gap-6 mt-8' });
  methods.forEach(([id, name]) => {
    const c = el('button', { class: `chip ${id === method ? 'active' : ''}`, onclick: () => {
      method = id;
      Array.from(methodChips.children).forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    } }, name);
    methodChips.appendChild(c);
  });

  const wagerNote = u.wager_required > u.wager_progress
    ? el('div', { class: 'card', style: { borderColor: 'var(--warn)' } },
        el('div', { class: 'h' }, '⚠️ Wagering не выполнен'),
        el('div', { class: 'muted' },
          `Вам нужно прокрутить ещё ${fmt(u.wager_required - u.wager_progress)} AC ` +
          'до того, как вывод станет доступен.'))
    : null;

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '⬆️ Вывод'),
      el('a', { class: 'btn outline', href: '#/wallet' }, '← Назад'),
    ),
    wagerNote,
    el('div', { class: 'card mt-12' },
      el('div', { class: 'label' }, `Сумма (₽). Доступно: ${fmt(u.balance)} AC`),
      amtInput,
      el('div', { class: 'label mt-12' }, 'Способ'),
      methodChips,
      el('div', { class: 'label mt-12' }, 'Реквизиты'),
      walletInput,
      el('button', { class: 'btn primary full mt-12', onclick: async (e) => {
        if (!wallet) return toast('Введите реквизиты', 'error');
        e.target.disabled = true;
        try {
          await api.withdraw(amount, method, wallet);
          toast('Заявка на вывод создана', 'success');
          await refreshUser();
          location.hash = '#/wallet';
        } catch (err) {
          toast(err.message || 'Ошибка', 'error');
        } finally { e.target.disabled = false; }
      } }, '📤 Запросить вывод'),
    ),
  );
}

export async function historyPage() {
  let txns;
  try { txns = await api.transactions(100); } catch { txns = []; }
  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '📜 История'),
      el('a', { class: 'btn outline', href: '#/wallet' }, '← Назад'),
    ),
    el('div', { class: 'card' },
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Тип'),
          el('th', {}, 'Сумма'),
          el('th', {}, 'Баланс'),
          el('th', {}, 'Дата'),
        )),
        el('tbody', {}, ...(txns.length ? txns.map(t => el('tr', {},
          el('td', {}, t.type),
          el('td', { class: t.amount > 0 ? 'win' : 'lose' }, fmt(t.amount)),
          el('td', {}, fmt(t.balance_after)),
          el('td', {}, new Date(t.created_at).toLocaleString('ru-RU')),
        )) : [el('tr', {}, el('td', { colspan: 4, class: 'muted' }, 'Пусто'))])),
      ),
    ),
  );
}

export async function betsPage() {
  let bets;
  try { bets = await api.bets(100); } catch { bets = []; }
  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🎲 Ставки'),
      el('a', { class: 'btn outline', href: '#/wallet' }, '← Назад'),
    ),
    el('div', { class: 'card' },
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Игра'),
          el('th', {}, 'Ставка'),
          el('th', {}, 'Множитель'),
          el('th', {}, 'Выигрыш'),
        )),
        el('tbody', {}, ...(bets.length ? bets.map(b => el('tr', {},
          el('td', {}, b.game),
          el('td', {}, fmt(b.bet_amount)),
          el('td', { class: b.win ? 'win' : 'lose' }, `${fmt(b.multiplier, 2)}×`),
          el('td', { class: b.win ? 'win' : '' }, fmt(b.payout)),
        )) : [el('tr', {}, el('td', { colspan: 4, class: 'muted' }, 'Ставок пока нет'))])),
      ),
    ),
  );
}
