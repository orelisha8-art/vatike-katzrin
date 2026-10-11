import { useEffect, useState, type ReactNode } from 'react';
import { getState, update, useApp } from '../store';
import { back, go } from '../router';
import { Avatar, confirmDelete, Empty, Field, Icon, Modal, RatingBadge, Segmented } from '../components/ui';
import { RsvpButtons, rsvpCounts, setRsvp } from '../components/cards';
import Pitch from '../components/Pitch';
import { Countdown, Scorers, TeamBadge } from '../components/club';
import { MatchForm } from './Matches';
import type { AppState, Match, MatchEvent, MatchEventType, Player, Rsvp } from '../types';
import {
  bench,
  byNumber,
  daysBetween,
  FORMATIONS,
  fullDate,
  liveMinute,
  minutesPlayed,
  onPitch,
  POSITIONS,
  resultOf,
  score,
  shareWhatsApp,
  STATUS,
  starters,
  todayISO,
  uid,
  hhmm,
} from '../utils';

type Tab = 'info' | 'squad' | 'lineup' | 'live' | 'ratings';

export default function MatchDetail({ id, manager, meId, initialTab }: { id: string; manager: boolean; meId?: string; initialTab?: string }) {
  const state = useApp();
  const m = state.matches.find((x) => x.id === id);
  const [tab, setTabState] = useState<Tab>(() => (initialTab as Tab) || (m?.status === 'live' && manager ? 'live' : m?.status === 'finished' ? 'ratings' : 'info'));
  // הלשונית נשמרת בכתובת — רענון משאיר אותך באותו מקום
  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', '#/matches/' + id + '/' + t);
  };
  const [editing, setEditing] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (m?.status !== 'live') return;
    const t = setInterval(() => tick((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, [m?.status]);

  if (!m) return <Empty title="המשחק לא נמצא" action={<button className="btn" onClick={() => go('matches')}>למשחקים</button>} />;

  const team = state.settings.teamName;
  const s = score(m);
  const canSeeRatings = manager || state.settings.showRatingsToPlayers;

  const tabs: { value: Tab; label: string }[] = manager
    ? [
        { value: 'info', label: 'פרטים' },
        { value: 'squad', label: `סגל${m.squad.length ? ' ' + m.squad.length : ''}` },
        { value: 'lineup', label: 'הרכב' },
        { value: 'live', label: m.status === 'finished' ? 'שערים ואירועים' : 'לייב' },
        { value: 'ratings', label: 'ציונים' },
      ]
    : [
        { value: 'info', label: 'פרטים' },
        ...(m.lineupPublished ? [{ value: 'lineup' as Tab, label: 'הרכב' }] : []),
        ...(m.status !== 'scheduled' ? [{ value: 'live' as Tab, label: 'מהלך המשחק' }] : []),
        ...(m.status === 'finished' && canSeeRatings ? [{ value: 'ratings' as Tab, label: 'ציונים' }] : []),
      ];
  const safeTab = tabs.some((t) => t.value === tab) ? tab : 'info';

  return (
    <div className="page">
      <div className="match-top">
        <button className="icon-btn" onClick={back} aria-label="חזרה">
          <Icon name="back" />
        </button>
        <span className="muted">
          {m.competition} · {fullDate(m.date)}
        </span>
        {manager && (
          <button className="btn btn-sm btn-edit" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> עריכת משחק
          </button>
        )}
      </div>

      <div className={'scoreboard' + (m.status === 'live' ? ' is-live' : '')}>
        <div className="sb-team">
          <TeamBadge name={m.home ? team : m.opponent} ours={m.home} logo={state.settings.logo} />
          <span>{m.home ? team : m.opponent}</span>
        </div>
        <div className="sb-center">
          {m.status === 'scheduled' ? (
            <div className="sb-time">{m.time || 'נגד'}</div>
          ) : (
            <div className="sb-score">{m.home ? `${s.us} - ${s.them}` : `${s.them} - ${s.us}`}</div>
          )}
          <div className="sb-status">
            {m.status === 'live' ? (
              <>
                <span className="live-dot" /> {m.live?.paused ? 'מחצית' : `דקה ${Math.min(liveMinute(m), m.duration + 10)}׳`}
              </>
            ) : m.status === 'finished' ? (
              <span className={'sb-result res-' + (resultOf(m) ?? 'D')}>{{ W: 'ניצחון', D: 'תיקו', L: 'הפסד' }[resultOf(m) ?? 'D']}</span>
            ) : (
              m.venue
            )}
          </div>
        </div>
        <div className="sb-team">
          <TeamBadge name={m.home ? m.opponent : team} ours={!m.home} logo={state.settings.logo} />
          <span>{m.home ? m.opponent : team}</span>
        </div>
        {m.status !== 'scheduled' && <Scorers m={m} state={state} />}
        {m.status === 'scheduled' && <div className="sb-countdown"><Countdown date={m.date} time={m.time} /></div>}
      </div>

      <div className="tabs-scroll">
        <Segmented value={safeTab} onChange={setTab} options={tabs} />
      </div>

      {safeTab === 'info' && <InfoTab m={m} manager={manager} meId={meId} state={state} />}
      {safeTab === 'squad' && manager && <SquadTab m={m} state={state} />}
      {safeTab === 'lineup' && <LineupTab m={m} manager={manager} state={state} />}
      {safeTab === 'live' && <LiveTab m={m} manager={manager} state={state} />}
      {safeTab === 'ratings' && <RatingsTab m={m} manager={manager} state={state} />}

      {editing && <MatchForm match={m} onClose={() => setEditing(false)} />}
    </div>
  );
}

const patch = (id: string, fn: (m: Match) => void) =>
  update((s) => {
    const m = s.matches.find((x) => x.id === id);
    if (m) fn(m);
  });

const playerById = (state: AppState, id?: string) => state.players.find((p) => p.id === id);
const nameOf = (state: AppState, id?: string) => playerById(state, id)?.name ?? '—';

// ================= פרטים =================
function InfoTab({ m, manager, meId, state }: { m: Match; manager: boolean; meId?: string; state: AppState }) {
  const c = rsvpCounts(state, m.id);
  const r = state.rsvp[m.id] || {};
  const players = state.players.filter((p) => p.active).sort(byNumber);
  const order: (Rsvp | 'none')[] = ['yes', 'maybe', 'none', 'no'];
  const labels = { yes: 'מגיעים', maybe: 'אולי', none: 'לא ענו', no: 'לא מגיעים' };
  const inSquad = meId ? m.squad.includes(meId) : false;
  const isPast = daysBetween(todayISO(), m.date) <= 0;

  const reminder = () =>
    shareWhatsApp(
      `⚽ ${state.settings.teamName} נגד ${m.opponent}\n📅 ${fullDate(m.date)} · ${hhmm(m.time)}\n📍 ${m.venue || ''}\n🏆 ${m.competition}${m.notes ? '\n\n' + m.notes : ''}\n\nנא לאשר הגעה באפליקציה 🙏`,
    );

  return (
    <div className="stack">
      {!manager && meId && m.status === 'scheduled' && (
        <section className="card">
          <h2>מגיע למשחק?</h2>
          <RsvpButtons itemId={m.id} playerId={meId} big />
          {m.squad.length > 0 && (
            <p className={'squad-note ' + (inSquad ? 'ok' : 'muted')}>{inSquad ? '✅ זומנת לסגל המשחק' : 'הסגל פורסם — לא נכללת הפעם'}</p>
          )}
        </section>
      )}

      <section className="card">
        <dl className="details">
          <dt>מתי</dt>
          <dd>
            {fullDate(m.date)} · {hhmm(m.time)}
          </dd>
          <dt>איפה</dt>
          <dd>
            {m.venue || '—'} ({m.home ? 'בית' : 'חוץ'})
          </dd>
          <dt>מסגרת</dt>
          <dd>{m.competition}</dd>
          {m.notes && (
            <>
              <dt>הערות</dt>
              <dd className="pre">{m.notes}</dd>
            </>
          )}
        </dl>
        {manager && (
          <div className="btn-row">
            <button className="btn btn-wa" onClick={reminder}>
              <Icon name="share" size={16} /> תזכורת בוואטסאפ
            </button>
            {m.status === 'scheduled' && isPast && (
              <button className="btn" onClick={() => patch(m.id, (x) => (x.status = 'finished'))}>
                <Icon name="check" size={16} /> סמן כהסתיים
              </button>
            )}
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!confirmDelete('המשחק')) return;
                update((s) => {
                  s.matches = s.matches.filter((x) => x.id !== m.id);
                  delete s.rsvp[m.id];
                });
                go('matches');
              }}
            >
              <Icon name="trash" size={16} /> מחיקה
            </button>
          </div>
        )}
      </section>

      {m.status === 'scheduled' && (
        <section className="card">
          <div className="card-head">
            <h2>אישורי הגעה</h2>
            <span className="muted small">
              ✓{c.yes} · ?{c.maybe} · ✗{c.no} · לא ענו {c.none}
            </span>
          </div>
          {manager && <p className="muted small">לחיצה על שחקן משנה את התשובה שלו (למי שענה בטלפון/וואטסאפ)</p>}
          {order.map((k) => {
            const list = players.filter((p) => (r[p.id] ?? 'none') === k);
            if (!list.length) return null;
            return (
              <div key={k} className="rsvp-group">
                <h3 className={'rsvp-h rsvp-' + k}>
                  {labels[k]} ({list.length})
                </h3>
                <div className="chips">
                  {list.map((p) => (
                    <button
                      key={p.id}
                      className="person-chip"
                      disabled={!manager}
                      onClick={() => {
                        const cycle: (Rsvp | null)[] = [null, 'yes', 'maybe', 'no'];
                        const cur = r[p.id] ?? null;
                        setRsvp(m.id, p.id, cycle[(cycle.indexOf(cur) + 1) % cycle.length]);
                      }}
                    >
                      <Avatar player={p} size={24} />
                      {p.name}
                      {p.status !== 'fit' && <span style={{ color: STATUS[p.status].color }}>●</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

// ================= סגל =================
function SquadTab({ m, state }: { m: Match; state: AppState }) {
  const r = state.rsvp[m.id] || {};
  const players = state.players.filter((p) => p.active).sort(byNumber);
  const toggle = (pid: string) =>
    patch(m.id, (x) => {
      if (x.squad.includes(pid)) {
        x.squad = x.squad.filter((i) => i !== pid);
        x.slots = x.slots.map((s) => (s === pid ? null : s));
      } else x.squad.push(pid);
    });
  const selectConfirmed = () =>
    patch(m.id, (x) => {
      const add = players.filter((p) => r[p.id] === 'yes' && p.status === 'fit').map((p) => p.id);
      x.squad = [...new Set([...x.squad, ...add])];
    });
  const share = () => {
    const list = m.squad
      .map((id) => playerById(state, id))
      .filter(Boolean)
      .sort((a, b) => byNumber(a!, b!))
      .map((p) => `${p!.number ?? ''} ${p!.name}`.trim())
      .join('\n');
    shareWhatsApp(`📋 הסגל למשחק נגד ${m.opponent}\n📅 ${fullDate(m.date)} · ${hhmm(m.time)}\n📍 ${m.venue || ''}\n\n${list}${m.notes ? '\n\n' + m.notes : ''}`);
  };

  return (
    <div className="stack">
      <div className="btn-row">
        <button className="btn" onClick={selectConfirmed}>
          <Icon name="check" size={16} /> כל מי שאישר הגעה
        </button>
        {m.squad.length > 0 && (
          <>
            <button className="btn btn-wa" onClick={share}>
              <Icon name="share" size={16} /> שליחת הסגל בוואטסאפ
            </button>
            <button className="btn btn-ghost" onClick={() => patch(m.id, (x) => ((x.squad = []), (x.slots = Array(11).fill(null))))}>
              ניקוי
            </button>
          </>
        )}
      </div>
      <p className="muted small">נבחרו {m.squad.length} שחקנים · לחיצה על שחקן מוסיפה/מסירה מהסגל</p>
      <div className="select-list">
        {players.map((p) => {
          const sel = m.squad.includes(p.id);
          const ans = r[p.id];
          const medExpired = p.medicalExpiry && p.medicalExpiry < m.date;
          return (
            <button key={p.id} className={'select-row' + (sel ? ' selected' : '')} onClick={() => toggle(p.id)}>
              <span className="checkbox">{sel && <Icon name="check" size={16} />}</span>
              <Avatar player={p} size={36} />
              <span className="select-name">
                <strong>
                  {p.number != null && <span className="num">{p.number}</span>} {p.name}
                </strong>
                <small>
                  {POSITIONS[p.position]}
                  {p.status !== 'fit' && <span style={{ color: STATUS[p.status].color }}> · {STATUS[p.status].label}</span>}
                  {medExpired && <span className="bad"> · אישור רפואי לא בתוקף</span>}
                  {p.registered === false && <span className="warn"> · אין כרטיס שחקן</span>}
                </small>
              </span>
              <span className={'rsvp-tag rsvp-' + (ans ?? 'none')}>{ans === 'yes' ? 'מגיע' : ans === 'no' ? 'לא מגיע' : ans === 'maybe' ? 'אולי' : '—'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= הרכב =================
function autoFill(m: Match, state: AppState): (string | null)[] {
  const pool = (m.squad.length ? m.squad : state.players.filter((p) => p.active && p.status === 'fit').map((p) => p.id))
    .map((id) => playerById(state, id)!)
    .filter(Boolean)
    .sort(byNumber);
  const used = new Set<string>();
  const slots = FORMATIONS[m.formation];
  const posFor = (label: string) =>
    label.includes('שוער') ? 'GK' : label.includes('מגן') || label.includes('בלם') ? 'DF' : label.includes('חלוץ') ? 'FW' : label.includes('כנף') ? 'FW' : 'MF';
  const result: (string | null)[] = slots.map((slot, i) => {
    const existing = m.slots[i];
    if (existing) {
      used.add(existing);
      return existing;
    }
    return null;
  });
  slots.forEach((slot, i) => {
    if (result[i]) return;
    const want = posFor(slot.label);
    let p = pool.find((x) => !used.has(x.id) && x.position === want);
    if (!p && want === 'FW') p = pool.find((x) => !used.has(x.id) && x.position === 'MF');
    if (!p && want !== 'GK') p = pool.find((x) => !used.has(x.id) && x.position !== 'GK');
    if (p) {
      used.add(p.id);
      result[i] = p.id;
    }
  });
  return result;
}

function LineupTab({ m, manager, state }: { m: Match; manager: boolean; state: AppState }) {
  const [picking, setPicking] = useState<number | null>(null);
  const slots = FORMATIONS[m.formation];
  const benchIds = bench(m);
  const pool = (m.squad.length ? m.squad : state.players.filter((p) => p.active && p.status !== 'injured').map((p) => p.id))
    .map((id) => playerById(state, id)!)
    .filter(Boolean)
    .sort(byNumber);

  const assign = (slot: number, pid: string | null) =>
    patch(m.id, (x) => {
      if (pid) {
        const prev = x.slots.indexOf(pid);
        if (prev >= 0) x.slots[prev] = x.slots[slot]; // החלפת מקומות
        if (!x.squad.includes(pid)) x.squad.push(pid);
      }
      x.slots[slot] = pid;
    });

  const share = () => {
    const lines = slots.map((s, i) => {
      const p = playerById(state, m.slots[i] ?? undefined);
      return p ? `${p.number ?? '•'} ${p.name} (${s.label})` : null;
    });
    const benchText = benchIds.map((id) => nameOf(state, id)).join(', ');
    shareWhatsApp(
      `⚽ ההרכב נגד ${m.opponent}\n📅 ${fullDate(m.date)} · ${hhmm(m.time)}\n📍 ${m.venue || ''}\n\nמערך ${m.formation}\n${lines.filter(Boolean).join('\n')}${benchText ? `\n\nספסל: ${benchText}` : ''}\n\nבהצלחה! 💪`,
    );
  };

  const filled = m.slots.filter(Boolean).length;

  return (
    <div className="stack">
      {manager && (
        <div className="lineup-controls">
          <div className="tabs-scroll">
            <Segmented
              value={m.formation}
              onChange={(f) =>
                patch(m.id, (x) => {
                  x.formation = f;
                  const n = FORMATIONS[f].length;
                  x.slots = [...x.slots.slice(0, n), ...Array(Math.max(0, n - x.slots.length)).fill(null)];
                })
              }
              options={Object.keys(FORMATIONS).map((f) => ({ value: f, label: f }))}
            />
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => patch(m.id, (x) => (x.slots = autoFill(x, getState())))}>
              ✨ מילוי אוטומטי
            </button>
            {filled > 0 && (
              <button className="btn btn-ghost" onClick={() => patch(m.id, (x) => (x.slots = Array(FORMATIONS[x.formation].length).fill(null)))}>
                ניקוי
              </button>
            )}
          </div>
        </div>
      )}

      <Pitch match={m} state={state} onSlot={manager ? setPicking : undefined} />

      <section className="card">
        <h2>ספסל ({benchIds.length})</h2>
        {benchIds.length ? (
          <div className="chips">
            {benchIds.map((id) => {
              const p = playerById(state, id);
              return p ? (
                <span key={id} className="person-chip">
                  <Avatar player={p} size={24} />
                  {p.number != null && <b>{p.number}</b>} {p.name}
                </span>
              ) : null;
            })}
          </div>
        ) : (
          <p className="muted small">{m.squad.length ? 'כל הסגל בהרכב' : 'בחר סגל בלשונית "סגל" או הצב שחקנים ישירות על המגרש'}</p>
        )}
      </section>

      {manager && (
        <div className="btn-row">
          <label className="switch">
            <input type="checkbox" checked={m.lineupPublished} onChange={(e) => patch(m.id, (x) => (x.lineupPublished = e.target.checked))} />
            <span className="switch-track" />
            פרסום ההרכב לשחקנים באפליקציה
          </label>
          {filled > 0 && (
            <button className="btn btn-wa" onClick={share}>
              <Icon name="share" size={16} /> שליחת ההרכב בוואטסאפ
            </button>
          )}
        </div>
      )}

      {picking !== null && (
        <Modal open onClose={() => setPicking(null)} title={`בחירת ${slots[picking].label}`}>
          <PlayerPickGrid
            players={pool}
            highlight={m.slots}
            onPick={(pid) => {
              assign(picking, pid);
              setPicking(null);
            }}
          />
          {m.slots[picking] && (
            <button
              className="btn btn-ghost danger full"
              onClick={() => {
                assign(picking, null);
                setPicking(null);
              }}
            >
              הוצאה מההרכב
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}

function PlayerPickGrid({ players, onPick, highlight = [], note }: { players: Player[]; onPick: (id: string) => void; highlight?: (string | null)[]; note?: (p: Player) => string | undefined }) {
  if (!players.length) return <p className="muted">אין שחקנים זמינים</p>;
  return (
    <div className="pick-grid">
      {players.map((p) => (
        <button key={p.id} className={'pick' + (highlight.includes(p.id) ? ' used' : '')} onClick={() => onPick(p.id)}>
          <Avatar player={p} size={48} />
          <strong>{p.number != null ? `${p.number} ` : ''}{p.name.split(' ')[0]}</strong>
          <small>{note?.(p) ?? (highlight.includes(p.id) ? 'בהרכב' : POSITIONS[p.position])}</small>
        </button>
      ))}
    </div>
  );
}

// ================= לייב / אירועים =================
const EVENT_META: Record<MatchEventType, { emoji: string; label: string }> = {
  goal: { emoji: '⚽', label: 'גול שלנו' },
  opp_goal: { emoji: '🥅', label: 'גול יריבה' },
  sub: { emoji: '🔁', label: 'חילוף' },
  yellow: { emoji: '🟨', label: 'צהוב' },
  red: { emoji: '🟥', label: 'אדום' },
  note: { emoji: '📝', label: 'אירוע אחר' },
};

function LiveTab({ m, manager, state }: { m: Match; manager: boolean; state: AppState }) {
  const [entry, setEntry] = useState<MatchEventType | null>(null);
  const [editing, setEditing] = useState<MatchEvent | null>(null);
  // דקה 0 = לא ידועה; בשוויון — לפי סדר ההזנה
  const events = m.events.map((e, i) => ({ e, i })).sort((a, b) => b.e.minute - a.e.minute || b.i - a.i).map((x) => x.e);
  const half = m.duration / 2;

  const kickoff = () =>
    patch(m.id, (x) => {
      x.status = 'live';
      x.live = { half: 1, startedAt: Date.now() };
      if (!x.slots.some(Boolean)) x.slots = autoFill(x, getState());
    });

  return (
    <div className="stack">
      {manager && m.status !== 'scheduled' && <GoalsPanel m={m} state={state} />}
      {manager && (
        <section className="card live-controls">
          {m.status === 'finished' && <h2>הוספת אירוע</h2>}
          {m.status === 'scheduled' && (
            <>
              <button className="btn btn-primary btn-lg full" onClick={kickoff}>
                <Icon name="whistle" /> שריקת פתיחה
              </button>
              <p className="muted small center">השעון יתחיל לרוץ והדקות יירשמו אוטומטית. אפשר גם להזין אירועים אחרי המשחק.</p>
            </>
          )}
          {m.status === 'live' && m.live && (
            <div className="btn-row center">
              {m.live.half === 1 && !m.live.paused && (
                <button className="btn" onClick={() => patch(m.id, (x) => (x.live!.paused = true))}>
                  <Icon name="pause" size={16} /> סיום מחצית ראשונה
                </button>
              )}
              {m.live.half === 1 && m.live.paused && (
                <button className="btn btn-primary" onClick={() => patch(m.id, (x) => (x.live = { half: 2, startedAt: Date.now() }))}>
                  <Icon name="play" size={16} /> פתיחת מחצית שנייה
                </button>
              )}
              {m.live.half === 2 && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!window.confirm('לסיים את המשחק?')) return;
                    patch(m.id, (x) => {
                      x.status = 'finished';
                      delete x.live;
                    });
                  }}
                >
                  <Icon name="whistle" size={16} /> שריקת סיום
                </button>
              )}
            </div>
          )}
          <div className="event-buttons">
            {(Object.keys(EVENT_META) as MatchEventType[]).map((t) => (
              <button key={t} className={'event-btn ev-' + t} onClick={() => setEntry(t)}>
                <span>{EVENT_META[t].emoji}</span>
                {EVENT_META[t].label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>מהלך המשחק</h2>
        {events.length === 0 ? (
          <p className="muted">עוד לא נרשמו אירועים</p>
        ) : (
          <ol className="timeline">
            {events.map((e, i) => {
              const showHalf = i > 0 && e.minute > 0 && events[i - 1].minute > half && e.minute <= half;
              return (
                <li key={e.id}>
                  {showHalf && <div className="timeline-half">מחצית</div>}
                  <div className={'tl-row ' + (e.type === 'opp_goal' ? 'them' : 'us')}>
                    <span className="tl-min">{e.minute ? e.minute + '׳' : '—'}</span>
                    <span className="tl-emoji">{EVENT_META[e.type].emoji}</span>
                    <span className="tl-text">
                      <EventText e={e} state={state} />
                    </span>
                    {manager && (
                      <button className="icon-btn sm" onClick={() => setEditing(e)} aria-label="עריכה">
                        <Icon name="edit" size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {entry && <EventEntry m={m} type={entry} state={state} onClose={() => setEntry(null)} />}
      {editing && <EventEdit m={m} ev={editing} state={state} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** עריכת אירוע קיים: החלפת כובש/מבשל/שחקן, דקה, פנדל, טקסט — או מחיקה */
function EventEdit({ m, ev, state, onClose }: { m: Match; ev: MatchEvent; state: AppState; onClose: () => void }) {
  const [x, setX] = useState<MatchEvent>({ ...ev });
  const players = state.players.filter((p) => p.active || [ev.playerId, ev.assistId, ev.inId, ev.outId].includes(p.id)).sort(byNumber);
  const set = (k: keyof MatchEvent, v: unknown) => setX((cur) => ({ ...cur, [k]: v === '' ? undefined : v }));
  const select = (label: string, k: 'playerId' | 'assistId' | 'inId' | 'outId', empty?: string) => (
    <Field label={label}>
      <select className="input" value={(x[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)}>
        {empty !== undefined && <option value="">{empty}</option>}
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number != null ? p.number + ' · ' : ''}
            {p.name}
          </option>
        ))}
      </select>
    </Field>
  );
  const save = () => {
    if (x.type === 'goal' && x.assistId && x.assistId === x.playerId) return alert('הכובש והמבשל לא יכולים להיות אותו שחקן');
    if (x.type === 'note' && !x.text?.trim()) return alert('צריך לכתוב מה קרה');
    patch(m.id, (mm) => {
      const i = mm.events.findIndex((y) => y.id === ev.id);
      if (i >= 0) mm.events[i] = x;
    });
    onClose();
  };
  const remove = () => {
    if (!window.confirm('למחוק את האירוע?')) return;
    patch(m.id, (mm) => (mm.events = mm.events.filter((y) => y.id !== ev.id)));
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`עריכת ${EVENT_META[x.type].label} ${EVENT_META[x.type].emoji}`}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          <button className="btn btn-ghost danger" onClick={remove}>
            <Icon name="trash" size={16} /> מחיקה
          </button>
        </>
      }
    >
      {(x.type === 'goal' || x.type === 'opp_goal') && (
        <Field label="סוג">
          <Segmented
            value={x.type}
            onChange={(v) => setX((cur) => ({ ...cur, type: v, ...(v === 'opp_goal' ? { playerId: undefined, assistId: undefined, penalty: undefined } : {}) }))}
            options={[
              { value: 'goal', label: '⚽ גול שלנו' },
              { value: 'opp_goal', label: '🥅 גול יריבה' },
            ]}
          />
        </Field>
      )}
      {x.type === 'goal' && (
        <>
          {select('מי כבש', 'playerId', 'גול עצמי של היריבה')}
          {select('מי בישל', 'assistId', 'ללא בישול')}
          <label className="check">
            <input type="checkbox" checked={!!x.penalty} onChange={(e) => set('penalty', e.target.checked || undefined)} /> פנדל
          </label>
        </>
      )}
      {x.type === 'sub' && (
        <>
          {select('יצא ▼', 'outId')}
          {select('נכנס ▲', 'inId')}
        </>
      )}
      {(x.type === 'yellow' || x.type === 'red') && select('שחקן', 'playerId')}
      {x.type === 'note' && (
        <>
          <Field label="מה קרה">
            <textarea className="input" rows={3} value={x.text ?? ''} onChange={(e) => set('text', e.target.value)} />
          </Field>
          {select('שחקן קשור', 'playerId', 'ללא')}
        </>
      )}
      <Field label="דקה" hint="0 או ריק = לא ידוע">
        <input className="input" inputMode="numeric" value={x.minute || ''} onChange={(e) => setX((cur) => ({ ...cur, minute: Number(e.target.value.replace(/\D/g, '')) || 0 }))} />
      </Field>
    </Modal>
  );
}

/** טבלת שערים פשוטה: כל גול בשורה — מי כבש, מי בישל, דקה. + שערי היריבה */
function GoalsPanel({ m, state }: { m: Match; state: AppState }) {
  const goals = m.events.filter((e) => e.type === 'goal');
  const oppCount = m.events.filter((e) => e.type === 'opp_goal').length;
  const referenced = new Set(goals.flatMap((g) => [g.playerId, g.assistId]).filter(Boolean) as string[]);
  const players = state.players.filter((p) => p.active || referenced.has(p.id)).sort(byNumber);
  const counted = { us: goals.length, them: oppCount };
  const shown = score(m);

  const setGoal = (id: string, changes: Partial<MatchEvent>) =>
    patch(m.id, (x) => {
      const g = x.events.find((e) => e.id === id);
      if (!g) return;
      Object.assign(g, changes);
      if (g.playerId) delete g.og;
      if (g.assistId && g.assistId === g.playerId) delete g.assistId;
    });
  const addGoal = () => patch(m.id, (x) => void x.events.push({ id: uid(), minute: 0, type: 'goal' }));
  const removeGoal = (id: string) => window.confirm('למחוק את הגול?') && patch(m.id, (x) => (x.events = x.events.filter((e) => e.id !== id)));
  const setOpp = (n: number) =>
    patch(m.id, (x) => {
      const opp = x.events.filter((e) => e.type === 'opp_goal');
      if (n > opp.length) for (let i = opp.length; i < n; i++) x.events.push({ id: uid(), minute: 0, type: 'opp_goal' });
      else {
        const drop = new Set(opp.slice(n).map((e) => e.id));
        x.events = x.events.filter((e) => !drop.has(e.id));
      }
    });
  const options = (
    <>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.number != null ? p.number + ' · ' : ''}
          {p.name}
        </option>
      ))}
    </>
  );

  return (
    <section className="card goals-panel">
      <div className="card-head">
        <h2>שערים ובישולים</h2>
        <span className="gp-score">
          {shown.us}–{shown.them}
        </span>
      </div>
      {m.final && (m.final.us !== counted.us || m.final.them !== counted.them) && (
        <p className="gp-warn">
          התוצאה שמוצגת ({m.final.us}–{m.final.them}) הוזנה ידנית ושונה מהשערים שנרשמו ({counted.us}–{counted.them}).{' '}
          <button className="link-btn" onClick={() => patch(m.id, (x) => void delete x.final)}>
            לחשב לפי השערים
          </button>
        </p>
      )}
      {goals.length === 0 && <p className="muted small">עוד לא נרשמו שערים שלנו</p>}
      <div className="gp-list">
        {goals.map((g, i) => (
          <div key={g.id} className={'gp-row' + (!g.playerId && !g.og ? ' missing' : '')}>
            <span className="gp-idx">{i + 1}</span>
            <label className="gp-field">
              <small>⚽ כבש</small>
              <select className="input" value={g.playerId ?? (g.og ? 'og' : '')} onChange={(e) => setGoal(g.id, e.target.value === 'og' ? { playerId: undefined, og: true, assistId: undefined } : { playerId: e.target.value || undefined, og: undefined })}>
                <option value="">— בחר —</option>
                <option value="og">גול עצמי של היריבה</option>
                {options}
              </select>
            </label>
            <label className="gp-field">
              <small>🅰️ בישל</small>
              <select className="input" value={g.assistId ?? ''} onChange={(e) => setGoal(g.id, { assistId: e.target.value || undefined })}>
                <option value="">ללא בישול</option>
                {options}
              </select>
            </label>
            <label className="gp-field gp-min">
              <small>דקה</small>
              <input className="input" inputMode="numeric" placeholder="—" value={g.minute || ''} onChange={(e) => setGoal(g.id, { minute: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </label>
            <label className="check gp-pen" title="פנדל">
              <input type="checkbox" checked={!!g.penalty} onChange={(e) => setGoal(g.id, { penalty: e.target.checked || undefined })} /> פנדל
            </label>
            <button className="icon-btn sm danger" onClick={() => removeGoal(g.id)} aria-label="מחיקת גול">
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-primary full" onClick={addGoal}>
        <Icon name="plus" size={18} /> הוספת גול שלנו
      </button>
      <div className="gp-opp">
        <span>🥅 שערים של {m.opponent || 'היריבה'}</span>
        <div className="stepper">
          <button type="button" className="icon-btn" onClick={() => setOpp(Math.max(0, oppCount - 1))} aria-label="פחות">
            −
          </button>
          <b>{oppCount}</b>
          <button type="button" className="icon-btn" onClick={() => setOpp(oppCount + 1)} aria-label="יותר">
            +
          </button>
        </div>
      </div>
    </section>
  );
}

function EventText({ e, state }: { e: MatchEvent; state: AppState }) {
  switch (e.type) {
    case 'goal':
      return (
        <>
          <strong>{e.playerId ? nameOf(state, e.playerId) : e.og ? 'גול עצמי של היריבה' : 'כובש לא נבחר'}</strong>
          {e.penalty && ' (פנדל)'}
          {e.assistId && <small> · בישול: {nameOf(state, e.assistId)}</small>}
        </>
      );
    case 'opp_goal':
      return <strong>גול ליריבה</strong>;
    case 'note':
      return (
        <>
          {e.playerId && <strong>{nameOf(state, e.playerId)} · </strong>}
          <span className="pre">{e.text}</span>
        </>
      );
    case 'sub':
      return (
        <>
          <span className="in">▲ {nameOf(state, e.inId)}</span> <span className="out">▼ {nameOf(state, e.outId)}</span>
        </>
      );
    default:
      return <strong>{nameOf(state, e.playerId)}</strong>;
  }
}

function EventEntry({ m, type, state, onClose }: { m: Match; type: MatchEventType; state: AppState; onClose: () => void }) {
  const [minute, setMinute] = useState(() => (m.status === 'live' ? Math.min(liveMinute(m), m.duration + 10) : Math.round(m.duration / 2)));
  const [step, setStep] = useState(0);
  const [ev, setEv] = useState<Partial<MatchEvent>>({});
  const [unknown, setUnknown] = useState(false);
  const [text, setText] = useState('');

  const asPlayers = (ids: string[]) => ids.map((id) => playerById(state, id)!).filter(Boolean).sort(byNumber);
  const pitchIds = m.slots.some(Boolean) ? onPitch(m) : m.squad;
  const everOn = new Set([...starters(m), ...m.events.filter((e) => e.type === 'sub' && e.inId).map((e) => e.inId!)]);
  const benchPool = (m.squad.length ? m.squad : state.players.filter((p) => p.active).map((p) => p.id)).filter((id) => !everOn.has(id));
  const allPool = m.squad.length ? m.squad : state.players.filter((p) => p.active).map((p) => p.id);

  const save = (final: Partial<MatchEvent>) => {
    patch(m.id, (x) => x.events.push({ id: uid(), minute: unknown ? 0 : minute, type, ...final }));
    onClose();
  };

  let title = EVENT_META[type].label;
  let body: ReactNode = null;

  if (type === 'note') {
    title = '📝 אירוע במשחק';
    body = (
      <>
        <textarea className="input" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="למשל: החמצת פנדל, פציעה, הצלה גדולה, שינוי מערך…" />
        <p className="muted small">שחקן קשור (לא חובה):</p>
        <PlayerPickGrid players={asPlayers(allPool)} highlight={ev.playerId ? [ev.playerId] : []} onPick={(id) => setEv({ playerId: ev.playerId === id ? undefined : id })} note={(p) => (p.id === ev.playerId ? 'נבחר' : '')} />
        <button className="btn btn-primary full btn-lg" disabled={!text.trim()} onClick={() => save({ ...ev, text: text.trim() })}>
          שמירה
        </button>
      </>
    );
  } else if (type === 'opp_goal') {
    body = (
      <button className="btn btn-primary full btn-lg" onClick={() => save({})}>
        רישום גול ליריבה
      </button>
    );
  } else if (type === 'goal' && step === 0) {
    title = 'מי כבש? ⚽';
    body = (
      <>
        <PlayerPickGrid players={asPlayers(pitchIds)} onPick={(id) => (setEv({ ...ev, playerId: id }), setStep(1))} note={() => ''} />
        <div className="btn-row">
          <label className="check">
            <input type="checkbox" checked={!!ev.penalty} onChange={(e) => setEv({ ...ev, penalty: e.target.checked })} /> פנדל
          </label>
          <button className="btn btn-ghost" onClick={() => save({ og: true })}>
            גול עצמי של היריבה
          </button>
        </div>
      </>
    );
  } else if (type === 'goal' && step === 1) {
    title = 'מי בישל? 🅰️';
    body = (
      <>
        <PlayerPickGrid players={asPlayers(pitchIds.filter((id) => id !== ev.playerId))} onPick={(id) => save({ ...ev, assistId: id })} note={() => ''} />
        <button className="btn full" onClick={() => save(ev)}>
          ללא בישול
        </button>
      </>
    );
  } else if (type === 'sub' && step === 0) {
    title = 'מי יוצא? ▼';
    body = <PlayerPickGrid players={asPlayers(pitchIds)} onPick={(id) => (setEv({ outId: id }), setStep(1))} note={() => ''} />;
  } else if (type === 'sub' && step === 1) {
    title = `מי נכנס במקום ${nameOf(state, ev.outId).split(' ')[0]}? ▲`;
    body = <PlayerPickGrid players={asPlayers(benchPool)} onPick={(id) => save({ ...ev, inId: id })} note={() => ''} />;
  } else {
    title = `${EVENT_META[type].emoji} למי?`;
    body = <PlayerPickGrid players={asPlayers(type === 'red' ? pitchIds : allPool)} onPick={(id) => save({ playerId: id })} note={() => ''} />;
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="minute-row">
        <span>דקה</span>
        <button className="icon-btn" onClick={() => setMinute(Math.max(1, minute - 1))} aria-label="פחות">
          −
        </button>
        <input className="input minute-input" inputMode="numeric" value={minute} onChange={(e) => setMinute(Number(e.target.value.replace(/\D/g, '')) || 1)} />
        <button className="icon-btn" onClick={() => setMinute(minute + 1)} aria-label="יותר">
          +
        </button>
        <label className="check small">
          <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} /> לא זוכר דקה
        </label>
      </div>
      {body}
    </Modal>
  );
}

// ================= ציונים =================
const RATING_CHOICES = [4, 5, 6, 7, 8, 9, 10];

function RatingsTab({ m, manager, state }: { m: Match; manager: boolean; state: AppState }) {
  const [half, setHalf] = useState(false);
  const [adding, setAdding] = useState(false);
  const involved = m.events.flatMap((e) => [e.playerId, e.assistId, e.inId, e.outId]).filter(Boolean) as string[];
  const playedIds = [...new Set([...starters(m), ...m.events.filter((e) => e.type === 'sub' && e.inId).map((e) => e.inId!), ...(m.slots.some(Boolean) ? [] : m.squad), ...involved, ...Object.keys(m.ratings)])];
  const players = playedIds.map((id) => playerById(state, id)!).filter(Boolean);
  const startersSet = new Set(starters(m));
  players.sort((a, b) => Number(startersSet.has(b.id)) - Number(startersSet.has(a.id)) || byNumber(a, b));

  const addPool = state.players.filter((p) => p.active && !playedIds.includes(p.id)).sort(byNumber);
  const addPlayer = (pid: string) => patch(m.id, (x) => void (!x.squad.includes(pid) && x.squad.push(pid)));
  const adder = manager && (
    <>
      <button className="btn full" onClick={() => setAdding(true)}>
        <Icon name="plus" size={16} /> הוספת שחקן ששיחק
      </button>
      {adding && (
        <Modal open onClose={() => setAdding(false)} title="מי עוד שיחק?">
          <PlayerPickGrid players={addPool} onPick={(id) => addPlayer(id)} note={() => ''} />
          <button className="btn btn-primary full" onClick={() => setAdding(false)}>סיום</button>
        </Modal>
      )}
    </>
  );

  if (!players.length)
    return manager ? <div className="stack"><Empty title="עוד לא נבחרו שחקנים לדירוג" text="הוסיפו את מי ששיחק במשחק ודרגו אותו" />{adder}</div> : <Empty title="הציונים עוד לא פורסמו" />;

  const vals = Object.values(m.ratings);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const rate = (pid: string, v: number) =>
    patch(m.id, (x) => {
      if (x.ratings[pid] === v) delete x.ratings[pid];
      else x.ratings[pid] = v;
    });

  return (
    <div className="stack">
      {manager && (
        <div className="btn-row">
          <span className="muted small">ציון 1–10 · ⭐ = שחקן המשחק</span>
          <label className="check">
            <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} /> חצאי נקודות
          </label>
          {avg !== null && <span className="muted small">ממוצע קבוצתי {avg.toFixed(1)}</span>}
        </div>
      )}
      <div className="rating-list">
        {players.map((p) => {
          const mins = minutesPlayed(m, p.id);
          const goals = m.events.filter((e) => e.type === 'goal' && e.playerId === p.id).length;
          const assists = m.events.filter((e) => e.type === 'goal' && e.assistId === p.id).length;
          const cards = m.events.filter((e) => (e.type === 'yellow' || e.type === 'red') && e.playerId === p.id);
          const cur = m.ratings[p.id];
          return (
            <div key={p.id} className={'rating-row' + (m.motm === p.id ? ' motm' : '')}>
              <div className="rating-player">
                <Avatar player={p} size={40} />
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {m.slots.some(Boolean) ? (startersSet.has(p.id) ? mins + '׳ ' : mins + '׳ (מחליף) ') : ''}{'⚽'.repeat(goals)}
                    {'🅰️'.repeat(assists)}
                    {cards.map((c) => (c.type === 'red' ? '🟥' : '🟨')).join('')}
                  </small>
                </div>
                {manager ? (
                  <button className={'star-btn' + (m.motm === p.id ? ' on' : '')} onClick={() => patch(m.id, (x) => (x.motm = x.motm === p.id ? undefined : p.id))} aria-label="שחקן המשחק">
                    <Icon name="star" size={20} />
                  </button>
                ) : (
                  <>
                    {m.motm === p.id && <span className="motm-tag">⭐ שחקן המשחק</span>}
                    <RatingBadge value={cur} />
                  </>
                )}
              </div>
              {manager && (
                <div className="rating-chips">
                  {RATING_CHOICES.flatMap((v) => (half && v < 10 ? [v, v + 0.5] : [v])).map((v) => (
                    <button key={v} className={'rchip' + (cur === v ? ' on' : '')} data-tone={v >= 8 ? 'top' : v >= 7 ? 'good' : v >= 6 ? 'mid' : 'low'} onClick={() => rate(p.id, v)}>
                      {v % 1 ? Math.floor(v) + '½' : v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {adder}
      {manager && (
        <section className="card">
          <h2>סיכום המאמן</h2>
          <textarea
            className="input"
            rows={4}
            defaultValue={m.summary ?? ''}
            placeholder="מה עבד, מה לשפר, נקודות לאימון הבא…"
            onBlur={(e) => e.target.value !== (m.summary ?? '') && patch(m.id, (x) => (x.summary = e.target.value))}
          />
        </section>
      )}
    </div>
  );
}
