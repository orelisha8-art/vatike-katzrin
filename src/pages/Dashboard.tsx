import type { ReactNode } from 'react';
import type { Player } from '../types';
import { useApp } from '../store';
import { Countdown, NavButtons, StaffCard, TeamBadge } from '../components/club';
import { TeamBanner } from '../components/ui';
import { go } from '../router';
import { Avatar, Icon, RatingBadge, Stat } from '../components/ui';
import { EVENT_TYPES, FormGuide, RsvpMini, rsvpCounts, upcomingItems } from '../components/cards';
import { daysBetween, money, playerStats, relDay, resultOf, score, shortDate, STATUS, todayISO , hhmm } from '../utils';

export default function Dashboard() {
  const state = useApp();
  const t = todayISO();
  const upcoming = upcomingItems(state);
  const nextMatch = upcoming.find((i) => i.kind === 'match');
  const finished = state.matches.filter((m) => m.status === 'finished');
  const record = { W: 0, D: 0, L: 0, gf: 0, ga: 0 };
  finished.forEach((m) => {
    record[resultOf(m)!]++;
    const s = score(m);
    record.gf += s.us;
    record.ga += s.them;
  });

  // ---------- התראות ----------
  const alerts: { icon: string; text: string; tone: 'bad' | 'warn'; to: string }[] = [];
  state.players
    .filter((p) => p.active && p.status !== 'fit')
    .forEach((p) =>
      alerts.push({
        icon: 'alert',
        tone: p.status === 'injured' ? 'bad' : 'warn',
        text: `${p.name} — ${STATUS[p.status].label}${p.statusNote ? ': ' + p.statusNote : ''}${p.returnDate ? ` (חוזר ${shortDate(p.returnDate)})` : ''}`,
        to: 'squad/' + p.id,
      }),
    );
  state.players
    .filter((p) => p.active && p.medicalExpiry)
    .forEach((p) => {
      const d = daysBetween(t, p.medicalExpiry!);
      if (d < 0) alerts.push({ icon: 'alert', tone: 'bad', text: `אישור רפואי של ${p.name} פג תוקף — אסור לשתף במשחק`, to: 'squad/' + p.id });
      else if (d <= 30) alerts.push({ icon: 'alert', tone: 'warn', text: `אישור רפואי של ${p.name} פג בעוד ${d} ימים`, to: 'squad/' + p.id });
    });
  state.players
    .filter((p) => p.active && p.registered === false)
    .forEach((p) => alerts.push({ icon: 'clipboard', tone: 'warn', text: `ל${p.name} אין כרטיס שחקן באיגוד`, to: 'squad/' + p.id }));
  const overdue = [...state.maintenance, ...state.tdTasks].filter((x) => !x.done && x.due && x.due < t);
  if (overdue.length) alerts.push({ icon: 'clipboard', tone: 'warn', text: `${overdue.length} משימות באיחור`, to: 'td' });
  const unpaid = state.transactions.filter((x) => !x.paid && x.kind !== 'income');
  if (unpaid.length)
    alerts.push({ icon: 'wallet', tone: 'warn', text: `${unpaid.length} תשלומים ממתינים (${money(unpaid.reduce((a, x) => a + x.amount, 0))})`, to: 'finance' });
  const broken = state.equipment.filter((e) => e.condition === 'לתיקון');
  if (broken.length) alerts.push({ icon: 'box', tone: 'warn', text: `${broken.length} פריטי ציוד ממתינים לתיקון`, to: 'equipment' });

  // ---------- מובילים ----------
  const stats = state.players.filter((p) => p.active).map((p) => ({ p, s: playerStats(state, p.id) }));
  const assisters = stats.filter((x) => x.s.assists > 0).sort((a, b) => b.s.assists - a.s.assists || b.s.goals - a.s.goals).slice(0, 3);
  const scorers = stats.filter((x) => x.s.goals > 0).sort((a, b) => b.s.goals - a.s.goals || b.s.assists - a.s.assists).slice(0, 3);
  const rated = stats.filter((x) => x.s.avgRating !== null).sort((a, b) => b.s.avgRating! - a.s.avgRating!).slice(0, 3);

  const fit = state.players.filter((p) => p.active && p.status === 'fit').length;

  return (
    <div className="page">
      <TeamBanner />
      <StaffCard state={state} />
      <div className="hello">
        <h1>שלום, צוות 👋</h1>
        <p className="muted">{state.settings.league}</p>
      </div>

      {nextMatch && nextMatch.kind === 'match' && (
        <button className="hero" onClick={() => go('matches/' + nextMatch.id)}>
          <div className="hero-top">
            <span className="hero-label">המשחק הבא · {nextMatch.match.competition}</span>
            <span className="hero-when">
              {relDay(nextMatch.date)} · {hhmm(nextMatch.time)}
            </span>
          </div>
          <div className="hero-vs">
            <span className="hero-side">
              <TeamBadge name={nextMatch.match.home ? state.settings.teamName : nextMatch.match.opponent} ours={nextMatch.match.home} logo={state.settings.logo} size={46} />
              {nextMatch.match.home ? state.settings.teamName : nextMatch.match.opponent}
            </span>
            <em>VS</em>
            <span className="hero-side">
              <TeamBadge name={nextMatch.match.home ? nextMatch.match.opponent : state.settings.teamName} ours={!nextMatch.match.home} logo={state.settings.logo} size={46} />
              {nextMatch.match.home ? nextMatch.match.opponent : state.settings.teamName}
            </span>
          </div>
          <Countdown date={nextMatch.date} time={nextMatch.time} />
          <div className="hero-bottom">
            <span>{nextMatch.match.venue}</span>
            <NavButtons place={nextMatch.match.venue} link={nextMatch.match.mapUrl} compact />
          </div>
          <div className="hero-steps">
            <Step done={rsvpCounts(state, nextMatch.id).yes > 0} label={`אישורי הגעה ${rsvpCounts(state, nextMatch.id).yes}`} />
            <Step done={nextMatch.match.squad.length > 0} label={`סגל ${nextMatch.match.squad.length || ''}`} />
            <Step done={nextMatch.match.slots.filter(Boolean).length === 11} label="הרכב" />
            <Step done={nextMatch.match.lineupPublished} label="פורסם לשחקנים" />
          </div>
        </button>
      )}


      {state.matches.some((m) => m.status === 'finished') && (
        <section className="results-strip">
          <h2 className="group-title">תוצאות אחרונות</h2>
          <div className="results-scroll">
            {state.matches
              .filter((m) => m.status === 'finished')
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((m) => {
                const sc = score(m);
                const r = resultOf(m)!;
                return (
                  <button key={m.id} className={'result-tile res-border-' + r} onClick={() => go('matches/' + m.id)}>
                    <small>{m.competition} · {shortDate(m.date)}</small>
                    <span className="rt-row">
                      <TeamBadge name={m.opponent} size={30} />
                      <b>{m.opponent}</b>
                    </span>
                    <span className={'rt-score res-' + r}>{sc.us}:{sc.them}</span>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      <div className="stats-row">
        <Stat label="כשירים" value={`${fit}/${state.players.filter((p) => p.active).length}`} tone="ok" />
        <Stat label="מאזן (נ-ת-ה)" value={`${record.W}-${record.D}-${record.L}`} tone="brand" />
        <Stat label="שערים" value={`${record.gf}:${record.ga}`} />
        <div className="stat">
          <div className="stat-value">
            <FormGuide matches={state.matches} />
          </div>
          <div className="stat-label">כושר אחרון</div>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>דורש תשומת לב</h2>
            <span className="count-chip">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <p className="muted">הכל תקין 💪</p>
          ) : (
            <ul className="alert-list">
              {alerts.slice(0, 8).map((a, i) => (
                <li key={i}>
                  <button className={'alert-item tone-' + a.tone} onClick={() => go(a.to)}>
                    <Icon name={a.icon} size={18} />
                    <span>{a.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>השבוע הקרוב</h2>
            <a href="#/schedule" className="link">
              ללו״ז המלא
            </a>
          </div>
          <ul className="mini-schedule">
            {upcoming.slice(0, 5).map((i) => (
              <li key={i.id}>
                <button onClick={() => go(i.kind === 'match' ? 'matches/' + i.id : 'schedule')}>
                  <span className="ms-emoji">{EVENT_TYPES[i.kind === 'match' ? 'match' : i.event.type].emoji}</span>
                  <span className="ms-main">
                    <strong>{i.kind === 'match' ? 'משחק נגד ' + i.match.opponent : i.event.title}</strong>
                    <small>
                      {relDay(i.date)} · {hhmm(i.time)}
                    </small>
                  </span>
                  <RsvpMini itemId={i.id} state={state} />
                </button>
              </li>
            ))}
            {upcoming.length === 0 && <p className="muted">אין אירועים קרובים</p>}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>מלך השערים ⚽</h2>
            <a href="#/stats" className="link">
              לכל הטבלאות
            </a>
          </div>
          <Leaders rows={scorers.map((x) => ({ p: x.p, value: <b className="big-num">{x.s.goals}</b>, sub: `${x.s.assists} בישולים` }))} empty="עוד אין שערים" />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>מלך הבישולים 🅰️</h2>
            <a href="#/stats" className="link">
              לכל הטבלאות
            </a>
          </div>
          <Leaders rows={assisters.map((x) => ({ p: x.p, value: <b className="big-num">{x.s.assists}</b>, sub: `${x.s.goals} שערים` }))} empty="עוד אין בישולים" />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>ציון ממוצע גבוה</h2>
          </div>
          <Leaders rows={rated.map((x) => ({ p: x.p, value: <RatingBadge value={Math.round(x.s.avgRating! * 10) / 10} />, sub: `${x.s.ratings.length} משחקים` }))} empty="עוד אין ציונים" />
        </section>
      </div>

      <div className="quick-actions">
        <button className="btn" onClick={() => go('schedule')}>
          <Icon name="calendar" size={18} /> אימון חדש
        </button>
        <button className="btn" onClick={() => go('matches')}>
          <Icon name="ball" size={18} /> משחק חדש
        </button>
        <button className="btn" onClick={() => go('squad')}>
          <Icon name="users" size={18} /> שחקן חדש
        </button>
      </div>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={'hero-step' + (done ? ' done' : '')}>
      <Icon name={done ? 'check' : 'x'} size={14} />
      {label}
    </span>
  );
}

export function Leaders({ rows, empty }: { rows: { p: Player; value: ReactNode; sub?: string }[]; empty: string }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <ol className="leaders">
      {rows.map(({ p, value, sub }, i) => (
        <li key={p.id}>
          <button onClick={() => go('squad/' + p.id)}>
            <span className="rank">{i + 1}</span>
            <Avatar player={p} size={36} />
            <span className="leader-name">
              <strong>{p.name}</strong>
              {sub && <small>{sub}</small>}
            </span>
            {value}
          </button>
        </li>
      ))}
    </ol>
  );
}
