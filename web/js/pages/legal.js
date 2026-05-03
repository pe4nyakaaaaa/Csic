import { api } from '../api.js';
import { el, toast } from '../ui.js';
import { refreshUser } from '../state.js';

export function legalPage(getter, backRoute = 'profile') {
  return async function () {
    let data;
    try { data = await getter(); }
    catch (err) { return el('div', { class: 'card' }, 'Ошибка: ' + err.message); }
    return el('div', { class: 'page legal' },
      el('div', { class: 'game-header' },
        el('div', { class: 'title' }, data.title),
        el('a', { class: 'btn outline', href: `#/${backRoute}` }, '← Назад'),
      ),
      el('div', { class: 'card' },
        ...(data.sections || []).map(s =>
          el('div', {},
            el('h2', {}, s.title),
            el('p', {}, s.body),
          ),
        ),
      ),
    );
  };
}

export const privacyPage = legalPage(() => api.privacy());
export const termsPage = legalPage(() => api.terms());

export async function responsiblePage() {
  let data;
  try { data = await api.responsible(); }
  catch (err) { return el('div', { class: 'card' }, 'Ошибка: ' + err.message); }
  return el('div', { class: 'page legal' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, data.title),
      el('a', { class: 'btn outline', href: '#/profile' }, '← Назад'),
    ),
    el('div', { class: 'card' },
      ...(data.sections || []).map(s =>
        el('div', {}, el('h2', {}, s.title), el('p', {}, s.body)),
      ),
    ),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, '🚫 Самоисключение'),
      el('div', { class: 'muted mb-12' },
        'Включите паузу — на это время вы не сможете делать ставки и депозиты.'),
      el('div', { class: 'row gap-8 wrap' },
        ...[1, 7, 30, 90, 180].map(d =>
          el('button', { class: 'btn outline', onclick: async (e) => {
            if (!confirm(`Включить самоисключение на ${d} дн.?`)) return;
            e.target.disabled = true;
            try {
              await api.selfExclude(d);
              toast(`Самоисключение включено на ${d} дн.`, 'success');
              await refreshUser();
            } catch (err) { toast(err.message, 'error'); }
            finally { e.target.disabled = false; }
          } }, `${d} дн.`)),
      ),
    ),
  );
}

export async function faqPage() {
  let data;
  try { data = await api.faq(); }
  catch (err) { return el('div', { class: 'card' }, 'Ошибка: ' + err.message); }
  return el('div', { class: 'page legal' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, data.title),
      el('a', { class: 'btn outline', href: '#/profile' }, '← Назад'),
    ),
    ...(data.items || []).map(item =>
      el('div', { class: 'card mt-12' },
        el('h2', {}, item.q),
        el('p', { class: 'muted' }, item.a),
      ),
    ),
  );
}

export async function supportPage() {
  let data;
  try { data = await api.support(); }
  catch (err) { return el('div', { class: 'card' }, 'Ошибка: ' + err.message); }
  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '💬 Поддержка'),
      el('a', { class: 'btn outline', href: '#/profile' }, '← Назад'),
    ),
    el('div', { class: 'card glow' },
      el('div', { class: 'h' }, 'Связаться с нами'),
      el('div', { class: 'col gap-12 mt-8' },
        el('div', { class: 'row between' },
          el('span', { class: 'muted' }, 'Telegram'),
          el('a', { class: 'btn outline', href: `https://t.me/${(data.telegram || '').replace(/^@/, '')}`, target: '_blank' },
            data.telegram),
        ),
        el('div', { class: 'row between' },
          el('span', { class: 'muted' }, 'Email'),
          el('span', {}, data.email),
        ),
        el('div', { class: 'row between' },
          el('span', { class: 'muted' }, 'Часы работы'),
          el('span', {}, data.hours),
        ),
      ),
    ),
  );
}
