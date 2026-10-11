import { useState } from 'react';
import { update, useApp } from '../store';
import { go } from '../router';
import { Avatar, confirmDelete, Empty, Fab, Field, Icon, Modal, PageHead, Segmented } from '../components/ui';
import { EVENT_TYPES, RsvpButtons, RsvpMini, scheduleItems, setRsvp, type ScheduleItem } from '../components/cards';
import type { EventType, Rsvp, TeamEvent } from '../types';
import { addDays, byNumber, fullDate, relDay, shareWhatsApp, todayISO, uid } from '../utils';

export default function Schedule({ manager, meId }: { manager: boolean; meId?: string }) {
  const state = useApp();
  const [tab, setTab] = useState<'next' | 'past'>('next');
  const [editing, setEditing] = useState<TeamEvent | 'new' | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const t = todayISO();

  const all = scheduleItems(state);
  const items = tab === 'next' ? all.filter((i) => i.date >= t) : all.filter((i) => i.date < t).reverse();
  const groups: { date: string; items: ScheduleItem[] }[] = [];
  items.forEach((i) => {
    const g = groups[groups.length - 1];
    if (g && g.date === i.date) g.items.push(i);
    else groups.push({ date: i.date, items: [i] });
  });

  const shareWeek = () => {
    const week = all.filter((i) => i.date >= t && i.date <= addDays(t, 7));
    const lines = week.map((i) =>
      i.kind === 'match'
        ? `⚽ ${fullDate(i.date)} ${i.time} — משחק נגד ${i.match.opponent} (${i.match.home ? 'בית' : 'חוץ'})`
        : `${EVENT_TYPES[i.event.type].emoji} ${fullDate(i.date)} ${i.time} — ${i.event.title}${i.event.location ? ' @ ' + i.event.location : ''}`,
    );
    shareWhatsApp(`📅 הלו״ז של ${state.settings.teamName} לשבוע הקרוב\n\n${lines.join('\n')}\n\nנא לאשר הגעה באפליקציה 🙏`);
  };

  const openEvent = open ? state.events.find((e) => e.id === open) : undefined;

  return (
    <div className="page">
      <PageHead
        title="לוח זמנים"
        sub="אימונים, משחקים ופגישות"
        actions={
          manager && (
            <button className="btn btn-wa btn-sm" onClick={shareWeek}>
              <Icon name="share" size={16} /> השבוע בוואטסאפ
            </button>
          )
        }
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'next', label: 'הקרוב' },
          { value: 'past', label: 'שהיה' },
        ]}
      />

      {groups.length === 0 && <Empty icon="calendar" title={tab === 'next' ? 'אין אירועים מתוכננים' : 'אין היסטוריה עדיין'} action={manager && tab === 'next' ? <button className="btn btn-primary" onClick={() => setEditing('new')}>הוספת אימון</button> : undefined} />}

      {groups.map((g) => (
        <section key={g.date} className="day-group">
          <h2 className="group-title">{relDay(g.date) === fullDate(g.date) ? fullDate(g.date) : `${relDay(g.date)} · ${fullDate(g.date)}`}</h2>
          {g.items.map((i) => {
            const isMatch = i.kind === 'match';
            const type = isMatch ? 'match' : i.event.type;
            const title = isMatch ? `משחק נגד ${i.match.opponent}` : i.event.title;
            const place = isMatch ? i.match.venue : i.event.location;
            const attended = !isMatch && i.event.attendance ? Object.values(i.event.attendance).filter(Boolean).length : null;
            return (
              <div key={i.id} className={'card sched-card type-' + type}>
                <button className="sched-main" onClick={() => (isMatch ? go('matches/' + i.id) : manager ? setOpen(i.id) : undefined)}>
                  <span className="sched-time">{i.time}</span>
                  <span className="sched-emoji">{EVENT_TYPES[type].emoji}</span>
                  <span className="sched-text">
                    <strong>{title}</strong>
                    <small>
                      {EVENT_TYPES[type].label}
                      {place ? ' · ' + place : ''}
                      {isMatch ? ` · ${i.match.home ? 'בית' : 'חוץ'}` : ''}
                    </small>
                    {!isMatch && i.event.notes && <small className="sched-notes">{i.event.notes}</small>}
                  </span>
                  {attended !== null && tab === 'past' ? <span className="att-chip">נכחו {attended}</span> : <RsvpMini itemId={i.id} state={state} />}
                </button>
                {!manager && meId && i.date >= t && <RsvpButtons itemId={i.id} playerId={meId} />}
              </div>
            );
          })}
        </section>
      ))}

      {manager && <Fab label="אירוע" onClick={() => setEditing('new')} />}
      {editing && <EventForm event={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {openEvent && (
        <EventDetail
          ev={openEvent}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setEditing(openEvent);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function EventDetail({ ev, onClose, onEdit }: { ev: TeamEvent; onClose: () => void; onEdit: () => void }) {
  const state = useApp();
  const [mode, setMode] = useState<'rsvp' | 'attendance'>(ev.date <= todayISO() ? 'attendance' : 'rsvp');
  const players = state.players.filter((p) => p.active).sort(byNumber);
  const r = state.rsvp[ev.id] || {};
  const att = ev.attendance || {};

  const toggleAtt = (pid: string) =>
    update((s) => {
      const e = s.events.find((x) => x.id === ev.id)!;
      e.attendance = e.attendance || {};
      e.attendance[pid] = !e.attendance[pid];
    });
  const markAllConfirmed = () =>
    update((s) => {
      const e = s.events.find((x) => x.id === ev.id)!;
      e.attendance = Object.fromEntries(players.map((p) => [p.id, r[p.id] === 'yes']));
    });

  const cycle: (Rsvp | null)[] = [null, 'yes', 'maybe', 'no'];
  const rLabel = { yes: 'מגיע', no: 'לא מגיע', maybe: 'אולי' };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${EVENT_TYPES[ev.type].emoji} ${ev.title}`}
      footer={
        <>
          <button className="btn" onClick={onEdit}>
            <Icon name="edit" size={16} /> עריכה
          </button>
          <button
            className="btn btn-ghost danger"
            onClick={() => {
              if (!confirmDelete('האירוע')) return;
              update((s) => {
                s.events = s.events.filter((x) => x.id !== ev.id);
                delete s.rsvp[ev.id];
              });
              onClose();
            }}
          >
            <Icon name="trash" size={16} /> מחיקה
          </button>
        </>
      }
    >
      <p className="muted">
        {fullDate(ev.date)} · {ev.time}
        {ev.location ? ' · ' + ev.location : ''}
      </p>
      {ev.notes && <p className="pre">{ev.notes}</p>}
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'rsvp', label: 'אישורי הגעה' },
          { value: 'attendance', label: 'נוכחות בפועל' },
        ]}
      />
      {mode === 'attendance' && (
        <>
          <div className="btn-row">
            <span className="muted small">נכחו {Object.values(att).filter(Boolean).length} מתוך {players.length}</span>
            <button className="btn btn-sm" onClick={markAllConfirmed}>
              סמן את כל המאשרים
            </button>
          </div>
          <div className="select-list">
            {players.map((p) => (
              <button key={p.id} className={'select-row' + (att[p.id] ? ' selected' : '')} onClick={() => toggleAtt(p.id)}>
                <span className="checkbox">{att[p.id] && <Icon name="check" size={16} />}</span>
                <Avatar player={p} size={32} />
                <span className="select-name">
                  <strong>{p.name}</strong>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {mode === 'rsvp' && (
        <div className="select-list">
          <p className="muted small">לחיצה משנה את התשובה (למי שענה בטלפון)</p>
          {players.map((p) => (
            <button key={p.id} className="select-row" onClick={() => setRsvp(ev.id, p.id, cycle[(cycle.indexOf(r[p.id] ?? null) + 1) % cycle.length])}>
              <Avatar player={p} size={32} />
              <span className="select-name">
                <strong>{p.name}</strong>
              </span>
              <span className={'rsvp-tag rsvp-' + (r[p.id] ?? 'none')}>{r[p.id] ? rLabel[r[p.id]] : '—'}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

const TITLES: Record<EventType, string> = { training: 'אימון קבוצתי', meeting: 'פגישת קבוצה', other: '' };

function EventForm({ event, onClose }: { event?: TeamEvent; onClose: () => void }) {
  const state = useApp();
  const lastTraining = [...state.events].reverse().find((e) => e.type === 'training');
  const [e, setE] = useState<TeamEvent>(() =>
    event
      ? structuredClone(event)
      : { id: uid(), type: 'training', title: 'אימון קבוצתי', date: addDays(todayISO(), 1), time: lastTraining?.time ?? '19:30', location: lastTraining?.location ?? '' },
  );
  const [repeat, setRepeat] = useState(1);
  const set = <K extends keyof TeamEvent>(k: K, v: TeamEvent[K]) => setE((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!e.title.trim()) return alert('צריך כותרת');
    update((s) => {
      const i = s.events.findIndex((x) => x.id === e.id);
      if (i >= 0) s.events[i] = e;
      else for (let w = 0; w < repeat; w++) s.events.push({ ...e, id: w === 0 ? e.id : uid(), date: addDays(e.date, w * 7) });
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={event ? 'עריכת אירוע' : 'אירוע חדש'}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </>
      }
    >
      <Field label="סוג">
        <Segmented
          value={e.type}
          onChange={(v) => setE((x) => ({ ...x, type: v, title: Object.values(TITLES).includes(x.title) ? TITLES[v] : x.title }))}
          options={[
            { value: 'training', label: '🏃 אימון' },
            { value: 'meeting', label: '🗣️ פגישה' },
            { value: 'other', label: '📌 אחר' },
          ]}
        />
      </Field>
      <Field label="כותרת">
        <input className="input" value={e.title} onChange={(ev) => set('title', ev.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="תאריך">
          <input className="input" type="date" value={e.date} onChange={(ev) => set('date', ev.target.value)} />
        </Field>
        <Field label="שעה">
          <input className="input" type="time" value={e.time} onChange={(ev) => set('time', ev.target.value)} />
        </Field>
      </div>
      <Field label="מיקום">
        <input className="input" value={e.location ?? ''} onChange={(ev) => set('location', ev.target.value)} />
      </Field>
      <Field label="הערות / תוכנית האימון">
        <textarea className="input" rows={3} value={e.notes ?? ''} onChange={(ev) => set('notes', ev.target.value)} placeholder="למשל: להביא נעלי קט־רגל, דגש על כדורים נייחים" />
      </Field>
      {!event && (
        <Field label="חזרה שבועית">
          <select className="input" value={repeat} onChange={(ev) => setRepeat(Number(ev.target.value))}>
            <option value={1}>פעם אחת</option>
            {[2, 4, 8, 12].map((n) => (
              <option key={n} value={n}>
                כל שבוע, {n} שבועות
              </option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}
