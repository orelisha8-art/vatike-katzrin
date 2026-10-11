import { useEffect, useSyncExternalStore } from 'react';
import type { AppState, Rsvp, Session } from './types';
import { createSeed } from './seed';

/*
 * שכבת הנתונים — שני מצבים:
 *  remote: האתר רץ ב-Vercel עם שרת ומסד נתונים. כל הצוות והשחקנים רואים את אותם נתונים.
 *  local:  פיתוח מקומי בלי שרת — הנתונים נשמרים בדפדפן בלבד.
 * המסכים לא יודעים באיזה מצב הם — הם רק קוראים ל-update().
 */
export type Mode = 'loading' | 'local' | 'remote';

const LOCAL_KEY = 'team-app-state-v1';
const SESSION_KEY = 'team-app-session-v2';

let mode: Mode = 'loading';
let state: AppState | null = null;
let rev = 0;
let serverDown = false; // השרת קיים אבל מסד הנתונים לא זמין
export const isServerDown = () => serverDown;
let noTeam = false; // שרת פעיל אבל הקבוצה עוד לא הוגדרה
let sync: { saving: boolean; error: string | null; savedAt?: number } = { saving: false, error: null };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// ---------- סשן ----------
let session: Session = (() => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
})();

export function setSession(s: Session) {
  session = s;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* מצב גלישה פרטית */
  }
  gallery = null;
  if (mode === 'remote') {
    state = null;
    rev = 0;
    noTeam = false;
    pending = [];
    if (s?.token) void load();
  }
  emit();
}

export const getSession = () => session;
export const useSession = () => useSyncExternalStore(subscribe, () => session);
export const useMode = () => useSyncExternalStore(subscribe, () => mode);
export const useSync = () => useSyncExternalStore(subscribe, () => sync);
export const useNoTeam = () => useSyncExternalStore(subscribe, () => noTeam);

/** המצב הנוכחי. נקרא רק אחרי שהנתונים נטענו (App מוודא זאת) */
export const getState = () => state as AppState;
export const useApp = () => useSyncExternalStore(subscribe, getState);
export const useLoaded = () => useSyncExternalStore(subscribe, () => state !== null);

// ---------- שרת ----------
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch('/api/' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== 'login') {
    setSession(null);
  }
  if (!res.ok) throw Object.assign(new Error(body.error || 'שגיאה'), { status: res.status, body });
  return body as T;
}

export async function login(code: string): Promise<{ token: string; role: 'manager' | 'team' }> {
  return api('login', { method: 'POST', body: JSON.stringify({ code }) });
}

export const getCodes = () => api<{ managerPin: string; teamCode: string }>('codes');
export async function changeCodes(managerPin: string, teamCode: string) {
  const r = await api<{ token: string }>('codes', { method: 'POST', body: JSON.stringify({ managerPin, teamCode }) });
  setSession({ role: 'manager', token: r.token });
}

async function load() {
  try {
    const r = await api<{ state: AppState | null; rev: number; role: 'manager' | 'team' }>('state');
    if (!r.state) {
      if (r.role === 'manager') {
        // הפעלה ראשונה — יוצרים את הקבוצה עם נתוני הדגמה
        state = createSeed();
        delete (state.settings as Partial<AppState['settings']>).managerPin;
        rev = 0;
        pending = [() => {}];
        replaceRsvpNext = true;
        emit();
        void push();
      } else {
        noTeam = true;
        emit();
      }
      return;
    }
    if (pending.length || pushing) return; // לא דורסים שינויים שעוד לא נשמרו
    const changed = r.rev !== rev || JSON.stringify(r.state.rsvp) !== JSON.stringify(state?.rsvp);
    rev = r.rev;
    if (changed || !state) {
      state = r.state;
      emit();
    }
  } catch (e) {
    console.warn(e);
  }
}

let pending: ((s: AppState) => void)[] = [];
let pushing = false;
let replaceRsvpNext = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function setSync(next: Partial<typeof sync>) {
  sync = { ...sync, ...next };
  emit();
}

async function push() {
  if (pushing || !pending.length || !state) return;
  pushing = true;
  setSync({ saving: true });
  const count = pending.length;
  const replaceRsvp = replaceRsvpNext;
  try {
    const r = await api<{ rev: number }>('state', { method: 'PUT', body: JSON.stringify({ state, baseRev: rev, replaceRsvp }) });
    rev = r.rev;
    pending.splice(0, count);
    if (replaceRsvp) replaceRsvpNext = false;
    setSync({ error: null });
  } catch (e) {
    const err = e as Error & { status?: number; body?: { state: AppState | null; rev: number } };
    if (err.status === 409 && err.body?.state) {
      // מישהו אחר שמר בינתיים — מחילים את השינויים שלנו מחדש על הגרסה העדכנית
      const fresh = structuredClone(err.body.state);
      pending.forEach((fn) => fn(fresh));
      state = fresh;
      rev = err.body.rev;
      emit();
    } else {
      setSync({ error: 'השמירה נכשלה — מנסה שוב…' });
      pushing = false;
      timer = setTimeout(push, 4000);
      return;
    }
  }
  pushing = false;
  if (pending.length) void push();
  else setSync({ saving: false, savedAt: Date.now() });
}

// ---------- עדכונים ----------
export function update(fn: (draft: AppState) => void) {
  if (!state) return;
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  if (mode === 'local') persistLocal();
  else if (session?.role === 'manager') {
    pending.push(fn);
    clearTimeout(timer);
    timer = setTimeout(push, 150);
  }
  emit();
}

export function replaceState(next: AppState) {
  const copy = structuredClone(next);
  if (mode === 'remote') replaceRsvpNext = true;
  update((d) => {
    Object.keys(d).forEach((k) => delete (d as unknown as Record<string, unknown>)[k]);
    Object.assign(d, structuredClone(copy));
  });
}

export function setRsvp(itemId: string, playerId: string, value: Rsvp | null) {
  if (!state) return;
  const draft = structuredClone(state);
  draft.rsvp[itemId] = draft.rsvp[itemId] || {};
  if (value) draft.rsvp[itemId][playerId] = value;
  else delete draft.rsvp[itemId][playerId];
  state = draft;
  emit();
  if (mode === 'local') persistLocal();
  else
    api('rsvp', { method: 'POST', body: JSON.stringify({ itemId, playerId, value }) }).catch(() => {
      setSync({ error: 'אישור ההגעה לא נשמר — בדוק חיבור ונסה שוב' });
      setTimeout(() => setSync({ error: null }), 5000);
    });
}

/** מחיקת שחקן לצמיתות — כולל מסגלים, הרכבים, ציונים ואישורי הגעה */
export function deletePlayer(id: string) {
  update((s) => {
    s.players = s.players.filter((p) => p.id !== id);
    s.matches.forEach((m) => {
      m.squad = m.squad.filter((x) => x !== id);
      m.slots = m.slots.map((x) => (x === id ? null : x));
      delete m.ratings[id];
      if (m.motm === id) delete m.motm;
    });
    Object.values(s.rsvp).forEach((r) => delete r[id]);
  });
}

// ---------- מצב מקומי ----------
function persistLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    alert('השמירה נכשלה — ייתכן שהזיכרון במכשיר מלא (למשל בגלל תמונות גדולות).');
  }
}

function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* נתונים פגומים */
  }
  return createSeed();
}

// ---------- לא לאבד שינויים ברענון / סגירה ----------
const flush = () => {
  (document.activeElement as HTMLElement | null)?.blur?.(); // שומר שדות טקסט שעדיין בעריכה
  clearTimeout(timer);
  void push();
};
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && mode === 'remote' && flush());
window.addEventListener('beforeunload', (e) => {
  if (mode !== 'remote') return;
  flush();
  if (pending.length || pushing) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---------- אתחול ----------
(async () => {
  let remote = false;
  try {
    const r = await fetch('/api/health');
    remote = (r.headers.get('content-type') || '').includes('json');
    serverDown = remote && !r.ok;
  } catch {
    /* אין שרת */
  }
  mode = remote ? 'remote' : 'local';
  if (mode === 'local') {
    state = loadLocal();
    window.addEventListener('storage', (e) => {
      if (e.key === LOCAL_KEY && e.newValue) {
        state = JSON.parse(e.newValue);
        emit();
      }
    });
  } else {
    if (session && !session.token) session = null; // סשן ישן ממצב מקומי
    if (session?.token) await load();
    // רענון כדי לראות שינויים של אחרים
    setInterval(() => session?.token && document.visibilityState === 'visible' && load(), 20000);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && session?.token && load());
  }
  emit();
})();

/** שחקן מעדכן את הפרטים האישיים שלו (תמונה, טלפון, תאריך לידה, רגל, מידות) */
export type ProfilePatch = Partial<Pick<import('./types').Player, 'photo' | 'phone' | 'birthDate' | 'foot' | 'sizes'>>;

export async function updateProfile(playerId: string, patch: ProfilePatch) {
  if (!state) return;
  const draft = structuredClone(state);
  const p = draft.players.find((x) => x.id === playerId);
  if (!p) return;
  Object.assign(p, patch);
  if ('photo' in patch && !patch.photo) delete p.photo;
  state = draft;
  emit();
  if (mode === 'local') return persistLocal();
  const body = { ...patch, ...('photo' in patch ? { photo: patch.photo ?? null } : {}) };
  await api('profile', { method: 'POST', body: JSON.stringify({ playerId, patch: body }) });
}

// ---------- גלריה (נטענת בנפרד מהנתונים — לא מכבידה על הסנכרון) ----------
export type Photo = { id: string; src: string; caption: string };
const GALLERY_KEY = 'team-app-gallery-v1';
let gallery: Photo[] | null = null;
let galleryLoading = false;

const saveLocalGallery = () => {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery ?? []));
  } catch {
    alert('אין מספיק מקום במכשיר לתמונות נוספות');
  }
};

export async function loadGallery(force = false) {
  if (galleryLoading || (gallery && !force)) return;
  galleryLoading = true;
  try {
    if (mode === 'local') gallery = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
    else gallery = (await api<{ photos: Photo[] }>('gallery')).photos;
  } catch {
    gallery = gallery ?? [];
  }
  galleryLoading = false;
  emit();
}

export const useGallery = () => {
  const g = useSyncExternalStore(subscribe, () => gallery);
  const m = useSyncExternalStore(subscribe, () => mode);
  useEffect(() => {
    if (g === null && m !== 'loading' && (m === 'local' || session?.token)) void loadGallery();
  }, [g, m]);
  return g ?? [];
};

export async function addPhoto(src: string, caption = '') {
  if (mode === 'local') {
    gallery = [{ id: Math.random().toString(36).slice(2, 12), src, caption }, ...(gallery ?? [])];
    saveLocalGallery();
  } else {
    const { id } = await api<{ id: string }>('gallery', { method: 'POST', body: JSON.stringify({ src, caption }) });
    gallery = [{ id, src, caption }, ...(gallery ?? [])];
  }
  emit();
}

export async function captionPhoto(id: string, caption: string) {
  gallery = (gallery ?? []).map((p) => (p.id === id ? { ...p, caption } : p));
  emit();
  if (mode === 'local') saveLocalGallery();
  else await api('gallery', { method: 'PATCH', body: JSON.stringify({ id, caption }) });
}

export async function removePhoto(id: string) {
  gallery = (gallery ?? []).filter((p) => p.id !== id);
  emit();
  if (mode === 'local') saveLocalGallery();
  else await api('gallery?id=' + encodeURIComponent(id), { method: 'DELETE' });
}
