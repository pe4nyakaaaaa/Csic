import { api } from '../api.js';
import { el, fmt, toast } from '../ui.js';
import { state, refreshUser } from '../state.js';

export async function bonusesPage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || {};

  const dailyBtn = el('button', { class: 'btn primary', onclick: async (e) => {
    e.target.disabled = true;
    try {
      const r = await api.daily();
      toast(`+${r.amount} AC получено!`, 'success');
      await refreshUser();
    } catch (err) {
      toast(err.message || 'Не удалось получить бонус', 'error');
    } finally { e.target.disabled = false; }
  } }, '🎁 Получить');

  const cashbackBtn = el('button', { class: 'btn outline', onclick: async (e) => {
    e.target.disabled = true;
    try {
      const r = await api.cashback();
      toast(`+${fmt(r.amount)} AC кэшбек!`, 'success');
      await refreshUser();
    } catch (err) {
      toast(err.message || 'Кэшбек недоступен', 'error');
    } finally { e.target.disabled = false; }
  } }, 'Запросить');

  return el('div', { class: 'page' },
    el('div', { class: 'section-title' }, '🎁 Бонусы'),

    el('div', { class: 'card glow' },
      el('div', { class: 'h' }, '🌟 Welcome +100%'),
      el('div', { class: 'muted' },
        'Удвоим ваш первый депозит до 10 000 AC. Wagering ×30. ',
        u.welcome_bonus_claimed ? '✅ Уже получен' : 'Доступен на первый депозит.'),
      !u.welcome_bonus_claimed
        ? el('a', { class: 'btn primary mt-12', href: '#/deposit' }, '💳 Внести депозит')
        : null,
    ),

    el('div', { class: 'card mt-12' },
      el('div', { class: 'row between' },
        el('div', {},
          el('div', { class: 'h' }, '🌅 Ежедневный бонус'),
          el('div', { class: 'muted' }, '+50 AC раз в 24 часа'),
        ),
        dailyBtn,
      ),
    ),

    el('div', { class: 'card mt-12' },
      el('div', { class: 'row between' },
        el('div', {},
          el('div', { class: 'h' }, '💸 Кэшбек 10%'),
          el('div', { class: 'muted' }, 'От чистых проигрышей за неделю'),
        ),
        cashbackBtn,
      ),
    ),

    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, '💎 VIP-уровни'),
      el('div', { class: 'col gap-6' },
        ...[
          ['Bronze', 0],
          ['Silver', 5_000],
          ['Gold', 25_000],
          ['Platinum', 100_000],
          ['Diamond', 500_000],
          ['Aurora', 2_500_000],
        ].map(([name, xp]) => el('div', { class: 'row between' },
          el('span', { style: { fontWeight: 700 } }, name),
          el('span', { class: 'muted' }, `${xp.toLocaleString()} XP`),
        )),
      ),
    ),

    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, '🤝 Реферальная программа'),
      el('div', { class: 'muted' }, 'Получайте 1% от всех ставок ваших друзей.'),
      el('a', { class: 'btn outline mt-12', href: '#/referrals' }, 'Перейти →'),
    ),
  );
}
