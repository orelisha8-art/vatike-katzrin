import { clearFails, getAuth, handle, isLocked, makeToken, recordFail, send } from './_lib.js';

/** כניסה עם קוד: קוד צוות → מנהל, קוד קבוצה → שחקן */
export default handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'שיטה לא נתמכת' });
  if (await isLocked(req)) return send(res, 429, { error: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות.' });
  const code = String(req.body?.code ?? '').trim();
  const auth = await getAuth();
  const role = code && code === auth.managerPin ? 'manager' : code && code === auth.teamCode ? 'team' : null;
  if (!role) {
    await recordFail(req);
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'קוד שגוי' });
  }
  await clearFails(req);
  send(res, 200, { token: makeToken(role, auth.v), role });
});
