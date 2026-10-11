import { db, handle, readRole, SAFE_ID, send } from './_lib.js';

/**
 * גלריית תמונות — כל תמונה במסמך נפרד (לא מכבידה על טעינת הנתונים הרגילה).
 * GET: כל המחוברים · POST/DELETE: צוות בלבד
 */
interface Photo {
  _id: string;
  src: string;
  caption?: string;
  createdAt: Date;
}
const MAX = 900_000; // ~900KB — התמונות מוקטנות בדפדפן לפני ההעלאה

export default handle(async (req, res) => {
  const role = await readRole(req);
  if (!role) return send(res, 401, { error: 'צריך להתחבר' });
  const col = (await db()).collection<Photo>('gallery');

  if (req.method === 'GET') {
    const photos = await col.find({}).sort({ createdAt: -1 }).limit(200).toArray();
    return send(res, 200, { photos: photos.map((p) => ({ id: p._id, src: p.src, caption: p.caption ?? '' })) });
  }

  if (role !== 'manager') return send(res, 403, { error: 'אין הרשאה' });

  if (req.method === 'POST') {
    const { src, caption } = (req.body ?? {}) as { src?: string; caption?: string };
    if (typeof src !== 'string' || src.length > MAX || !/^data:image\/(jpeg|png|webp);base64,/.test(src)) return send(res, 400, { error: 'תמונה לא תקינה או גדולה מדי' });
    if (caption !== undefined && (typeof caption !== 'string' || caption.length > 140)) return send(res, 400, { error: 'כיתוב ארוך מדי' });
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    await col.insertOne({ _id: id, src, caption: caption?.trim() || undefined, createdAt: new Date() });
    return send(res, 200, { id });
  }

  if (req.method === 'PATCH') {
    const { id, caption } = (req.body ?? {}) as { id?: string; caption?: string };
    if (!SAFE_ID.test(String(id)) || typeof caption !== 'string' || caption.length > 140) return send(res, 400, { error: 'נתונים לא תקינים' });
    await col.updateOne({ _id: String(id) }, { $set: { caption: caption.trim() } });
    return send(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id ?? '');
    if (!SAFE_ID.test(id)) return send(res, 400, { error: 'מזהה לא תקין' });
    await col.deleteOne({ _id: id });
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: 'שיטה לא נתמכת' });
});
