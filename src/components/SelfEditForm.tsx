import { useState } from 'react';
import type { Player } from '../types';
import { updateProfile } from '../store';
import { Field, Modal, PhotoInput } from './ui';

/** עריכה עצמית של שחקן — רק פרטים אישיים. מספר, עמדה ומצב נקבעים ע״י הצוות */
export default function SelfEditForm({ player, onClose }: { player: Player; onClose: () => void }) {
  const [photo, setPhoto] = useState(player.photo);
  const [phone, setPhone] = useState(player.phone ?? '');
  const [birthDate, setBirthDate] = useState(player.birthDate ?? '');
  const [foot, setFoot] = useState(player.foot ?? '');
  const [sizes, setSizes] = useState({ shirt: player.sizes?.shirt ?? '', shorts: player.sizes?.shorts ?? '', shoe: player.sizes?.shoe ?? '' });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile(player.id, { photo, phone: phone.trim(), birthDate, foot: (foot || undefined) as Player['foot'], sizes });
      onClose();
    } catch (e) {
      alert('השמירה נכשלה: ' + (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="הפרטים שלי"
      footer={
        <>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'שומר…' : 'שמירה'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </>
      }
    >
      <PhotoInput value={photo} onChange={setPhoto} name={player.name} />
      <div className="form-grid">
        <Field label="טלפון">
          <input className="input" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s+\-()]/g, '').slice(0, 20))} />
        </Field>
        <Field label="תאריך לידה">
          <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </Field>
      </div>
      <Field label="רגל חזקה">
        <select className="input" value={foot} onChange={(e) => setFoot(e.target.value as Player['foot'] & string)}>
          <option value="">—</option>
          <option>ימין</option>
          <option>שמאל</option>
          <option>שתיים</option>
        </select>
      </Field>
      <div className="form-grid three">
        <Field label="מידת חולצה">
          <input className="input" value={sizes.shirt} maxLength={6} onChange={(e) => setSizes({ ...sizes, shirt: e.target.value })} />
        </Field>
        <Field label="מכנסיים">
          <input className="input" value={sizes.shorts} maxLength={6} onChange={(e) => setSizes({ ...sizes, shorts: e.target.value })} />
        </Field>
        <Field label="נעליים">
          <input className="input" value={sizes.shoe} maxLength={6} onChange={(e) => setSizes({ ...sizes, shoe: e.target.value })} />
        </Field>
      </div>
      <p className="muted small">מספר חולצה, עמדה ומצב כשירות מעדכן הצוות.</p>
    </Modal>
  );
}
