import { docs, getAuth, handle, makeToken, readRole, send } from './_lib.js';

/** החלפת קודי הכניסה (מנהלים בלבד). מנתק את כל המכשירים המחוברים. */
export default handle(async (req, res) => {
  const role = await readRole(req);
  if (role !== 'manager') return send(res, 403, { error: 'אין הרשאה' });
  const auth = await getAuth();

  if (req.method === 'GET') return send(res, 200, { managerPin: auth.managerPin, teamCode: auth.teamCode });

  if (req.method === 'POST') {
    const managerPin = String(req.body?.managerPin ?? auth.managerPin).trim();
    const teamCode = String(req.body?.teamCode ?? auth.teamCode).trim();
    if (!/^\d{6,10}$/.test(managerPin) || !/^\d{4,10}$/.test(teamCode)) return send(res, 400, { error: 'קוד צוות: 6–10 ספרות. קוד שחקנים: 4–10 ספרות.' });
    if (managerPin === teamCode) return send(res, 400, { error: 'שני הקודים חייבים להיות שונים' });
    const v = auth.v + 1;
    await (await docs()).updateOne({ _id: 'auth' }, { $set: { managerPin, teamCode, v } });
    return send(res, 200, { token: makeToken('manager', v) });
  }

  send(res, 405, { error: 'שיטה לא נתמכת' });
});
