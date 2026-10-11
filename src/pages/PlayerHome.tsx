import { useApp } from '../store';
import { Countdown, NavButtons, StaffCard, TeamBadge } from '../components/club';
import { TeamBanner } from '../components/ui';
import { go } from '../router';
import { Avatar, Icon, RatingBadge, Stat } from '../components/ui';
import { EVENT_TYPES, MatchCard, RsvpButtons, upcomingItems } from '../components/cards';
import { firstName, playerStats, relDay, resultOf, score, shortDate, STATUS , hhmm } from '../utils';

export default function PlayerHome({ playerId }: { playerId: string }) {
  const state = useApp();
  const me = state.players.find((p) => p.id === playerId)!;
  const s = playerStats(state, me.id);
  const upcoming = upcomingItems(state);
  const next = upcoming[0];
  const nextMatch = upcoming.find((i) => i.kind === 'match');
  const lastMatch = state.matches.filter((m) => m.status === 'finished').sort((a, b) => b.date.localeCompare(a.date))[0];
  const showRatings = state.settings.showRatingsToPlayers;

  let lineupNote: { text: string; tone: string } | null = null;
  if (nextMatch?.kind === 'match') {
    const m = nextMatch.match;
    if (m.lineupPublished && m.slots.includes(me.id)) lineupNote = { text: 'אתה בהרכב הפותח! 💪', tone: 'ok' };
    else if (m.lineupPublished && m.squad.includes(me.id)) lineupNote = { text: 'אתה בסגל — מתחיל על הספסל', tone: 'brand' };
    else if (m.squad.length && m.squad.includes(me.id)) lineupNote = { text: 'זומנת לסגל המשחק ✅', tone: 'ok' };
  }

  return (
    <div className="page">
      <TeamBanner />
      <StaffCard state={state} />
      <div className="player-hello">
        <Avatar player={me} size={56} />
        <div>
          <h1>היי {firstName(me.name)} 👋</h1>
          <p className="muted">
            {me.number != null && <>#{me.number} · </>}<span style={{ color: STATUS[me.status].color }}>{STATUS[me.status].label}</span>
          </p>
          {!me.photo && (
            <button className="btn btn-sm" onClick={() => go('me')}>
              📸 הוסף תמונה שלך
            </button>
          )}
        </div>
      </div>

      {next && (
        <section className="card next-event">
          <span className="hero-label">
            {EVENT_TYPES[next.kind === 'match' ? 'match' : next.event.type].emoji} האירוע הבא
          </span>
          <h2>{next.kind === 'match' ? `משחק נגד ${next.match.opponent}` : next.event.title}</h2>
          <p className="muted">
            {relDay(next.date)} · {hhmm(next.time)} · {next.kind === 'match' ? next.match.venue : next.event.location}
          </p>
          {next.kind === 'event' && next.event.notes && <p className="pre small">{next.event.notes}</p>}
          <NavButtons place={next.kind === 'match' ? next.match.venue : next.event.location} link={next.kind === 'match' ? next.match.mapUrl : next.event.mapUrl} />
          <RsvpButtons itemId={next.id} playerId={me.id} big />
        </section>
      )}

      {nextMatch?.kind === 'match' && (
        <button className="hero compact" onClick={() => go('matches/' + nextMatch.id)}>
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
          {lineupNote && <div className={'lineup-note tone-' + lineupNote.tone}>{lineupNote.text}</div>}
          {nextMatch.match.lineupPublished && (
            <div className="hero-bottom">
              <span>
                <Icon name="pitch" size={16} /> לצפייה בהרכב
              </span>
            </div>
          )}
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

      <h2 className="group-title">העונה שלי</h2>
      <div className="stats-row">
        <Stat label="הופעות" value={s.apps} />
        <Stat label="שערים" value={s.goals} tone="brand" />
        <Stat label="בישולים" value={s.assists} tone="brand" />
        {showRatings ? <Stat label="ציון ממוצע" value={s.avgRating ? s.avgRating.toFixed(1) : '–'} tone="ok" /> : <Stat label="דקות" value={s.minutes} />}
      </div>

      {lastMatch && (
        <section className="card">
          <div className="card-head">
            <h2>המשחק האחרון</h2>
            {showRatings && lastMatch.ratings[me.id] && (
              <span className="my-rating">
                הציון שלך <RatingBadge value={lastMatch.ratings[me.id]} />
              </span>
            )}
          </div>
          <MatchCard match={lastMatch} onClick={() => go('matches/' + lastMatch.id)} />
          {lastMatch.motm && (
            <p className="muted small">
              ⭐ שחקן המשחק: {state.players.find((p) => p.id === lastMatch.motm)?.name}
              {lastMatch.motm === me.id && ' — זה אתה! 🔥'}
            </p>
          )}
        </section>
      )}

      {upcoming.length > 1 && (
        <section className="card">
          <div className="card-head">
            <h2>בהמשך</h2>
            <a className="link" href="#/schedule">
              ללו״ז המלא
            </a>
          </div>
          {upcoming.slice(1, 4).map((i) => (
            <div key={i.id} className="upcoming-row">
              <div>
                <strong>
                  {EVENT_TYPES[i.kind === 'match' ? 'match' : i.event.type].emoji} {i.kind === 'match' ? `משחק נגד ${i.match.opponent}` : i.event.title}
                </strong>
                <small className="muted">
                  {' '}
                  · {relDay(i.date)} {hhmm(i.time)}
                </small>
              </div>
              <RsvpButtons itemId={i.id} playerId={me.id} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
