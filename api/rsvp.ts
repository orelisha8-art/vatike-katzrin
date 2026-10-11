import { docs, getState, handle, readRole, SAFE_ID, send } from './_lib.js';

/** אישור הגעה — שחקנים ומנהלים */
export default handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'שיטה לא נתמכת' });
  const role = await readRole(req);
  if (!role) return send(res, 401, { error: 'צריך להתחבר' });
  const { itemId, playerId, value } = req.body ?? {};
  if (!SAFE_ID.test(String(itemId)) || !SAFE_ID.test(String(playerId))) return send(res, 400, { error: 'מזהה לא תקין' });
  if (value !== null && !['yes', 'no', 'maybe'].includes(value)) return send(res, 400, { error: 'ערך לא תקין' });

  const { state } = await getState();
  const exists = !!state && state.players.some((p) => p.id === playerId) && (state.events.some((e) => e.id === itemId) || state.matches.some((m) => m.id === itemId));
  if (!exists) return send(res, 404, { error: 'לא נמצא' });

  const field = `data.${itemId}.${playerId}`;
  const c = await docs();
  await c.updateOne({ _id: 'rsvp' }, value ? { $set: { [field]: value } } : { $unset: { [field]: '' } }, { upsert: true });
  send(res, 200, { ok: true });
});
