import { api } from '../api.js';
import { el, fmt, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export async function referralsPage() {
  let info, earnings;
  try {
    [info, earnings] = await Promise.all([api.refInfo(), api.refEarnings()]);
  } catch (err) {
    return el('div', { class: 'card' }, 'Ошибка: ' + err.message);
  }

  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🤝 Рефералы'),
      el('a', { class: 'btn outline', href: '#/profile' }, '← Назад'),
    ),
    el('div', { class: 'card glow' },
      el('div', { class: 'kicker' }, 'Ваш реферальный код'),
      el('div', { style: { fontWeight: 800, fontSize: '32px', letterSpacing: '4px' } }, info.ref_code),
      el('div', { class: 'mt-12 muted', style: { fontSize: '13px', wordBreak: 'break-all' } },
        info.ref_link),
      el('div', { class: 'btn-row mt-12' },
        el('button', { class: 'btn primary', onclick: () => share(info) }, '📤 Поделиться'),
        el('button', { class: 'btn outline', onclick: () => copy(info.ref_link) }, '📋 Скопировать'),
      ),
    ),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, 'Статистика'),
      el('div', { class: 'row between' },
        el('div', {}, el('div', { class: 'muted' }, 'Друзей'),
          el('div', { style: { fontWeight: 800, fontSize: '20px' } }, info.referees_count)),
        el('div', { class: 'right' }, el('div', { class: 'muted' }, `Заработано (${info.pct}% с ставок)`),
          el('div', { style: { fontWeight: 800, fontSize: '20px' } }, `${fmt(info.referral_earned)} AC`)),
      ),
    ),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'row between' },
        el('div', {},
          el('div', { class: 'kicker' }, 'Реферальный баланс'),
          el('div', { style: { fontWeight: 800, fontSize: '24px' } }, `${fmt(info.referral_balance)} AC`),
        ),
        el('button', { class: 'btn primary', onclick: async (e) => {
          e.target.disabled = true;
          try {
            const r = await api.refClaim();
            toast(`+${fmt(r.transferred)} AC переведены на основной баланс`, 'success');
            await refreshUser();
            location.hash = '#/referrals';
          } catch (err) {
            toast(err.message, 'error');
          } finally { e.target.disabled = false; }
        } }, 'Забрать'),
      ),
    ),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, 'Последние начисления'),
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Реферал'),
          el('th', {}, 'Сумма'),
          el('th', {}, 'Дата'),
        )),
        el('tbody', {}, ...(earnings.length ? earnings.map(r => el('tr', {},
          el('td', {}, `#${r.referee_id}`),
          el('td', { class: 'win' }, `+${fmt(r.amount)}`),
          el('td', {}, new Date(r.created_at).toLocaleString('ru-RU')),
        )) : [el('tr', {}, el('td', { colspan: 3, class: 'muted' }, 'Пусто'))])),
      ),
    ),
  );
}

function share(info) {
  const text = `🌌 Aurora Casino — играй в Telegram Mini App. ` +
    `Используй мой реф-код ${info.ref_code} → ${info.ref_link}`;
  if (window.Telegram?.WebApp?.shareToStory) {
    window.Telegram.WebApp.shareToStory(info.ref_link, { text });
    return;
  }
  if (navigator.share) {
    navigator.share({ title: 'Aurora Casino', url: info.ref_link, text }).catch(() => {});
  } else copy(text);
}

function copy(text) {
  navigator.clipboard.writeText(text).then(() => toast('Скопировано', 'success'));
}
