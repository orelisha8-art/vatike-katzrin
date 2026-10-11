import { useState } from 'react';
import { update, useApp } from '../store';
import { back } from '../router';
import { Avatar, confirmDelete, Fab, Field, Icon, Modal, PageHead, PhotoInput, Segmented, Stat } from '../components/ui';
import type { AppState, Staff, Transaction } from '../types';
import { money, shortDate, todayISO, uid, whatsappTo } from '../utils';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const EXPENSE_CATS = ['משכורת', 'שופטים', 'הסעות', 'ציוד', 'כביסה', 'מגרש', 'ביטוח', 'דמי רישום', 'כיבוד', 'אחר'];
const INCOME_CATS = ['חסות', 'דמי חבר', 'מועצה מקומית', 'תרומה', 'כרטיסים', 'אחר'];
const ROLES = ['מאמן ראשי', 'עוזר מאמן', 'מאמן שוערים', 'מאמן כושר', 'מנהל טכני', 'מנהל קבוצה', 'פיזיותרפיסט/ית', 'אחר'];

const shiftMonth = (ym: string, d: number) => {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

/** כמה מגיע לאיש צוות בחודש (חודשי / לפי אימונים / לפי משחקים) */
const dueFor = (s: AppState, st: Staff, ym: string) => {
  if (st.salaryType === 'חודשי') return { amount: st.salary, units: 1 };
  const units =
    st.salaryType === 'לאימון'
      ? s.events.filter((e) => e.type === 'training' && e.date.startsWith(ym) && e.date <= todayISO()).length
      : s.matches.filter((m) => m.status === 'finished' && m.date.startsWith(ym)).length;
  return { amount: units * st.salary, units };
};

export default function Finance() {
  const state = useApp();
  const [ym, setYm] = useState(todayISO().slice(0, 7));
  const [tab, setTab] = useState<'staff' | 'ledger'>('staff');
  const [editStaff, setEditStaff] = useState<Staff | 'new' | null>(null);
  const [editTx, setEditTx] = useState<Transaction | 'new' | null>(null);

  const tx = state.transactions.filter((x) => x.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
  const income = tx.filter((x) => x.kind === 'income').reduce((a, x) => a + x.amount, 0);
  const expense = tx.filter((x) => x.kind !== 'income').reduce((a, x) => a + x.amount, 0);
  const pending = tx.filter((x) => x.kind !== 'income' && !x.paid).reduce((a, x) => a + x.amount, 0);
  const season = state.transactions.reduce((a, x) => a + (x.kind === 'income' ? x.amount : -x.amount), 0);

  const byCat: Record<string, number> = {};
  tx.filter((x) => x.kind !== 'income').forEach((x) => (byCat[x.category] = (byCat[x.category] || 0) + x.amount));
  const maxCat = Math.max(1, ...Object.values(byCat));

  const salaryTx = (st: Staff) => tx.find((x) => x.kind === 'salary' && x.staffId === st.id);

  const paySalary = (st: Staff) => {
    const existing = salaryTx(st);
    const due = dueFor(state, st, ym);
    update((s) => {
      if (existing) {
        const t = s.transactions.find((x) => x.id === existing.id)!;
        t.paid = !t.paid;
      } else
        s.transactions.push({ id: uid(), date: ym === todayISO().slice(0, 7) ? todayISO() : ym + '-01', kind: 'salary', amount: due.amount, category: 'משכורת', staffId: st.id, paid: true });
    });
  };

  const [y, m] = ym.split('-').map(Number);

  return (
    <div className="page">
      <PageHead title="כספים ומשכורות" onBack={back} sub={`יתרה מצטברת: ${money(season)}`} />

      <div className="month-nav">
        <button className="icon-btn" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="חודש קודם">
          <Icon name="back" />
        </button>
        <strong>
          {MONTHS[m - 1]} {y}
        </strong>
        <button className="icon-btn" onClick={() => setYm(shiftMonth(ym, 1))} aria-label="חודש הבא">
          <Icon name="chevron" />
        </button>
      </div>

      <div className="stats-row">
        <Stat label="הכנסות" value={money(income)} tone="ok" />
        <Stat label="הוצאות" value={money(expense)} tone="bad" />
        <Stat label="מאזן החודש" value={money(income - expense)} tone={income - expense >= 0 ? 'ok' : 'bad'} />
        <Stat label="ממתין לתשלום" value={money(pending)} tone={pending ? 'warn' : undefined} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'staff', label: 'צוות ומשכורות' },
          { value: 'ledger', label: `תנועות (${tx.length})` },
        ]}
      />

      {tab === 'staff' && (
        <>
          <div className="staff-list">
            {state.staff.map((st) => {
              const t = salaryTx(st);
              const due = dueFor(state, st, ym);
              return (
                <div key={st.id} className="card staff-card">
                  <button className="staff-main" onClick={() => setEditStaff(st)}>
                    <Avatar photo={st.photo} name={st.name} size={48} />
                    <span>
                      <strong>{st.name}</strong>
                      <small>{st.role}</small>
                      <small>
                        {money(st.salary)} {st.salaryType === 'חודשי' ? 'לחודש' : st.salaryType}
                        {st.salaryType !== 'חודשי' && ` · ${due.units} החודש = ${money(due.amount)}`}
                      </small>
                    </span>
                  </button>
                  <div className="staff-actions">
                    {st.phone && (
                      <a className="icon-btn" href={whatsappTo(st.phone)} target="_blank" rel="noreferrer" aria-label="וואטסאפ">
                        <Icon name="phone" size={18} />
                      </a>
                    )}
                    <button className={'pay-btn' + (t?.paid ? ' paid' : t ? ' pending' : '')} onClick={() => paySalary(st)}>
                      {t?.paid ? (
                        <>
                          <Icon name="check" size={16} /> שולם {money(t.amount)}
                        </>
                      ) : t ? (
                        `ממתין · ${money(t.amount)}`
                      ) : (
                        `סמן ששולם · ${money(due.amount)}`
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted small">סה״כ שכר צוות החודש: {money(state.staff.reduce((a, st) => a + dueFor(state, st, ym).amount, 0))}</p>
          <Fab label="איש צוות" onClick={() => setEditStaff('new')} />
        </>
      )}

      {tab === 'ledger' && (
        <>
          {Object.keys(byCat).length > 0 && (
            <section className="card">
              <h2>לאן הלך הכסף</h2>
              <div className="bars">
                {Object.entries(byCat)
                  .sort((a, b) => b[1] - a[1])
                  .map(([c, v]) => (
                    <div key={c} className="bar-row">
                      <span className="bar-label">{c}</span>
                      <span className="bar-track">
                        <span className="bar-fill" style={{ width: `${(v / maxCat) * 100}%` }} />
                      </span>
                      <span className="bar-val">{money(v)}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}
          <section className="card">
            <ul className="ledger">
              {tx.map((x) => (
                <li key={x.id}>
                  <button onClick={() => setEditTx(x)}>
                    <span className="ledger-date">{shortDate(x.date)}</span>
                    <span className="ledger-main">
                      <strong>{x.kind === 'salary' ? state.staff.find((s) => s.id === x.staffId)?.name ?? 'משכורת' : x.category}</strong>
                      <small>
                        {x.kind === 'salary' ? 'משכורת' : x.note}
                        {!x.paid && <span className="warn"> · {x.kind === 'income' ? 'טרם התקבל' : 'טרם שולם'}</span>}
                      </small>
                    </span>
                    <span className={'ledger-amt ' + (x.kind === 'income' ? 'ok' : 'bad')}>
                      {x.kind === 'income' ? '+' : '−'}
                      {money(x.amount)}
                    </span>
                  </button>
                </li>
              ))}
              {tx.length === 0 && <p className="muted">אין תנועות בחודש הזה</p>}
            </ul>
          </section>
          <Fab label="תנועה" onClick={() => setEditTx('new')} />
        </>
      )}

      {editStaff && <StaffForm staff={editStaff === 'new' ? undefined : editStaff} onClose={() => setEditStaff(null)} />}
      {editTx && <TxForm tx={editTx === 'new' ? undefined : editTx} ym={ym} onClose={() => setEditTx(null)} />}
    </div>
  );
}

function StaffForm({ staff, onClose }: { staff?: Staff; onClose: () => void }) {
  const [x, setX] = useState<Staff>(() => staff ?? { id: uid(), name: '', role: 'עוזר מאמן', salary: 0, salaryType: 'חודשי' });
  const save = () => {
    if (!x.name.trim()) return alert('שם?');
    update((s) => {
      const i = s.staff.findIndex((y) => y.id === x.id);
      if (i >= 0) s.staff[i] = x;
      else s.staff.push(x);
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={staff ? 'עריכת איש צוות' : 'איש צוות חדש'}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          {staff && (
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!confirmDelete(staff.name)) return;
                update((s) => void (s.staff = s.staff.filter((y) => y.id !== staff.id)));
                onClose();
              }}
            >
              מחיקה
            </button>
          )}
        </>
      }
    >
      <PhotoInput value={x.photo} onChange={(v) => setX({ ...x, photo: v })} name={x.name} />
      <div className="form-grid">
        <Field label="שם">
          <input className="input" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} />
        </Field>
        <Field label="תפקיד">
          <input className="input" list="roles" value={x.role} onChange={(e) => setX({ ...x, role: e.target.value })} />
          <datalist id="roles">
            {ROLES.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="טלפון">
          <input className="input" type="tel" dir="ltr" value={x.phone ?? ''} onChange={(e) => setX({ ...x, phone: e.target.value })} />
        </Field>
        <Field label="שכר (₪)">
          <input className="input" inputMode="numeric" value={x.salary || ''} onChange={(e) => setX({ ...x, salary: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        </Field>
      </div>
      <Field label="סוג תשלום">
        <Segmented
          value={x.salaryType}
          onChange={(v) => setX({ ...x, salaryType: v })}
          options={[
            { value: 'חודשי', label: 'חודשי' },
            { value: 'לאימון', label: 'לפי אימון' },
            { value: 'למשחק', label: 'לפי משחק' },
          ]}
        />
      </Field>
    </Modal>
  );
}

function TxForm({ tx, ym, onClose }: { tx?: Transaction; ym: string; onClose: () => void }) {
  const t = todayISO();
  const [x, setX] = useState<Transaction>(
    () => tx ?? { id: uid(), date: t.startsWith(ym) ? t : ym + '-01', kind: 'expense', amount: 0, category: 'שופטים', paid: true },
  );
  const cats = x.kind === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const save = () => {
    if (!x.amount) return alert('סכום?');
    update((s) => {
      const i = s.transactions.findIndex((y) => y.id === x.id);
      if (i >= 0) s.transactions[i] = x;
      else s.transactions.push(x);
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={tx ? 'עריכת תנועה' : 'תנועה חדשה'}
      footer={
        <>
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          {tx && (
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!confirmDelete('התנועה')) return;
                update((s) => void (s.transactions = s.transactions.filter((y) => y.id !== tx.id)));
                onClose();
              }}
            >
              מחיקה
            </button>
          )}
        </>
      }
    >
      {x.kind !== 'salary' && (
        <Segmented
          value={x.kind}
          onChange={(v) => setX({ ...x, kind: v, category: v === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[1] })}
          options={[
            { value: 'expense', label: 'הוצאה' },
            { value: 'income', label: 'הכנסה' },
          ]}
        />
      )}
      <div className="form-grid">
        <Field label="סכום (₪)">
          <input className="input big-input" inputMode="numeric" value={x.amount || ''} onChange={(e) => setX({ ...x, amount: Number(e.target.value.replace(/\D/g, '')) || 0 })} autoFocus={!tx} />
        </Field>
        <Field label="תאריך">
          <input className="input" type="date" value={x.date} onChange={(e) => setX({ ...x, date: e.target.value })} />
        </Field>
      </div>
      {x.kind !== 'salary' && (
        <Field label="קטגוריה">
          <div className="chips">
            {cats.map((c) => (
              <button key={c} type="button" className={'chip' + (x.category === c ? ' on' : '')} onClick={() => setX({ ...x, category: c })}>
                {c}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label="פירוט">
        <input className="input" value={x.note ?? ''} onChange={(e) => setX({ ...x, note: e.target.value })} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={x.paid} onChange={(e) => setX({ ...x, paid: e.target.checked })} /> {x.kind === 'income' ? 'התקבל' : 'שולם'}
      </label>
    </Modal>
  );
}
