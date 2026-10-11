import { useEffect, useState } from 'react';
import type { AppState, Match, Player } from '../types';
import { daysBetween, initials, playerStats, POSITIONS, STATUS, todayISO } from '../utils';
import { Avatar } from './ui';

/** סמל קבוצה בצורת מגן — שלנו צהוב, יריבה כהה */
export function TeamBadge({ name, ours, logo, size = 56 }: { name: string; ours?: boolean; logo?: string; size?: number }) {
  if (ours && logo) return <img src={logo} alt={name} className="crest-img" style={{ width: size, height: size }} />;
  return (
    <svg className={'crest' + (ours ? ' ours' : '')} width={size} height={size * 1.12} viewBox="0 0 100 112" aria-label={name} role="img">
      <path d="M50 3 L94 16 V54 C94 82 74 100 50 109 C26 100 6 82 6 54 V16 Z" className="crest-shield" />
      <path d="M50 3 L94 16 V54 C94 82 74 100 50 109 C26 100 6 82 6 54 V16 Z" className="crest-rim" fill="none" />
      <path d="M6 40 L94 26 V38 L6 52 Z" className="crest-band" />
      <text x="50" y="76" textAnchor="middle" className="crest-text">
        {initials(name)}
      </text>
    </svg>
  );
}

/** ספירה לאחור חיה למשחק */
export function Countdown({ date, time }: { date: string; time: string }) {
  const target = new Date(`${date}T${time || '12:00'}:00`).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  if (diff === 0) return <div className="countdown live-now">היום משחקים! ⚽</div>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const days = daysBetween(todayISO(), date);
  if (!time && days <= 0) return <div className="countdown live-now">היום משחקים! ⚽</div>;
  const parts = time ? [{ v: d, l: 'ימים' }, { v: h, l: 'שעות' }, { v: m, l: 'דקות' }] : [{ v: days, l: days === 1 ? 'יום' : 'ימים' }];
  return (
    <div className="countdown">
      {parts.map((p) => (
        <div key={p.l} className="cd-box">
          <b>{String(p.v).padStart(2, '0')}</b>
          <small>{p.l}</small>
        </div>
      ))}
    </div>
  );
}

/** כרטיס שחקן בסגנון קלפי אספנות */
export function FutCard({ player, state, onClick }: { player: Player; state: AppState; onClick?: () => void }) {
  const s = playerStats(state, player.id);
  const out = player.status !== 'fit';
  return (
    <button className={'fut' + (player.captain ? ' captain-card' : '') + (out ? ' out' : '')} onClick={onClick}>
      <span className="fut-num">{player.number ?? ''}</span>
      <span className="fut-top">
        <span className="fut-pos">{POSITIONS[player.position]}</span>
        {player.captain && <span className="fut-c">ק</span>}
      </span>
      <span className="fut-photo">
        <Avatar photo={player.photo} name={player.name} size={84} />
      </span>
      <span className="fut-name">{player.name}</span>
      <span className="fut-stats">
        <span>
          <b>{s.apps}</b>
          <small>הופ׳</small>
        </span>
        <span>
          <b>{s.goals}</b>
          <small>שערים</small>
        </span>
        <span>
          <b>{s.assists}</b>
          <small>בישולים</small>
        </span>
      </span>
      {out && (
        <span className="fut-status" style={{ background: STATUS[player.status].color }}>
          {STATUS[player.status].label}
        </span>
      )}
    </button>
  );
}

/** רשימת כובשים לפי צד (למרכז המשחק) */
export function Scorers({ m, state }: { m: Match; state: AppState }) {
  const goals = m.events.filter((e) => e.type === 'goal');
  if (!goals.length) return null;
  const byPlayer = new Map<string, number[]>();
  goals.forEach((g) => {
    const k = g.playerId ?? 'og';
    byPlayer.set(k, [...(byPlayer.get(k) ?? []), g.minute]);
  });
  return (
    <div className="sb-scorers">
      {[...byPlayer.entries()].map(([pid, mins]) => {
        const name = pid === 'og' ? 'גול עצמי' : state.players.find((p) => p.id === pid)?.name ?? '—';
        const known = mins.filter(Boolean);
        return (
          <span key={pid}>
            ⚽ {name}
            {mins.length > 1 && ` ×${mins.length}`}
            {known.length > 0 && <small> {known.map((x) => x + '׳').join(', ')}</small>}
          </span>
        );
      })}
    </div>
  );
}

/** קישור חיצוני בטוח (רק http/https) */
const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : undefined);

/** כפתורי ניווט: וייז וגוגל מפות — לפי קישור שהודבק, או לפי שם המקום */
export function NavButtons({ place, link, compact }: { place?: string; link?: string; compact?: boolean }) {
  const url = safeUrl(link);
  const q = place?.trim();
  if (!url && !q) return null;
  const isWaze = url && /waze\.com/i.test(url);
  const isGoogle = url && /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url);
  const waze = isWaze ? url : q ? 'https://waze.com/ul?q=' + encodeURIComponent(q) + '&navigate=yes' : url;
  const google = isGoogle ? url : q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : url;
  return (
    <div className={'nav-buttons' + (compact ? ' compact' : '')} onClick={(e) => e.stopPropagation()}>
      <a className="nav-btn waze" href={waze} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path fill="currentColor" d="M12 2.5c5 0 9 3.6 9 8.2 0 2.7-1.4 4.6-3.4 5.8.2 1.6-.9 3-2.5 3-1.2 0-2.2-.8-2.5-1.9h-1.7c-.3 1.1-1.3 1.9-2.5 1.9-1.4 0-2.5-1.1-2.6-2.4C3.7 16 3 14.5 3 12.6c-.6-.2-1-.7-1-1.4 0-.8.6-1.4 1.4-1.4C4.4 5.5 7.9 2.5 12 2.5zm-3 7a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zm6 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zm-6.2 4.2c.8 1.2 1.9 1.8 3.2 1.8s2.4-.6 3.2-1.8l-1-.6c-.6.8-1.3 1.2-2.2 1.2s-1.6-.4-2.2-1.2z" />
        </svg>
        {!compact && 'וייז'}
      </a>
      <a className="nav-btn gmaps" href={google} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
        {!compact && 'גוגל מפות'}
      </a>
    </div>
  );
}

/** כרטיס "הצוות המקצועי" לדף הבית */
export function StaffCard({ state }: { state: AppState }) {
  const staff = state.staff.filter((s) => s.showOnHome !== false);
  if (!staff.length) return null;
  const head = staff.find((s) => s.role.includes('מאמן ראשי')) ?? staff[0];
  const rest = staff.filter((s) => s !== head);
  const photoOf = (s: (typeof staff)[number]) => s.photo ?? state.players.find((p) => p.id === s.playerId)?.photo;
  return (
    <section className="staff-home">
      <div className="sh-head">
        <span className="sh-label">{head.role.includes('מאמן') ? 'המאמן' : head.role}</span>
        <div className="sh-coach">
          <Avatar photo={photoOf(head)} name={head.name} size={64} />
          <div>
            <strong>{head.name}</strong>
            <small>{head.role}</small>
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <div className="sh-rest">
          <span className="sh-label">הצוות המקצועי</span>
          <div className="sh-list">
            {[head, ...rest].map((s) => (
              <span key={s.id} className="sh-person">
                <Avatar photo={photoOf(s)} name={s.name} size={34} />
                <span>
                  <b>{s.name}</b>
                  <small>{s.role}</small>
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
