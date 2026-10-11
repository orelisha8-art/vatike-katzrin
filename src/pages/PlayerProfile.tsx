import { useState } from 'react';
import { deletePlayer, useApp } from '../store';
import { back, go } from '../router';
import { Avatar, confirmDelete, Empty, Icon, PageHead, RatingBadge, Stat } from '../components/ui';
import PlayerForm from '../components/PlayerForm';
import SelfEditForm from '../components/SelfEditForm';
import { age, attendanceRate, daysBetween, minutesPlayed, playerStats, POSITIONS, shortDate, STATUS, todayISO, whatsappTo } from '../utils';

export default function PlayerProfile({ id, manager, meId }: { id: string; manager: boolean; meId?: string }) {
  const state = useApp();
  const [editing, setEditing] = useState(false);
  const [selfEdit, setSelfEdit] = useState(false);
  const p = state.players.find((x) => x.id === id);
  if (!p) return <Empty title="השחקן לא נמצא" action={<button className="btn" onClick={() => go('squad')}>לסגל</button>} />;

  const s = playerStats(state, p.id);
  const showRatings = manager || state.settings.showRatingsToPlayers;
  const att = attendanceRate(state, p.id);
  const medDays = p.medicalExpiry ? daysBetween(todayISO(), p.medicalExpiry) : null;

  const log = state.matches
    .filter((m) => m.status !== 'scheduled' && (m.slots.includes(p.id) || m.events.some((e) => e.inId === p.id) || (!m.slots.some(Boolean) && m.squad.includes(p.id))))
    .sort((a, b) => b.date.localeCompare(a.date));

  const remove = () => {
    if (!window.confirm(`למחוק את ${p.name} לצמיתות? גם הציונים והסטטיסטיקה שלו יימחקו.
אם השחקן רק עזב — בחר "עריכה" ← "עזב את הקבוצה".`)) return;
    deletePlayer(p.id);
    go('squad');
  };

  return (
    <div className="page">
      <PageHead title="" onBack={back} actions={!manager && meId === p.id ? (
        <button className="btn btn-sm btn-primary" onClick={() => setSelfEdit(true)}>
          <Icon name="edit" size={16} /> עריכת הפרטים שלי
        </button>
      ) : manager && (
        <>
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> עריכה
          </button>
          <button className="icon-btn danger" onClick={remove} aria-label="מחיקה">
            <Icon name="trash" size={18} />
          </button>
        </>
      )} />

      <div className="profile-hero">
        {p.number != null && <span className="profile-watermark">{p.number}</span>}
        <div className="profile-photo">
          <Avatar photo={p.photo} name={p.name} size={112} />
          {p.number != null && <span className="profile-number">{p.number}</span>}
        </div>
        <div className="profile-info">
          <h1>
            {p.name} {p.captain && <span className="captain" title="קפטן">ק</span>}
          </h1>
          <p>
            {POSITIONS[p.position]}
            {age(p.birthDate) ? ` · גיל ${age(p.birthDate)}` : ''}
            {p.foot ? ` · רגל ${p.foot}` : ''}
          </p>
          <span className="status-pill" style={{ color: STATUS[p.status].color, borderColor: STATUS[p.status].color }}>
            {STATUS[p.status].label}
            {p.statusNote ? ` · ${p.statusNote}` : ''}
            {p.returnDate && p.status !== 'fit' ? ` · חוזר ${shortDate(p.returnDate)}` : ''}
          </span>
          {p.phone && (
            <div className="contact-row">
              <a className="btn btn-sm" href={'tel:' + p.phone}>
                <Icon name="phone" size={16} /> חיוג
              </a>
              <a className="btn btn-sm btn-wa" href={whatsappTo(p.phone)} target="_blank" rel="noreferrer">
                וואטסאפ
              </a>
            </div>
          )}
        </div>
        <div className="profile-strip">
          <span>
            <b>{s.apps}</b>
            <small>הופעות</small>
          </span>
          <span>
            <b>{s.goals}</b>
            <small>שערים</small>
          </span>
          <span>
            <b>{s.assists}</b>
            <small>בישולים</small>
          </span>
          {showRatings && (
            <span>
              <b>{s.avgRating ? s.avgRating.toFixed(1) : '–'}</b>
              <small>ציון</small>
            </span>
          )}
        </div>
      </div>

      <div className="stats-row wrap">
        <Stat label="הופעות" value={s.apps} />
        <Stat label="בהרכב" value={s.starts} />
        <Stat label="דקות" value={s.minutes} />
        <Stat label="שערים" value={s.goals} tone="brand" />
        <Stat label="בישולים" value={s.assists} tone="brand" />
        {showRatings && <Stat label="ציון ממוצע" value={s.avgRating ? s.avgRating.toFixed(1) : '–'} tone="ok" />}
        <Stat label="שחקן המשחק" value={s.motm} />
        <Stat label="צהובים / אדומים" value={`${s.yellow} / ${s.red}`} tone={s.yellow >= 4 ? 'warn' : undefined} />
        {att !== null && <Stat label="נוכחות באימונים" value={att + '%'} tone={att < 60 ? 'bad' : att < 80 ? 'warn' : 'ok'} />}
      </div>

      {showRatings && s.ratings.length > 1 && (
        <section className="card">
          <h2>מגמת ציונים</h2>
          <div className="rating-chart">
            {s.ratings.slice(-10).map((r) => {
              const m = state.matches.find((x) => x.id === r.matchId)!;
              return (
                <button key={r.matchId} className="rating-bar" onClick={() => go('matches/' + m.id)} title={m.opponent}>
                  <span className="rb-val">{r.rating}</span>
                  <span className="rb-fill" style={{ height: `${r.rating * 10}%` }} data-tone={r.rating >= 8 ? 'top' : r.rating >= 7 ? 'good' : r.rating >= 6 ? 'mid' : 'low'} />
                  <span className="rb-label">{m.opponent.split(' ').slice(-1)[0]}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="card">
        <h2>יומן משחקים</h2>
        {log.length === 0 ? (
          <p className="muted">עוד לא שיחק העונה</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>יריבה</th>
                <th>דק׳</th>
                <th>⚽</th>
                <th>🅰️</th>
                {showRatings && <th>ציון</th>}
              </tr>
            </thead>
            <tbody>
              {log.map((m) => (
                <tr key={m.id} onClick={() => go('matches/' + m.id)} className="clickable">
                  <td>{shortDate(m.date)}</td>
                  <td>
                    {m.opponent} {m.motm === p.id && '⭐'}
                  </td>
                  <td>{minutesPlayed(m, p.id)}</td>
                  <td>{m.events.filter((e) => e.type === 'goal' && e.playerId === p.id).length || ''}</td>
                  <td>{m.events.filter((e) => e.type === 'goal' && e.assistId === p.id).length || ''}</td>
                  {showRatings && (
                    <td>
                      <RatingBadge value={m.ratings[p.id]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {manager && (
        <section className="card">
          <h2>פרטים מנהלתיים</h2>
          <dl className="details">
            <dt>אישור רפואי</dt>
            <dd className={medDays === null ? 'muted' : medDays < 0 ? 'bad' : medDays <= 30 ? 'warn' : ''}>
              {p.medicalExpiry ? `בתוקף עד ${shortDate(p.medicalExpiry)}${medDays! < 0 ? ' — פג תוקף!' : medDays! <= 30 ? ` (עוד ${medDays} ימים)` : ''}` : 'לא הוזן'}
            </dd>
            <dt>כרטיס שחקן</dt>
            <dd className={p.registered === false ? 'warn' : ''}>{p.registered === false ? 'חסר' : 'קיים'}</dd>
            <dt>מידות</dt>
            <dd>
              חולצה {p.sizes?.shirt || '–'} · מכנס {p.sizes?.shorts || '–'} · נעל {p.sizes?.shoe || '–'}
            </dd>
            {p.notes && (
              <>
                <dt>הערות צוות</dt>
                <dd className="pre">{p.notes}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {editing && <PlayerForm player={p} onClose={() => setEditing(false)} />}
      {selfEdit && <SelfEditForm player={p} onClose={() => setSelfEdit(false)} />}
    </div>
  );
}
