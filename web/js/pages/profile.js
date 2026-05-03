import { api } from '../api.js';
import { el, fmt, toast } from '../ui.js';
import { state, refreshUser } from '../state.js';

export async function profilePage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || {};

  return el('div', { class: 'page' },
    el('section', { class: 'card glow' },
      el('div', { class: 'row gap-12' },
        u.photo_url ?
          el('img', { src: u.photo_url, alt: '', style: { width: '64px', height: '64px', borderRadius: '50%' } })
          : el('div', { style: { width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' } }, '👤'),
        el('div', { class: 'col grow' },
          el('div', { style: { fontWeight: 800, fontSize: '18px' } }, u.first_name || u.username || 'Игрок'),
          el('div', { class: 'muted' }, u.username ? '@' + u.username : `id ${u.tg_id}`),
          el('div', { class: 'kicker mt-8' },
            `${u.vip_name || 'Bronze'} · ${fmt(u.xp || 0)} XP`),
        ),
      ),
    ),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, '📊 Статистика'),
      el('div', { class: 'col gap-6' },
        kvRow('Поставлено', `${fmt(u.total_wagered)} AC`),
        kvRow('Выиграно', `${fmt(u.total_won)} AC`),
        kvRow('Депозиты', `${fmt(u.total_deposited)} ₽`),
        kvRow('Выводы', `${fmt(u.total_withdrawn)} ₽`),
      ),
    ),
    el('a', { class: 'btn outline full mt-12', href: '#/referrals' }, '🤝 Рефералы'),
    el('a', { class: 'btn outline full mt-12', href: '#/provably-fair' }, '🔐 Provably-fair'),
    el('a', { class: 'btn outline full mt-12', href: '#/responsible' }, '🛡 Ответственная игра'),
    el('a', { class: 'btn outline full mt-12', href: '#/faq' }, '❓ FAQ'),
    el('a', { class: 'btn outline full mt-12', href: '#/terms' }, '📜 Условия'),
    el('a', { class: 'btn outline full mt-12', href: '#/privacy' }, '🔒 Политика'),
    el('a', { class: 'btn outline full mt-12', href: '#/support' }, '💬 Поддержка'),
  );
}

function kvRow(k, v) {
  return el('div', { class: 'row between' },
    el('span', { class: 'muted' }, k),
    el('span', { style: { fontWeight: 700 } }, v),
  );
}

export async function provablyFairPage() {
  if (!state.user) await refreshUser().catch(() => null);
  const u = state.user || {};
  const newClient = el('input', {
    class: 'input', value: u.client_seed || '', placeholder: 'Свой client seed (опционально)'
  });
  return el('div', { class: 'page' },
    el('div', { class: 'game-header' },
      el('div', { class: 'title' }, '🔐 Provably-fair'),
      el('a', { class: 'btn outline', href: '#/profile' }, '← Назад'),
    ),
    el('div', { class: 'card' },
      el('p', { class: 'muted' },
        'Каждая ставка использует HMAC-SHA512(server_seed, client_seed:nonce). ',
        'Сейчас вы видите только SHA-256 hash активного server_seed; после ротации ',
        'seed раскрывается и вы можете перепроверить любую прошлую ставку.'),
      el('div', { class: 'pf-row mt-12' },
        el('div', { class: 'lbl' }, 'Server hash'),
        el('div', { class: 'val' }, u.server_seed_hash || '—'),
        el('div', { class: 'lbl' }, 'Client seed'),
        el('div', { class: 'val' }, u.client_seed || '—'),
        el('div', { class: 'lbl' }, 'Nonce'),
        el('div', { class: 'val' }, String(u.nonce ?? 0)),
      ),
    ),
    el('div', { class: 'card mt-12' },
      el('div', { class: 'h' }, 'Ротация seed'),
      el('div', { class: 'muted mb-12' },
        'Текущий server_seed будет раскрыт, выдан новый, nonce обнулится. ',
        'Это позволяет вам убедиться, что сервер не подкручивал результаты.'),
      newClient,
      el('button', { class: 'btn primary mt-12', onclick: async (e) => {
        e.target.disabled = true;
        try {
          const r = await api.rotateSeeds(newClient.value);
          toast('Seed раскрыт. Скопируйте его для проверки.', 'success');
          await refreshUser();
          alert('Раскрытый server_seed:\n' + r.revealed_server_seed);
          location.hash = '#/provably-fair';
        } catch (err) { toast(err.message, 'error'); }
        finally { e.target.disabled = false; }
      } }, 'Сменить seed'),
    ),
  );
}
