import { useState } from 'react';
import { update, useApp } from '../store';
import { back } from '../router';
import { confirmDelete, Fab, Field, Icon, Modal, PageHead, Segmented } from '../components/ui';
import TaskList from '../components/TaskList';
import type { EquipmentItem } from '../types';
import { byNumber, uid } from '../utils';

const CATEGORIES = ['כדורים', 'מדים', 'אימון', 'רפואי', 'אחר'];
const CONDITIONS: EquipmentItem['condition'][] = ['חדש', 'תקין', 'בלוי', 'לתיקון'];

export default function Equipment() {
  const state = useApp();
  const [tab, setTab] = useState<'items' | 'maintenance' | 'sizes'>('items');
  const [editing, setEditing] = useState<EquipmentItem | 'new' | null>(null);

  const players = state.players.filter((p) => p.active).sort(byNumber);
  const sizeCount = (k: 'shirt' | 'shorts' | 'shoe') => {
    const c: Record<string, number> = {};
    players.forEach((p) => {
      const v = p.sizes?.[k];
      if (v) c[v] = (c[v] || 0) + 1;
    });
    return Object.entries(c).sort();
  };

  return (
    <div className="page">
      <PageHead title="ציוד ואחזקה" onBack={back} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'items', label: 'מלאי ציוד' },
          { value: 'maintenance', label: `אחזקה (${state.maintenance.filter((x) => !x.done).length})` },
          { value: 'sizes', label: 'מידות שחקנים' },
        ]}
      />

      {tab === 'items' && (
        <>
          {CATEGORIES.map((cat) => {
            const items = state.equipment.filter((e) => (e.category || 'אחר') === cat);
            if (!items.length) return null;
            return (
              <section key={cat} className="card">
                <h2>{cat}</h2>
                <ul className="equip-list">
                  {items.map((e) => (
                    <li key={e.id}>
                      <button onClick={() => setEditing(e)}>
                        <span className="equip-qty">{e.qty}</span>
                        <span className="equip-main">
                          <strong>{e.name}</strong>
                          <small>
                            {e.location}
                            {e.notes ? ' · ' + e.notes : ''}
                          </small>
                        </span>
                        <span className={'cond cond-' + CONDITIONS.indexOf(e.condition)}>{e.condition}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <Fab label="פריט" onClick={() => setEditing('new')} />
        </>
      )}

      {tab === 'maintenance' && (
        <section className="card">
          <TaskList tasks={state.maintenance} listKey="maintenance" />
        </section>
      )}

      {tab === 'sizes' && (
        <>
          <section className="card">
            <h2>סיכום להזמנת מדים</h2>
            <dl className="details">
              <dt>חולצות</dt>
              <dd>{sizeCount('shirt').map(([s, n]) => `${s}×${n}`).join('  ·  ') || '—'}</dd>
              <dt>מכנסיים</dt>
              <dd>{sizeCount('shorts').map(([s, n]) => `${s}×${n}`).join('  ·  ') || '—'}</dd>
              <dt>נעליים</dt>
              <dd>{sizeCount('shoe').map(([s, n]) => `${s}×${n}`).join('  ·  ') || '—'}</dd>
            </dl>
          </section>
          <section className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>שחקן</th>
                  <th>חולצה</th>
                  <th>מכנס</th>
                  <th>נעל</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.number}</td>
                    <td>{p.name}</td>
                    {(['shirt', 'shorts', 'shoe'] as const).map((k) => (
                      <td key={k}>
                        <input
                          className="cell-input"
                          defaultValue={p.sizes?.[k] ?? ''}
                          onBlur={(e) =>
                            e.target.value !== (p.sizes?.[k] ?? '') &&
                            update((s) => {
                              const x = s.players.find((y) => y.id === p.id)!;
                              x.sizes = { ...x.sizes, [k]: e.target.value };
                            })
                          }
                          aria-label={k}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {editing && <ItemForm item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ItemForm({ item, onClose }: { item?: EquipmentItem; onClose: () => void }) {
  const [x, setX] = useState<EquipmentItem>(() => item ?? { id: uid(), name: '', category: 'כדורים', qty: 1, condition: 'תקין' });
  const save = () => {
    if (!x.name.trim()) return alert('שם הפריט?');
    update((s) => {
      const i = s.equipment.findIndex((y) => y.id === x.id);
      if (i >= 0) s.equipment[i] = x;
      else s.equipment.push(x);
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'עריכת פריט' : 'פריט חדש'}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          {item && (
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!confirmDelete(item.name)) return;
                update((s) => void (s.equipment = s.equipment.filter((y) => y.id !== item.id)));
                onClose();
              }}
            >
              <Icon name="trash" size={16} /> מחיקה
            </button>
          )}
        </>
      }
    >
      <Field label="פריט">
        <input className="input" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} autoFocus={!item} />
      </Field>
      <div className="form-grid">
        <Field label="קטגוריה">
          <select className="input" value={x.category} onChange={(e) => setX({ ...x, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="כמות">
          <div className="stepper">
            <button type="button" className="icon-btn" onClick={() => setX({ ...x, qty: Math.max(0, x.qty - 1) })}>
              −
            </button>
            <input className="input" inputMode="numeric" value={x.qty} onChange={(e) => setX({ ...x, qty: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            <button type="button" className="icon-btn" onClick={() => setX({ ...x, qty: x.qty + 1 })}>
              +
            </button>
          </div>
        </Field>
      </div>
      <Field label="מצב">
        <Segmented value={x.condition} onChange={(v) => setX({ ...x, condition: v })} options={CONDITIONS.map((c) => ({ value: c, label: c }))} />
      </Field>
      <Field label="איפה נמצא / אצל מי">
        <input className="input" value={x.location ?? ''} onChange={(e) => setX({ ...x, location: e.target.value })} />
      </Field>
      <Field label="הערות">
        <input className="input" value={x.notes ?? ''} onChange={(e) => setX({ ...x, notes: e.target.value })} />
      </Field>
    </Modal>
  );
}
