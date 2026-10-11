import { useState } from 'react';
import { update, useApp } from '../store';
import { back, go } from '../router';
import { Avatar, confirmDelete, Fab, Field, Icon, Modal, PageHead, Segmented } from '../components/ui';
import TaskList from '../components/TaskList';
import type { Prospect } from '../types';
import { byNumber, daysBetween, POSITIONS, shortDate, STATUS, todayISO, uid, whatsappTo } from '../utils';

const PROSPECT_STATUS: Prospect['status'][] = ['במעקב', 'הוזמן לאימון', 'בשיחות', 'הצטרף', 'נדחה'];

export default function TechDirector() {
  const state = useApp();
  const [tab, setTab] = useState<'tasks' | 'checklist' | 'compliance' | 'scouting' | 'notes'>('tasks');
  const [newItem, setNewItem] = useState('');
  const [editP, setEditP] = useState<Prospect | 'new' | null>(null);
  const t = todayISO();

  const players = state.players.filter((p) => p.active).sort(byNumber);
  const issues = players.filter((p) => !p.medicalExpiry || daysBetween(t, p.medicalExpiry) <= 30 || p.registered === false);
  const doneCount = state.checklist.filter((c) => c.done).length;

  return (
    <div className="page">
      <PageHead title="מנהל טכני" sub="משימות, תקינות סגל, יום משחק וסקאוטינג" onBack={back} />
      <div className="tabs-scroll">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tasks', label: `משימות (${state.tdTasks.filter((x) => !x.done).length})` },
            { value: 'checklist', label: `יום משחק ${doneCount}/${state.checklist.length}` },
            { value: 'compliance', label: `תקינות סגל${issues.length ? ` ⚠️${issues.length}` : ''}` },
            { value: 'scouting', label: 'סקאוטינג' },
            { value: 'notes', label: 'יומן' },
          ]}
        />
      </div>

      {tab === 'tasks' && (
        <section className="card">
          <TaskList tasks={state.tdTasks} listKey="tdTasks" />
        </section>
      )}

      {tab === 'checklist' && (
        <section className="card">
          <div className="card-head">
            <h2>צ׳קליסט לפני משחק</h2>
            <button className="btn btn-sm btn-ghost" onClick={() => update((s) => s.checklist.forEach((c) => (c.done = false)))}>
              איפוס למשחק הבא
            </button>
          </div>
          <div className="progress">
            <span style={{ width: `${(doneCount / Math.max(1, state.checklist.length)) * 100}%` }} />
          </div>
          <ul className="tasks">
            {state.checklist.map((c) => (
              <li key={c.id} className={'task' + (c.done ? ' done' : '')}>
                <button className="checkbox" onClick={() => update((s) => void (s.checklist.find((x) => x.id === c.id)!.done = !c.done))} aria-label="סימון">
                  {c.done && <Icon name="check" size={16} />}
                </button>
                <span className="task-main">{c.text}</span>
                <button className="icon-btn sm" onClick={() => update((s) => void (s.checklist = s.checklist.filter((x) => x.id !== c.id)))} aria-label="הסרה">
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="quick-add">
            <input
              className="input"
              placeholder="פריט נוסף לרשימה…"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newItem.trim()) {
                  update((s) => void s.checklist.push({ id: uid(), text: newItem.trim(), done: false }));
                  setNewItem('');
                }
              }}
            />
          </div>
        </section>
      )}

      {tab === 'compliance' && (
        <section className="card">
          <h2>אישורים רפואיים וכרטיסי שחקן</h2>
          <p className="muted small">שחקן בלי אישור רפואי בתוקף או בלי כרטיס שחקן לא יכול לשחק במשחק רשמי.</p>
          <table className="table">
            <thead>
              <tr>
                <th>שחקן</th>
                <th>אישור רפואי</th>
                <th>כרטיס</th>
                <th>מצב</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const d = p.medicalExpiry ? daysBetween(t, p.medicalExpiry) : null;
                return (
                  <tr key={p.id} className="clickable" onClick={() => go('squad/' + p.id)}>
                    <td>
                      {p.number} {p.name}
                    </td>
                    <td className={d === null ? 'warn' : d < 0 ? 'bad' : d <= 30 ? 'warn' : ''}>{p.medicalExpiry ? shortDate(p.medicalExpiry) + (d! < 0 ? ' ✗' : d! <= 30 ? ' ⚠️' : '') : 'חסר'}</td>
                    <td className={p.registered === false ? 'bad' : ''}>{p.registered === false ? '✗' : '✓'}</td>
                    <td style={{ color: STATUS[p.status].color }}>{STATUS[p.status].label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'scouting' && (
        <>
          <div className="list">
            {state.prospects.map((p) => (
              <div key={p.id} className="card prospect">
                <button className="prospect-main" onClick={() => setEditP(p)}>
                  <Avatar name={p.name} size={44} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {POSITIONS[p.position]}
                      {p.age ? ` · ${p.age}` : ''}
                      {p.club ? ` · ${p.club}` : ''}
                    </small>
                    {p.notes && <small>{p.notes}</small>}
                  </span>
                  <span className="prospect-side">
                    <span className="stars">{'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}</span>
                    <span className="status-chip">{p.status}</span>
                  </span>
                </button>
                {p.phone && (
                  <a className="icon-btn" href={whatsappTo(p.phone)} target="_blank" rel="noreferrer" aria-label="וואטסאפ">
                    <Icon name="phone" size={18} />
                  </a>
                )}
              </div>
            ))}
            {state.prospects.length === 0 && <p className="muted">אין שחקנים במעקב</p>}
          </div>
          <Fab label="שחקן למעקב" onClick={() => setEditP('new')} />
        </>
      )}

      {tab === 'notes' && (
        <section className="card">
          <h2>יומן המנהל הטכני</h2>
          <textarea
            className="input"
            rows={14}
            defaultValue={state.tdNotes}
            placeholder={'רעיונות, סיכומי פגישות, דברים לזכור…\nנשמר אוטומטית ביציאה מהשדה'}
            onBlur={(e) => e.target.value !== state.tdNotes && update((s) => void (s.tdNotes = e.target.value))}
          />
        </section>
      )}

      {editP && <ProspectForm p={editP === 'new' ? undefined : editP} onClose={() => setEditP(null)} />}
    </div>
  );
}

function ProspectForm({ p, onClose }: { p?: Prospect; onClose: () => void }) {
  const [x, setX] = useState<Prospect>(() => p ?? { id: uid(), name: '', position: 'MF', rating: 3, status: 'במעקב' });
  const save = () => {
    if (!x.name.trim()) return alert('שם?');
    update((s) => {
      const i = s.prospects.findIndex((y) => y.id === x.id);
      if (i >= 0) s.prospects[i] = x;
      else s.prospects.push(x);
    });
    onClose();
  };
  const promote = () => {
    if (!window.confirm(`להעביר את ${x.name} לסגל הקבוצה?`)) return;
    update((s) => {
      s.players.push({ id: uid(), name: x.name, position: x.position, phone: x.phone, status: 'fit', active: true, registered: false, notes: x.notes });
      const pr = s.prospects.find((y) => y.id === x.id);
      if (pr) pr.status = 'הצטרף';
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={p ? x.name : 'שחקן למעקב'}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          {p && x.status !== 'הצטרף' && (
            <button className="btn" onClick={promote}>
              צירוף לסגל
            </button>
          )}
          {p && (
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!confirmDelete(p.name)) return;
                update((s) => void (s.prospects = s.prospects.filter((y) => y.id !== p.id)));
                onClose();
              }}
            >
              מחיקה
            </button>
          )}
        </>
      }
    >
      <div className="form-grid">
        <Field label="שם">
          <input className="input" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} />
        </Field>
        <Field label="קבוצה נוכחית">
          <input className="input" value={x.club ?? ''} onChange={(e) => setX({ ...x, club: e.target.value })} />
        </Field>
        <Field label="גיל">
          <input className="input" inputMode="numeric" value={x.age ?? ''} onChange={(e) => setX({ ...x, age: Number(e.target.value.replace(/\D/g, '')) || undefined })} />
        </Field>
        <Field label="טלפון">
          <input className="input" dir="ltr" type="tel" value={x.phone ?? ''} onChange={(e) => setX({ ...x, phone: e.target.value })} />
        </Field>
      </div>
      <Field label="עמדה">
        <Segmented value={x.position} onChange={(v) => setX({ ...x, position: v })} options={Object.entries(POSITIONS).map(([value, label]) => ({ value: value as Prospect['position'], label }))} />
      </Field>
      <Field label="הערכה">
        <div className="stars-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={n <= x.rating ? 'on' : ''} onClick={() => setX({ ...x, rating: n })} aria-label={`${n} כוכבים`}>
              ★
            </button>
          ))}
        </div>
      </Field>
      <Field label="סטטוס">
        <select className="input" value={x.status} onChange={(e) => setX({ ...x, status: e.target.value as Prospect['status'] })}>
          {PROSPECT_STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="הערות">
        <textarea className="input" rows={3} value={x.notes ?? ''} onChange={(e) => setX({ ...x, notes: e.target.value })} />
      </Field>
    </Modal>
  );
}
