import { useEffect, useState } from 'react';
import type { AppState, Match, Player } from '../types';
import { initials, playerStats, POSITIONS, STATUS } from '../utils';
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
  const parts = time ? [{ v: d, l: 'ימים' }, { v: h, l: 'שעות' }, { v: m, l: 'דקות' }] : [{ v: d + 1, l: 'ימים' }];
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
