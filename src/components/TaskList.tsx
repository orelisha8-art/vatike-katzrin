import { useState } from 'react';
import type { AppState, Task } from '../types';
import { update } from '../store';
import { relDay, todayISO, uid } from '../utils';
import { Field, Icon, Modal } from './ui';

/** רשימת משימות עם הוספה מהירה — משמשת לאחזקה ולמנהל הטכני */
export default function TaskList({ tasks, listKey }: { tasks: Task[]; listKey: 'maintenance' | 'tdTasks' }) {
  const [quick, setQuick] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const t = todayISO();

  const mutate = (fn: (list: Task[], s: AppState) => void) => update((s) => fn(s[listKey], s));
  const open = tasks.filter((x) => !x.done).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'));
  const done = tasks.filter((x) => x.done);

  const add = () => {
    if (!quick.trim()) return;
    mutate((l) => l.push({ id: uid(), title: quick.trim(), done: false, priority: 'רגילה' }));
    setQuick('');
  };

  const row = (x: Task) => (
    <li key={x.id} className={'task' + (x.done ? ' done' : '') + (x.priority === 'גבוהה' && !x.done ? ' high' : '')}>
      <button className="checkbox" onClick={() => mutate((l) => (l.find((y) => y.id === x.id)!.done = !x.done))} aria-label="סימון">
        {x.done && <Icon name="check" size={16} />}
      </button>
      <button className="task-main" onClick={() => setEditing(x)}>
        <span>{x.title}</span>
        <small>
          {x.due && <span className={!x.done && x.due < t ? 'bad' : ''}>{relDay(x.due)}</span>}
          {x.owner && <span> · {x.owner}</span>}
          {x.priority === 'גבוהה' && <span className="bad"> · דחוף</span>}
        </small>
      </button>
    </li>
  );

  return (
    <div>
      <div className="quick-add">
        <input className="input" placeholder="משימה חדשה… (Enter להוספה)" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-primary" onClick={add} aria-label="הוספה">
          <Icon name="plus" size={18} />
        </button>
      </div>
      <ul className="tasks">{open.map(row)}</ul>
      {open.length === 0 && <p className="muted">אין משימות פתוחות 🎉</p>}
      {done.length > 0 && (
        <>
          <button className="link-btn" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'הסתר' : 'הצג'} משימות שבוצעו ({done.length})
          </button>
          {showDone && <ul className="tasks">{done.map(row)}</ul>}
        </>
      )}
      {editing && (
        <TaskForm
          task={editing}
          onClose={() => setEditing(null)}
          onSave={(nt) => mutate((l) => (l[l.findIndex((y) => y.id === nt.id)] = nt))}
          onDelete={() => mutate((l) => l.splice(l.findIndex((y) => y.id === editing.id), 1))}
        />
      )}
    </div>
  );
}

function TaskForm({ task, onClose, onSave, onDelete }: { task: Task; onClose: () => void; onSave: (t: Task) => void; onDelete: () => void }) {
  const [x, setX] = useState(task);
  return (
    <Modal
      open
      onClose={onClose}
      title="משימה"
      footer={
        <>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave(x);
              onClose();
            }}
          >
            שמירה
          </button>
          <button
            className="btn btn-ghost danger"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            מחיקה
          </button>
        </>
      }
    >
      <Field label="משימה">
        <input className="input" value={x.title} onChange={(e) => setX({ ...x, title: e.target.value })} />
      </Field>
      <div className="form-grid">
        <Field label="תאריך יעד">
          <input className="input" type="date" value={x.due ?? ''} onChange={(e) => setX({ ...x, due: e.target.value || undefined })} />
        </Field>
        <Field label="אחראי">
          <input className="input" value={x.owner ?? ''} onChange={(e) => setX({ ...x, owner: e.target.value })} />
        </Field>
        <Field label="עדיפות">
          <select className="input" value={x.priority ?? 'רגילה'} onChange={(e) => setX({ ...x, priority: e.target.value as Task['priority'] })}>
            <option>גבוהה</option>
            <option>רגילה</option>
            <option>נמוכה</option>
          </select>
        </Field>
      </div>
      <Field label="הערות">
        <textarea className="input" rows={3} value={x.notes ?? ''} onChange={(e) => setX({ ...x, notes: e.target.value })} />
      </Field>
    </Modal>
  );
}
