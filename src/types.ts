export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type PlayerStatus = 'fit' | 'injured' | 'suspended' | 'away';

export interface Player {
  id: string;
  name: string;
  number?: number;
  position: Position;
  photo?: string; // data URL (מוקטן)
  phone?: string;
  birthDate?: string;
  foot?: 'ימין' | 'שמאל' | 'שתיים';
  captain?: boolean;
  status: PlayerStatus;
  statusNote?: string;
  returnDate?: string;
  medicalExpiry?: string; // תוקף אישור רפואי
  registered?: boolean; // כרטיס שחקן באיגוד
  sizes?: { shirt?: string; shorts?: string; shoe?: string };
  notes?: string;
  active: boolean;
}

export type MatchEventType = 'goal' | 'opp_goal' | 'yellow' | 'red' | 'sub';

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  playerId?: string; // כובש / מקבל כרטיס
  assistId?: string;
  penalty?: boolean;
  outId?: string; // חילוף - יוצא
  inId?: string; // חילוף - נכנס
}

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  opponent: string;
  home: boolean;
  venue?: string;
  competition: string;
  status: 'scheduled' | 'live' | 'finished';
  squad: string[]; // שחקנים שזומנו
  formation: string;
  slots: (string | null)[]; // הרכב לפי עמדות המערך
  lineupPublished: boolean;
  events: MatchEvent[];
  ratings: Record<string, number>;
  motm?: string;
  live?: { half: 1 | 2; startedAt: number; paused?: boolean };
  duration: number;
  notes?: string; // הערות לפני המשחק (התכנסות, הסעה…)
  summary?: string; // סיכום המאמן
}

export type EventType = 'training' | 'meeting' | 'other';

export interface TeamEvent {
  id: string;
  type: EventType;
  title: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
  attendance?: Record<string, boolean>;
}

export type Rsvp = 'yes' | 'no' | 'maybe';

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  qty: number;
  condition: 'חדש' | 'תקין' | 'בלוי' | 'לתיקון';
  location?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  done: boolean;
  owner?: string;
  priority?: 'גבוהה' | 'רגילה' | 'נמוכה';
  notes?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone?: string;
  salary: number;
  salaryType: 'חודשי' | 'לאימון' | 'למשחק';
  photo?: string;
}

export interface Transaction {
  id: string;
  date: string;
  kind: 'salary' | 'expense' | 'income';
  amount: number;
  category: string;
  staffId?: string;
  note?: string;
  paid: boolean;
}

export interface Prospect {
  id: string;
  name: string;
  position: Position;
  age?: number;
  club?: string;
  phone?: string;
  rating: number; // 1-5 כוכבים
  status: 'במעקב' | 'הוזמן לאימון' | 'בשיחות' | 'הצטרף' | 'נדחה';
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Settings {
  teamName: string;
  league: string;
  logo?: string;
  color: string;
  managerPin?: string; // רק במצב מקומי. באתר החי הקודים שמורים בשרת בלבד
  showRatingsToPlayers: boolean;
  teamPhoto?: string; // תמונת קבוצה — מוצגת רק אחרי כניסה
}

export interface AppState {
  version: 1;
  settings: Settings;
  players: Player[];
  matches: Match[];
  events: TeamEvent[];
  rsvp: Record<string, Record<string, Rsvp>>; // itemId -> playerId -> תשובה
  equipment: EquipmentItem[];
  maintenance: Task[];
  staff: Staff[];
  transactions: Transaction[];
  tdTasks: Task[];
  checklist: ChecklistItem[];
  prospects: Prospect[];
  tdNotes: string;
}

export type Session = { role: 'manager'; token?: string } | { role: 'player'; playerId: string; token?: string } | null;
