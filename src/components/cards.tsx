import type { AppState, Match, Rsvp, TeamEvent } from '../types';
import { setRsvp, useApp } from '../store';
export { setRsvp };
import { hhmm, relDay, resultOf, score, shortDate, todayISO } from '../utils';
import { TeamBadge } from './club';
import { Icon } from './ui';

export type ScheduleItem =
  | { kind: 'match'; id: string; date: string; time: string; match: Match }
  | { kind: 'event'; id: string; date: string; time: string; event: TeamEvent };

export const scheduleItems = (state: AppState): ScheduleItem[] =>
  [
    ...state.matches.map((m) => ({ kind: 'match' as const, id: m.id, date: m.date, time: m.time, match: m })),
    ...state.events.map((e) => ({ kind: 'event' as const, id: e.id, date: e.date, time: e.time, event: e })),
  ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

export const upcomingItems = (state: AppState) => {
  const t = todayISO();
  return scheduleItems(state).filter((i) => i.date >= t && !(i.kind === 'match' && i.match.status === 'finished'));
};

export const EVENT_TYPES: Record<string, { label: string; emoji: string }> = {
  training: { label: 'אימון', emoji: '🏃' },
  meeting: { label: 'פגישה', emoji: '🗣️' },
  other: { label: 'אחר', emoji: '📌' },
  match: { label: 'משחק', emoji: '⚽' },
};

export const matchTitle = (m: Match, team: string) => (m.home ? `${team} - ${m.opponent}` : `${m.opponent} - ${team}`);

export function MatchCard({ match, onClick }: { match: Match; onClick?: () => void }) {
  const state = useApp();
  const s = score(match);
  const r = resultOf(match);
  return (
    <button className="card match-card" onClick={onClick}>
      <div className="match-card-date">
        <strong>{shortDate(match.date)}</strong>
        <small>{match.status === 'finished' ? match.competition : relDay(match.date)}</small>
      </div>
      <div className="match-card-main">
        <div className="match-card-opp">
          <TeamBadge name={match.opponent} size={28} />
          <span className={'ha-chip ' + (match.home ? 'home' : 'away')}>{match.home ? 'בית' : 'חוץ'}</span>
          {match.opponent}
        </div>
        <small className="muted">
          {match.status === 'finished' ? match.venue : `${match.competition} · ${hhmm(match.time)}${match.venue ? ' · ' + match.venue : ''}`}
        </small>
      </div>
      {match.status === 'scheduled' ? (
        <RsvpMini itemId={match.id} state={state} />
      ) : (
        <div className={'score-chip ' + (r ? 'res-' + r : 'live')}>
          {match.status === 'live' && <span className="live-dot" />}
          {s.us}:{s.them}
        </div>
      )}
    </button>
  );
}

export function rsvpCounts(state: AppState, itemId: string) {
  const r = state.rsvp[itemId] || {};
  const active = state.players.filter((p) => p.active);
  const c = { yes: 0, no: 0, maybe: 0, none: 0 };
  for (const p of active) {
    const v = r[p.id];
    if (v) c[v]++;
    else c.none++;
  }
  return c;
}

export function RsvpMini({ itemId, state }: { itemId: string; state: AppState }) {
  const c = rsvpCounts(state, itemId);
  return (
    <div className="rsvp-mini" title="אישורי הגעה">
      <span className="ok">✓{c.yes}</span>
      <span className="bad">✗{c.no}</span>
      {c.maybe > 0 && <span className="warn">?{c.maybe}</span>}
    </div>
  );
}

export function RsvpButtons({ itemId, playerId, big }: { itemId: string; playerId: string; big?: boolean }) {
  const state = useApp();
  const cur = state.rsvp[itemId]?.[playerId];
  const opts: { v: Rsvp; label: string; icon: string }[] = [
    { v: 'yes', label: 'מגיע', icon: 'check' },
    { v: 'maybe', label: 'אולי', icon: 'alert' },
    { v: 'no', label: 'לא מגיע', icon: 'x' },
  ];
  return (
    <div className={'rsvp-buttons' + (big ? ' big' : '')}>
      {opts.map((o) => (
        <button key={o.v} className={'rsvp-' + o.v + (cur === o.v ? ' selected' : '')} onClick={() => setRsvp(itemId, playerId, cur === o.v ? null : o.v)}>
          <Icon name={o.icon} size={big ? 22 : 16} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FormGuide({ matches }: { matches: Match[] }) {
  const last = matches
    .filter((m) => m.status === 'finished')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .reverse();
  if (!last.length) return <span className="muted small">עוד לא שוחקו משחקים</span>;
  const label = { W: 'נ', D: 'ת', L: 'ה' };
  return (
    <div className="form-guide">
      {last.map((m) => {
        const r = resultOf(m)!;
        const s = score(m);
        return (
          <span key={m.id} className={'form-dot res-' + r} title={`${m.opponent} ${s.us}:${s.them}`}>
            {label[r]}
          </span>
        );
      })}
    </div>
  );
}
