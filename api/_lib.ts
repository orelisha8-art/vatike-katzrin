import { createHmac, timingSafeEqual } from 'node:crypto';
import { MongoClient, type Db } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AppState } from '../src/types';

/*
 * צד השרת. כל הסודות מגיעים ממשתני סביבה ב-Vercel ולא נשמרים בקוד:
 *   MONGODB_URI          כתובת החיבור למסד הנתונים
 *   AUTH_SECRET          מפתח לחתימת אסימוני כניסה
 *   INITIAL_MANAGER_PIN  קוד צוות ראשוני (אפשר לשנות אחר כך מתוך האפליקציה)
 *   INITIAL_TEAM_CODE    קוד שחקנים ראשוני
 */

export type Role = 'manager' | 'team';

let clientPromise: Promise<MongoClient> | null = null;

export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI חסר');
  if (!clientPromise) clientPromise = new MongoClient(uri, { maxPoolSize: 5 }).connect();
  return (await clientPromise).db(process.env.MONGODB_DB || 'team');
}

interface AuthDoc {
  _id: 'auth';
  managerPin: string;
  teamCode: string;
  v: number;
}
interface StateDoc {
  _id: 'state';
  data: AppState;
  rev: number;
}
interface RsvpDoc {
  _id: 'rsvp';
  data: AppState['rsvp'];
}

export const docs = async () => (await db()).collection<AuthDoc | StateDoc | RsvpDoc>('docs');

export async function getAuth(): Promise<AuthDoc> {
  const c = await docs();
  const found = (await c.findOne({ _id: 'auth' })) as AuthDoc | null;
  if (found) return found;
  const fresh: AuthDoc = {
    _id: 'auth',
    managerPin: process.env.INITIAL_MANAGER_PIN || randomDigits(6),
    teamCode: process.env.INITIAL_TEAM_CODE || randomDigits(6),
    v: 1,
  };
  await c.updateOne({ _id: 'auth' }, { $setOnInsert: fresh }, { upsert: true });
  return ((await c.findOne({ _id: 'auth' })) as AuthDoc) ?? fresh;
}

const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

/** טוען את המצב. null = עוד לא הוגדרה קבוצה (המנהל הראשון ששומר יוצר אותה) */
export async function getState(): Promise<{ state: AppState | null; rsvp: AppState['rsvp']; rev: number }> {
  const c = await docs();
  const s = (await c.findOne({ _id: 'state' })) as StateDoc | null;
  const r = (await c.findOne({ _id: 'rsvp' })) as RsvpDoc | null;
  return { state: s?.data ?? null, rsvp: r?.data ?? {}, rev: s?.rev ?? 0 };
}

// ---------- אסימונים ----------
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET חסר');
  return s;
};
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function makeToken(role: Role, v: number) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 180; // חצי שנה
  const payload = `${role}.${v}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export async function readRole(req: VercelRequest): Promise<Role | null> {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [role, v, exp, sig] = parts;
  const expected = sign(`${role}.${v}.${exp}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  if (role !== 'manager' && role !== 'team') return null;
  const auth = await getAuth();
  if (Number(v) !== auth.v) return null; // הקודים הוחלפו — צריך להתחבר מחדש
  return role;
}

// ---------- הגנה מניחוש קודים ----------
const MAX_FAILS = 8;
const WINDOW_MS = 15 * 60 * 1000;

const clientIp = (req: VercelRequest) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

export async function isLocked(req: VercelRequest) {
  const a = (await db()).collection<{ _id: string; count: number; until: Date }>('attempts');
  const rec = await a.findOne({ _id: clientIp(req) });
  return !!rec && rec.count >= MAX_FAILS && rec.until > new Date();
}

export async function recordFail(req: VercelRequest) {
  const a = (await db()).collection<{ _id: string; count: number; until: Date }>('attempts');
  const ip = clientIp(req);
  const rec = await a.findOne({ _id: ip });
  const now = new Date();
  if (!rec || rec.until < now) await a.updateOne({ _id: ip }, { $set: { count: 1, until: new Date(now.getTime() + WINDOW_MS) } }, { upsert: true });
  else await a.updateOne({ _id: ip }, { $inc: { count: 1 } });
}

export async function clearFails(req: VercelRequest) {
  await (await db()).collection<{ _id: string }>('attempts').deleteOne({ _id: clientIp(req) });
}

// ---------- סינון לשחקנים ----------
/** מה ששחקן רואה: בלי כספים, משכורות, הערות צוות, סקאוטינג ומשימות הנהלה */
export function forPlayers(s: AppState): AppState {
  const c = structuredClone(s);
  c.staff = c.staff.filter((s) => s.showOnHome !== false).map(({ id, name, role, photo, playerId, phone }) => ({ id, name, role, photo, playerId, phone, salary: 0, salaryType: 'חודשי' as const }));
  c.transactions = [];
  c.prospects = [];
  c.tdTasks = [];
  c.tdNotes = '';
  c.maintenance = [];
  c.checklist = [];
  c.players = c.players.map(({ notes, ...p }) => p);
  c.matches = c.matches.map((m) => ({
    ...m,
    slots: m.lineupPublished ? m.slots : m.slots.map(() => null),
    ratings: c.settings.showRatingsToPlayers ? m.ratings : {},
    summary: undefined,
  }));
  delete (c.settings as Partial<AppState['settings']>).managerPin;
  return c;
}

// ---------- עזרי HTTP ----------
export function send(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

export function handle(fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      send(res, 500, { error: 'שגיאת שרת' });
    }
  };
}

export const SAFE_ID = /^[a-z0-9]{4,40}$/i;
