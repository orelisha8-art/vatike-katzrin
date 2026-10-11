import { useApp } from '../store';
import { TeamBanner } from '../components/ui';
import { go } from '../router';
import { Avatar, Icon, RatingBadge, Stat } from '../components/ui';
import { EVENT_TYPES, MatchCard, RsvpButtons, upcomingItems } from '../components/cards';
import { firstName, playerStats, relDay, STATUS } from '../utils';

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
            {relDay(next.date)} · {next.time} · {next.kind === 'match' ? next.match.venue : next.event.location}
          </p>
          {next.kind === 'event' && next.event.notes && <p className="pre small">{next.event.notes}</p>}
          <RsvpButtons itemId={next.id} playerId={me.id} big />
        </section>
      )}

      {nextMatch?.kind === 'match' && (
        <button className="hero compact" onClick={() => go('matches/' + nextMatch.id)}>
          <div className="hero-top">
            <span className="hero-label">המשחק הבא · {nextMatch.match.competition}</span>
            <span className="hero-when">
              {relDay(nextMatch.date)} · {nextMatch.time}
            </span>
          </div>
          <div className="hero-vs">
            <span>{nextMatch.match.home ? state.settings.teamName : nextMatch.match.opponent}</span>
            <em>נגד</em>
            <span>{nextMatch.match.home ? nextMatch.match.opponent : state.settings.teamName}</span>
          </div>
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
                  · {relDay(i.date)} {i.time}
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
