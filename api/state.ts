import type { AppState } from '../src/types';
import { docs, forPlayers, getState, handle, readRole, send } from './_lib.js';

/**
 * GET  — המצב המלא למנהלים, מסונן לשחקנים
 * PUT  — שמירה (מנהלים בלבד) עם בדיקת גרסה כדי לא לדרוס שינוי ממכשיר אחר
 */
export default handle(async (req, res) => {
  const role = await readRole(req);
  if (!role) return send(res, 401, { error: 'צריך להתחבר' });

  if (req.method === 'GET') {
    const { state, rsvp, rev } = await getState();
    if (!state) return send(res, 200, { state: null, rev, role });
    const visible = role === 'manager' ? state : forPlayers(state);
    return send(res, 200, { state: { ...visible, rsvp }, rev, role });
  }

  if (req.method === 'PUT') {
    if (role !== 'manager') return send(res, 403, { error: 'אין הרשאה' });
    const { state, baseRev, replaceRsvp } = (req.body ?? {}) as { state?: AppState; baseRev?: number; replaceRsvp?: boolean };
    if (!state || typeof state !== 'object' || !Array.isArray(state.players) || !state.settings) return send(res, 400, { error: 'נתונים לא תקינים' });
    const { rsvp, ...rest } = state;
    delete (rest.settings as Partial<AppState['settings']>).managerPin;
    const data = { ...rest, rsvp: {} } as AppState;
    const c = await docs();
    const current = await getState();

    let rev: number | null = null;
    if (current.rev === 0 && Number(baseRev) === 0) {
      // יצירה ראשונה של הקבוצה
      const ins = await c.updateOne({ _id: 'state' }, { $setOnInsert: { data, rev: 1 } }, { upsert: true });
      if (ins.upsertedCount) rev = 1;
    } else {
      const after = (await c.findOneAndUpdate({ _id: 'state', rev: Number(baseRev) }, { $set: { data }, $inc: { rev: 1 } }, { returnDocument: 'after' })) as {
        rev: number;
      } | null;
      rev = after?.rev ?? null;
    }

    if (rev === null) {
      const latest = await getState();
      return send(res, 409, { error: 'הנתונים עודכנו ממכשיר אחר', state: latest.state && { ...latest.state, rsvp: latest.rsvp }, rev: latest.rev });
    }
    if (replaceRsvp) await c.updateOne({ _id: 'rsvp' }, { $set: { data: rsvp ?? {} } }, { upsert: true });
    return send(res, 200, { rev });
  }

  send(res, 405, { error: 'שיטה לא נתמכת' });
});
