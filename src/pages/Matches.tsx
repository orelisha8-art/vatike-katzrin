import { useState } from 'react';
import { update, useApp } from '../store';
import { go } from '../router';
import { Empty, Fab, Field, Icon, Modal, PageHead, Segmented } from '../components/ui';
import { FormGuide, MatchCard } from '../components/cards';
import { NavButtons } from '../components/club';
import type { Match } from '../types';
import { countedScore, score, todayISO, uid } from '../utils';

export default function Matches({ manager }: { manager: boolean }) {
  const state = useApp();
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');
  const [adding, setAdding] = useState(false);

  const upcoming = state.matches.filter((m) => m.status !== 'finished').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const results = state.matches.filter((m) => m.status === 'finished').sort((a, b) => b.date.localeCompare(a.date));
  const list = tab === 'upcoming' ? upcoming : results;

  return (
    <div className="page">
      <PageHead title="משחקים" sub={<FormGuide matches={state.matches} />} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: `הבאים (${upcoming.length})` },
          { value: 'results', label: `תוצאות (${results.length})` },
        ]}
      />
      <div className="list">
        {list.map((m) => (
          <MatchCard key={m.id} match={m} onClick={() => go('matches/' + m.id)} />
        ))}
        {list.length === 0 && (
          <Empty
            title={tab === 'upcoming' ? 'אין משחקים קרובים' : 'עוד אין תוצאות'}
            action={manager && tab === 'upcoming' ? <button className="btn btn-primary" onClick={() => setAdding(true)}>הוספת משחק</button> : undefined}
          />
        )}
      </div>
      {manager && <Fab label="משחק" onClick={() => setAdding(true)} />}
      {adding && <MatchForm onClose={() => setAdding(false)} onSaved={(id) => go('matches/' + id)} />}
    </div>
  );
}

const COMPETITIONS = ['ליגה', 'גביע המחוז', 'גביע', 'ידידות', 'טורניר'];

export function MatchForm({ match, onClose, onSaved }: { match?: Match; onClose: () => void; onSaved?: (id: string) => void }) {
  const state = useApp();
  const [m, setM] = useState<Match>(
    () =>
      match ? structuredClone(match) : {
        id: uid(),
        date: todayISO(),
        time: '16:00',
        opponent: '',
        home: true,
        venue: '',
        competition: 'ליגה',
        status: 'scheduled',
        squad: [],
        formation: '4-4-2',
        slots: Array(11).fill(null),
        lineupPublished: false,
        events: [],
        ratings: {},
        duration: state.matches[state.matches.length - 1]?.duration ?? 90,
      },
  );
  const set = <K extends keyof Match>(k: K, v: Match[K]) => setM((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!m.opponent.trim()) return alert('מי היריבה?');
    update((s) => {
      const i = s.matches.findIndex((x) => x.id === m.id);
      if (i >= 0) s.matches[i] = m;
      else s.matches.push(m);
    });
    onClose();
    onSaved?.(m.id);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={match ? 'עריכת משחק' : 'משחק חדש'}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          {match ? (
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!window.confirm(`למחוק את המשחק מול ${match.opponent}? כל השערים, הציונים ואישורי ההגעה שלו יימחקו.`)) return;
                update((s) => {
                  s.matches = s.matches.filter((x) => x.id !== match.id);
                  delete s.rsvp[match.id];
                });
                onClose();
                go('matches');
              }}
            >
              <Icon name="trash" size={16} /> מחיקת משחק
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={onClose}>
              ביטול
            </button>
          )}
        </>
      }
    >
      <Field label="יריבה">
        <input className="input" value={m.opponent} onChange={(e) => set('opponent', e.target.value)} autoFocus placeholder="למשל: הפועל חצור" />
      </Field>
      <Field label="בית / חוץ">
        <Segmented
          value={m.home ? 'home' : 'away'}
          onChange={(v) => setM((x) => ({ ...x, home: v === 'home', venue: v === 'home' && !x.venue ? 'מגרש הבית' : x.venue }))}
          options={[
            { value: 'home', label: 'בית' },
            { value: 'away', label: 'חוץ' },
          ]}
        />
      </Field>
      <div className="form-grid">
        <Field label="תאריך">
          <input className="input" type="date" value={m.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="שעה">
          <input className="input" type="time" value={m.time} onChange={(e) => set('time', e.target.value)} />
        </Field>
        <Field label="מסגרת">
          <input className="input" list="competitions" value={m.competition} onChange={(e) => set('competition', e.target.value)} />
          <datalist id="competitions">
            {COMPETITIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="אורך משחק (דקות)">
          <select className="input" value={m.duration} onChange={(e) => set('duration', Number(e.target.value))}>
            {[90, 80, 70, 60, 50, 40].map((d) => (
              <option key={d} value={d}>
                {d} ({d / 2}×2)
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="סטטוס">
        <Segmented
          value={m.status === 'live' ? 'finished' : m.status}
          onChange={(v) => setM((x) => ({ ...x, status: v, live: undefined }))}
          options={[
            { value: 'scheduled', label: 'עתידי' },
            { value: 'finished', label: 'הסתיים' },
          ]}
        />
      </Field>
      {m.status !== 'scheduled' && (
        <Field label="תוצאה סופית" hint={`לפי השערים שנרשמו: ${countedScore(m).us}–${countedScore(m).them}. מה שתכתבו כאן הוא מה שיוצג.`}>
          <div className="score-edit">
            <label>
              <span>{state.settings.teamName}</span>
              <input className="input big-input" inputMode="numeric" value={score(m).us} onChange={(e) => setM((x) => ({ ...x, final: { ...score(x), us: Number(e.target.value.replace(/\D/g, '')) || 0 } }))} />
            </label>
            <b>:</b>
            <label>
              <span>{m.opponent || 'יריבה'}</span>
              <input className="input big-input" inputMode="numeric" value={score(m).them} onChange={(e) => setM((x) => ({ ...x, final: { ...score(x), them: Number(e.target.value.replace(/\D/g, '')) || 0 } }))} />
            </label>
          </div>
          {m.final && (
            <button type="button" className="link-btn" onClick={() => setM((x) => ({ ...x, final: undefined }))}>
              חזרה לחישוב אוטומטי לפי השערים
            </button>
          )}
        </Field>
      )}
      <Field label="מגרש / כתובת">
        <input className="input" value={m.venue ?? ''} onChange={(e) => set('venue', e.target.value)} placeholder="למשל: מגרש עירוני טייבה" />
      </Field>
      <Field label="קישור למיקום (לא חובה)" hint="העתיקו קישור 'שיתוף' מוויז או מגוגל מפות להגעה מדויקת. בלי קישור — הניווט יחפש לפי שם המגרש.">
        <input className="input" dir="ltr" inputMode="url" value={m.mapUrl ?? ''} onChange={(e) => set('mapUrl', e.target.value.trim() || undefined)} placeholder="https://waze.com/ul/…" />
      </Field>
      <NavButtons place={m.venue} link={m.mapUrl} />
      <Field label="הערות">
        <textarea className="input" rows={2} value={m.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="שעת התכנסות, הסעה, מדים…" />
      </Field>
    </Modal>
  );
}
