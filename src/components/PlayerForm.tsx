import { useState } from 'react';
import type { Player, PlayerStatus, Position } from '../types';
import { update } from '../store';
import { POSITIONS, STATUS, uid } from '../utils';
import { Field, Modal, PhotoInput, Segmented } from './ui';

const empty = (): Player => ({ id: uid(), name: '', position: 'MF', status: 'fit', active: true, registered: true, sizes: {} });

export default function PlayerForm({ player, onClose }: { player?: Player; onClose: () => void }) {
  const [p, setP] = useState<Player>(() => (player ? structuredClone(player) : empty()));
  const set = <K extends keyof Player>(k: K, v: Player[K]) => setP((x) => ({ ...x, [k]: v }));
  const setSize = (k: 'shirt' | 'shorts' | 'shoe', v: string) => setP((x) => ({ ...x, sizes: { ...x.sizes, [k]: v } }));

  const save = () => {
    if (!p.name.trim()) return alert('צריך שם');
    update((s) => {
      const clean = { ...p, name: p.name.trim() };
      if (clean.captain) s.players.forEach((x) => (x.captain = false));
      const i = s.players.findIndex((x) => x.id === p.id);
      if (i >= 0) s.players[i] = clean;
      else s.players.push(clean);
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={player ? 'עריכת שחקן' : 'שחקן חדש'}
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
      <PhotoInput value={p.photo} onChange={(v) => set('photo', v)} name={p.name} />
      <div className="form-grid">
        <Field label="שם מלא">
          <input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} autoFocus={!player} />
        </Field>
        <Field label="מספר חולצה">
          <input className="input" inputMode="numeric" value={p.number ?? ''} onChange={(e) => set('number', e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined)} />
        </Field>
      </div>
      <Field label="עמדה">
        <Segmented value={p.position} onChange={(v) => set('position', v as Position)} options={Object.entries(POSITIONS).map(([value, label]) => ({ value: value as Position, label }))} />
      </Field>
      <Field label="מצב">
        <Segmented value={p.status} onChange={(v) => set('status', v as PlayerStatus)} options={Object.entries(STATUS).map(([value, s]) => ({ value: value as PlayerStatus, label: s.label }))} />
      </Field>
      {p.status !== 'fit' && (
        <div className="form-grid">
          <Field label="פירוט">
            <input className="input" value={p.statusNote ?? ''} onChange={(e) => set('statusNote', e.target.value)} placeholder="למשל: נקע בקרסול" />
          </Field>
          <Field label="חזרה משוערת">
            <input className="input" type="date" value={p.returnDate ?? ''} onChange={(e) => set('returnDate', e.target.value)} />
          </Field>
        </div>
      )}
      <div className="form-grid">
        <Field label="טלפון">
          <input className="input" type="tel" dir="ltr" value={p.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="תאריך לידה">
          <input className="input" type="date" value={p.birthDate ?? ''} onChange={(e) => set('birthDate', e.target.value)} />
        </Field>
        <Field label="רגל חזקה">
          <select className="input" value={p.foot ?? ''} onChange={(e) => set('foot', (e.target.value || undefined) as Player['foot'])}>
            <option value="">—</option>
            <option>ימין</option>
            <option>שמאל</option>
            <option>שתיים</option>
          </select>
        </Field>
        <Field label="תוקף אישור רפואי">
          <input className="input" type="date" value={p.medicalExpiry ?? ''} onChange={(e) => set('medicalExpiry', e.target.value)} />
        </Field>
      </div>
      <div className="form-grid three">
        <Field label="מידת חולצה">
          <input className="input" value={p.sizes?.shirt ?? ''} onChange={(e) => setSize('shirt', e.target.value)} />
        </Field>
        <Field label="מכנסיים">
          <input className="input" value={p.sizes?.shorts ?? ''} onChange={(e) => setSize('shorts', e.target.value)} />
        </Field>
        <Field label="נעליים">
          <input className="input" value={p.sizes?.shoe ?? ''} onChange={(e) => setSize('shoe', e.target.value)} />
        </Field>
      </div>
      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={!!p.captain} onChange={(e) => set('captain', e.target.checked)} /> קפטן
        </label>
        <label className="check">
          <input type="checkbox" checked={p.registered !== false} onChange={(e) => set('registered', e.target.checked)} /> כרטיס שחקן באיגוד
        </label>
        <label className="check">
          <input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} /> פעיל בסגל
        </label>
      </div>
      <Field label="הערות צוות (לא מוצג לשחקנים)">
        <textarea className="input" rows={3} value={p.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  );
}
