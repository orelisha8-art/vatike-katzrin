import { getState, handle, send } from './_lib.js';

/** בדיקת חיים + שם הקבוצה למסך הכניסה (מידע ציבורי בלבד) */
export default handle(async (_req, res) => {
  const { state } = await getState();
  send(res, 200, { ok: true, teamName: state?.settings.teamName ?? 'ניהול קבוצה', league: state?.settings.league ?? '', color: state?.settings.color });
});
