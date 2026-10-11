import { useEffect, useRef, useState } from 'react';
import { changeCodes, getCodes, replaceState, setSession, update, useApp, useMode } from '../store';
import { back } from '../router';
import { Field, Icon, PageHead, PhotoInput } from '../components/ui';
import { createSeed } from '../seed';
import type { AppState } from '../types';
import { todayISO } from '../utils';

const COLORS = ['#0f7a3e', '#c8102e', '#0b4ea2', '#f2b705', '#111827', '#6d28d9', '#0e7490', '#ea580c'];

export default function SettingsPage() {
  const state = useApp();
  const mode = useMode();
  const s = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof AppState['settings']>(k: K, v: AppState['settings'][K]) => update((st) => void (st.settings[k] = v));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `גיבוי-${s.teamName}-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!data.players || !data.settings) throw new Error();
      if (window.confirm('לטעון את הגיבוי? הנתונים הנוכחיים יוחלפו.')) replaceState(data);
    } catch {
      alert('הקובץ לא תקין');
    }
  };

  return (
    <div className="page">
      <PageHead title="הגדרות" onBack={back} />

      <section className="card">
        <h2>הקבוצה</h2>
        <PhotoInput value={s.logo} onChange={(v) => set('logo', v)} name={s.teamName} round={false} />
        <Field label="שם הקבוצה">
          <input className="input" defaultValue={s.teamName} onBlur={(e) => e.target.value.trim() && set('teamName', e.target.value.trim())} />
        </Field>
        <Field label="ליגה / מחוז">
          <input className="input" defaultValue={s.league} onBlur={(e) => set('league', e.target.value)} />
        </Field>
        <Field label="צבע הקבוצה">
          <div className="color-row">
            {COLORS.map((c) => (
              <button key={c} className={'color-dot' + (s.color === c ? ' on' : '')} style={{ background: c }} onClick={() => set('color', c)} aria-label={c} />
            ))}
            <input type="color" value={s.color} onChange={(e) => set('color', e.target.value)} aria-label="צבע מותאם" />
          </div>
        </Field>
      </section>

      <section className="card">
        <h2>הרשאות</h2>
        <CodesSection />
        <label className="switch">
          <input type="checkbox" checked={s.showRatingsToPlayers} onChange={(e) => set('showRatingsToPlayers', e.target.checked)} />
          <span className="switch-track" />
          שחקנים רואים ציונים
        </label>
      </section>

      <section className="card">
        <h2>גיבוי ונתונים</h2>
        <p className="muted small">הנתונים נשמרים כרגע במכשיר הזה. מומלץ לגבות מדי פעם.</p>
        <div className="btn-row">
          <button className="btn" onClick={exportData}>
            <Icon name="download" size={16} /> הורדת גיבוי
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> טעינת גיבוי
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </div>
        <div className="btn-row">
          <button
            className="btn btn-ghost danger"
            onClick={() => {
              if (!window.confirm('למחוק את כל נתוני ההדגמה ולהתחיל קבוצה נקייה? (הגדרות הקבוצה יישמרו)')) return;
              const fresh = createSeed();
              replaceState({
                ...fresh,
                settings: s,
                players: [],
                matches: [],
                events: [],
                rsvp: {},
                equipment: [],
                maintenance: [],
                staff: [],
                transactions: [],
                tdTasks: [],
                prospects: [],
                checklist: fresh.checklist,
                tdNotes: '',
              });
            }}
          >
            <Icon name="trash" size={16} /> התחלה נקייה (מחיקת נתוני הדגמה)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!window.confirm('לטעון מחדש את נתוני ההדגמה? הנתונים הנוכחיים יימחקו.')) return;
              replaceState(createSeed());
              if (mode === 'local') setSession({ role: 'manager' });
            }}
          >
            טעינת נתוני הדגמה
          </button>
        </div>
      </section>
    </div>
  );
}


function CodesSection() {
  const state = useApp();
  const mode = useMode();
  const [codes, setCodes] = useState<{ managerPin: string; teamCode: string } | null>(null);
  const [pin, setPin] = useState(state.settings.managerPin ?? '1234');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'remote') getCodes().then(setCodes).catch(() => {});
  }, [mode]);

  if (mode === 'local')
    return (
      <Field label="קוד כניסה לצוות (מצב מקומי)">
        <div className="quick-add">
          <input className="input" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/D/g, '').slice(0, 8))} />
          <button className="btn" disabled={pin.length < 4 || pin === state.settings.managerPin} onClick={() => update((s) => void (s.settings.managerPin = pin))}>
            עדכון
          </button>
        </div>
      </Field>
    );

  if (!codes) return <p className="muted">טוען קודים…</p>;
  return (
    <>
      <p className="muted small">קוד הקבוצה — לשחקנים. קוד הצוות — רק לצוות (רואה כספים, משכורות והערות). החלפת קוד מנתקת את כל המחוברים.</p>
      <div className="codes-box">
        <Field label="קוד צוות (6+ ספרות)">
          <input className="input" inputMode="numeric" dir="ltr" value={codes.managerPin} onChange={(e) => setCodes({ ...codes, managerPin: e.target.value.replace(/D/g, '').slice(0, 10) })} />
        </Field>
        <Field label="קוד קבוצה לשחקנים">
          <input className="input" inputMode="numeric" dir="ltr" value={codes.teamCode} onChange={(e) => setCodes({ ...codes, teamCode: e.target.value.replace(/D/g, '').slice(0, 10) })} />
        </Field>
      </div>
      <div className="btn-row">
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm('לשמור את הקודים החדשים? כל המכשירים יצטרכו להתחבר מחדש.')) return;
            setBusy(true);
            try {
              await changeCodes(codes.managerPin, codes.teamCode);
              alert('הקודים עודכנו');
            } catch (e) {
              alert((e as Error).message);
            }
            setBusy(false);
          }}
        >
          שמירת קודים
        </button>
      </div>
    </>
  );
}
