import type { AppState, Match, Player, Position, PlayerStatus } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- תאריכים ----------
export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toISO(d);
};
export const daysBetween = (fromISO: string, toISOStr: string) =>
  Math.round((new Date(toISOStr + 'T12:00:00').getTime() - new Date(fromISO + 'T12:00:00').getTime()) / 86400000);

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const weekday = (iso: string) => WEEKDAYS[new Date(iso + 'T12:00:00').getDay()];
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}`;
};
export const fullDate = (iso: string) => `יום ${weekday(iso)}, ${shortDate(iso)}`;
export const relDay = (iso: string) => {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  if (diff === -1) return 'אתמול';
  if (diff > 1 && diff < 7) return `יום ${weekday(iso)}`;
  return fullDate(iso);
};
export const age = (birth?: string) => {
  if (!birth) return undefined;
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
export const money = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL');

// ---------- שחקנים ----------
export const POSITIONS: Record<Position, string> = { GK: 'שוער', DF: 'הגנה', MF: 'קישור', FW: 'התקפה' };
export const POS_ORDER: Position[] = ['GK', 'DF', 'MF', 'FW'];
export const STATUS: Record<PlayerStatus, { label: string; color: string }> = {
  fit: { label: 'כשיר', color: 'var(--ok)' },
  injured: { label: 'פצוע', color: 'var(--bad)' },
  suspended: { label: 'מורחק', color: 'var(--warn)' },
  away: { label: 'לא זמין', color: 'var(--muted)' },
};
export const byNumber = (a: Player, b: Player) =>
  POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || (a.number ?? 99) - (b.number ?? 99);

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

export const firstName = (name: string) => name.split(' ')[0];
export const lastName = (name: string) => {
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : name;
};

// ---------- מערכים ----------
type Slot = { x: number; y: number; label: string };
const GK: Slot = { x: 50, y: 90, label: 'שוער' };
const back4: Slot[] = [
  { x: 85, y: 70, label: 'מגן ימני' },
  { x: 62, y: 74, label: 'בלם' },
  { x: 38, y: 74, label: 'בלם' },
  { x: 15, y: 70, label: 'מגן שמאלי' },
];
const back3: Slot[] = [
  { x: 74, y: 73, label: 'בלם' },
  { x: 50, y: 76, label: 'בלם' },
  { x: 26, y: 73, label: 'בלם' },
];
const back5: Slot[] = [
  { x: 92, y: 62, label: 'מגן ימני' },
  { x: 72, y: 73, label: 'בלם' },
  { x: 50, y: 76, label: 'בלם' },
  { x: 28, y: 73, label: 'בלם' },
  { x: 8, y: 62, label: 'מגן שמאלי' },
];
const front2: Slot[] = [
  { x: 64, y: 18, label: 'חלוץ' },
  { x: 36, y: 18, label: 'חלוץ' },
];
const front3: Slot[] = [
  { x: 82, y: 22, label: 'כנף ימין' },
  { x: 50, y: 15, label: 'חלוץ' },
  { x: 18, y: 22, label: 'כנף שמאל' },
];

export const FORMATIONS: Record<string, Slot[]> = {
  '4-4-2': [
    GK,
    ...back4,
    { x: 85, y: 44, label: 'קשר ימני' },
    { x: 62, y: 48, label: 'קשר' },
    { x: 38, y: 48, label: 'קשר' },
    { x: 15, y: 44, label: 'קשר שמאלי' },
    ...front2,
  ],
  '4-3-3': [
    GK,
    ...back4,
    { x: 72, y: 46, label: 'קשר' },
    { x: 50, y: 52, label: 'קשר אחורי' },
    { x: 28, y: 46, label: 'קשר' },
    ...front3,
  ],
  '4-2-3-1': [
    GK,
    ...back4,
    { x: 64, y: 55, label: 'קשר אחורי' },
    { x: 36, y: 55, label: 'קשר אחורי' },
    { x: 82, y: 35, label: 'כנף ימין' },
    { x: 50, y: 36, label: 'קשר התקפי' },
    { x: 18, y: 35, label: 'כנף שמאל' },
    { x: 50, y: 15, label: 'חלוץ' },
  ],
  '4-1-4-1': [
    GK,
    ...back4,
    { x: 50, y: 57, label: 'קשר אחורי' },
    { x: 85, y: 38, label: 'קשר ימני' },
    { x: 62, y: 41, label: 'קשר' },
    { x: 38, y: 41, label: 'קשר' },
    { x: 15, y: 38, label: 'קשר שמאלי' },
    { x: 50, y: 15, label: 'חלוץ' },
  ],
  '3-5-2': [
    GK,
    ...back3,
    { x: 90, y: 44, label: 'כנף ימין' },
    { x: 68, y: 49, label: 'קשר' },
    { x: 50, y: 55, label: 'קשר אחורי' },
    { x: 32, y: 49, label: 'קשר' },
    { x: 10, y: 44, label: 'כנף שמאל' },
    ...front2,
  ],
  '3-4-3': [
    GK,
    ...back3,
    { x: 88, y: 46, label: 'קשר ימני' },
    { x: 62, y: 50, label: 'קשר' },
    { x: 38, y: 50, label: 'קשר' },
    { x: 12, y: 46, label: 'קשר שמאלי' },
    ...front3,
  ],
  '5-3-2': [
    GK,
    ...back5,
    { x: 72, y: 46, label: 'קשר' },
    { x: 50, y: 50, label: 'קשר' },
    { x: 28, y: 46, label: 'קשר' },
    ...front2,
  ],
};

export const starters = (m: Match) => m.slots.filter(Boolean) as string[];
export const bench = (m: Match) => m.squad.filter((id) => !m.slots.includes(id));

export const countedScore = (m: Match) => ({
  us: m.events.filter((e) => e.type === 'goal').length,
  them: m.events.filter((e) => e.type === 'opp_goal').length,
});
export const score = (m: Match) => m.final ?? countedScore(m);

export const resultOf = (m: Match): 'W' | 'D' | 'L' | null => {
  if (m.status !== 'finished') return null;
  const s = score(m);
  return s.us > s.them ? 'W' : s.us < s.them ? 'L' : 'D';
};

const sortedEvents = (m: Match) => [...m.events].sort((a, b) => a.minute - b.minute);

/** השחקנים שעל המגרש כרגע (לפי הרכב פותח, חילופים וכרטיסים אדומים) */
export const onPitch = (m: Match) => {
  const on = new Set(starters(m));
  for (const e of sortedEvents(m)) {
    if (e.type === 'sub') {
      if (e.outId) on.delete(e.outId);
      if (e.inId) on.add(e.inId);
    }
    if (e.type === 'red' && e.playerId) on.delete(e.playerId);
  }
  return [...on];
};

export const minutesPlayed = (m: Match, pid: string) => {
  let since: number | null = m.slots.includes(pid) ? 0 : null;
  let total = 0;
  for (const e of sortedEvents(m)) {
    if (e.type === 'sub' && e.outId === pid && since !== null) {
      total += e.minute - since;
      since = null;
    } else if (e.type === 'sub' && e.inId === pid) {
      since = e.minute;
    } else if (e.type === 'red' && e.playerId === pid && since !== null) {
      total += e.minute - since;
      since = null;
    }
  }
  const end = m.status === 'live' ? Math.min(liveMinute(m), m.duration) : m.duration;
  if (since !== null) total += Math.max(end - since, 0);
  return Math.max(total, 0);
};

export const liveMinute = (m: Match) => {
  if (!m.live) return 1;
  const elapsed = Math.floor((Date.now() - m.live.startedAt) / 60000) + 1;
  const half = m.duration / 2;
  return (m.live.half - 1) * half + elapsed;
};

export interface PlayerStats {
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  avgRating: number | null;
  motm: number;
  ratings: { matchId: string; rating: number }[];
}

export const playerStats = (state: AppState, pid: string): PlayerStats => {
  const s: PlayerStats = { apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0, avgRating: null, motm: 0, ratings: [] };
  const played = state.matches
    .filter((m) => m.status !== 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const m of played) {
    const mins = minutesPlayed(m, pid);
    const subIn = m.events.some((e) => e.type === 'sub' && e.inId === pid);
    const noLineup = !m.slots.some(Boolean);
    if (m.slots.includes(pid) || subIn || (noLineup && m.squad.includes(pid))) s.apps++;
    if (m.slots.includes(pid)) s.starts++;
    s.minutes += mins;
    for (const e of m.events) {
      if (e.type === 'goal' && e.playerId === pid) s.goals++;
      if (e.type === 'goal' && e.assistId === pid) s.assists++;
      if (e.type === 'yellow' && e.playerId === pid) s.yellow++;
      if (e.type === 'red' && e.playerId === pid) s.red++;
    }
    if (m.ratings[pid]) s.ratings.push({ matchId: m.id, rating: m.ratings[pid] });
    if (m.motm === pid) s.motm++;
  }
  if (s.ratings.length) s.avgRating = s.ratings.reduce((a, r) => a + r.rating, 0) / s.ratings.length;
  return s;
};

export const attendanceRate = (state: AppState, pid: string) => {
  const marked = state.events.filter((e) => e.type === 'training' && e.attendance && Object.keys(e.attendance).length);
  if (!marked.length) return null;
  const present = marked.filter((e) => e.attendance![pid]).length;
  return Math.round((present / marked.length) * 100);
};

// ---------- תמונות ----------
export const resizeImage = (file: File, max = 320, square = true): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // חיתוך לריבוע מהמרכז והקטנה
      if (!square) {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        return resolve(c.toDataURL('image/jpeg', 0.8));
      }
      const side = Math.min(img.width, img.height);
      const out = Math.min(max, side);
      const c = document.createElement('canvas');
      c.width = out;
      c.height = out;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });

// ---------- וואטסאפ ----------
export const shareWhatsApp = (text: string) => {
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
};
export const whatsappTo = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  return 'https://wa.me/' + intl;
};

/** שעה להצגה — אם עוד לא נקבעה */
export const hhmm = (t?: string) => t || 'שעה תיקבע';
