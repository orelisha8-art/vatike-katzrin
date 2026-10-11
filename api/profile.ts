import { docs, getState, handle, readRole, SAFE_ID, send } from './_lib.js';

/** שחקן מעדכן את הפרטים האישיים שלו בלבד: תמונה, טלפון, תאריך לידה, רגל, מידות */
const MAX_PHOTO = 400_000; // ~400KB — התמונות מוקטנות בדפדפן לפני השליחה

export default handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'שיטה לא נתמכת' });
  const role = await readRole(req);
  if (!role) return send(res, 401, { error: 'צריך להתחבר' });

  const { playerId, patch } = (req.body ?? {}) as { playerId?: string; patch?: Record<string, unknown> };
  if (!SAFE_ID.test(String(playerId)) || !patch || typeof patch !== 'object') return send(res, 400, { error: 'נתונים לא תקינים' });

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  const f = 'data.players.$[p].';

  if ('photo' in patch) {
    if (patch.photo === null || patch.photo === undefined) $unset[f + 'photo'] = '';
    else if (str(patch.photo, MAX_PHOTO) && /^data:image\/(jpeg|png|webp);base64,/.test(patch.photo as string)) $set[f + 'photo'] = patch.photo;
    else return send(res, 400, { error: 'תמונה לא תקינה' });
  }
  if ('phone' in patch) {
    if (!str(patch.phone, 20) || !/^[\d\s+\-()]*$/.test(patch.phone as string)) return send(res, 400, { error: 'טלפון לא תקין' });
    $set[f + 'phone'] = patch.phone;
  }
  if ('birthDate' in patch) {
    if (!str(patch.birthDate, 10) || !/^(\d{4}-\d{2}-\d{2})?$/.test(patch.birthDate as string)) return send(res, 400, { error: 'תאריך לא תקין' });
    $set[f + 'birthDate'] = patch.birthDate;
  }
  if ('foot' in patch) {
    if (!['ימין', 'שמאל', 'שתיים', '', null].includes(patch.foot as string)) return send(res, 400, { error: 'ערך לא תקין' });
    if (patch.foot) $set[f + 'foot'] = patch.foot;
    else $unset[f + 'foot'] = '';
  }
  if ('sizes' in patch) {
    const s = patch.sizes as Record<string, unknown>;
    if (!s || typeof s !== 'object' || !['shirt', 'shorts', 'shoe'].every((k) => s[k] === undefined || str(s[k], 6))) return send(res, 400, { error: 'מידות לא תקינות' });
    $set[f + 'sizes'] = { shirt: s.shirt ?? '', shorts: s.shorts ?? '', shoe: s.shoe ?? '' };
  }
  if (!Object.keys($set).length && !Object.keys($unset).length) return send(res, 400, { error: 'אין מה לעדכן' });

  const { state } = await getState();
  if (!state?.players.some((p) => p.id === playerId)) return send(res, 404, { error: 'שחקן לא נמצא' });

  const update: Record<string, unknown> = { $inc: { rev: 1 } };
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  await (await docs()).updateOne({ _id: 'state' }, update, { arrayFilters: [{ 'p.id': playerId }] });
  send(res, 200, { ok: true });
});
