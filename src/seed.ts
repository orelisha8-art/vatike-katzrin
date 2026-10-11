import type { AppState, Match, MatchEvent, Player, Position, TeamEvent } from './types';
import { addDays, todayISO, uid } from './utils';

/** נתוני הדגמה — אפשר למחוק במסך ההגדרות ולהתחיל נקי */
export function createSeed(): AppState {
  const t = todayISO();

  const P = (name: string, number: number, position: Position, extra: Partial<Player> = {}): Player => ({
    id: uid(),
    name,
    number,
    position,
    status: 'fit',
    active: true,
    registered: true,
    medicalExpiry: addDays(t, 120 + number * 9),
    sizes: { shirt: ['M', 'L', 'XL'][number % 3], shorts: ['M', 'L'][number % 2], shoe: String(40 + (number % 6)) },
    foot: number % 4 === 0 ? 'שמאל' : 'ימין',
    phone: '05' + String(20000000 + number * 1234567).slice(0, 8),
    birthDate: `${1985 + (number % 12)}-0${1 + (number % 9)}-1${number % 9}`,
    ...extra,
  });

  const players: Player[] = [
    P('אבי כהן', 1, 'GK'),
    P('משה לוי', 22, 'GK'),
    P('יוסי מזרחי', 2, 'DF'),
    P('דני פרץ', 3, 'DF'),
    P('רונן אזולאי', 4, 'DF', { medicalExpiry: addDays(t, 12) }),
    P('עמית ביטון', 5, 'DF'),
    P('אלון דהן', 12, 'DF'),
    P('שי אברהם', 15, 'DF', { status: 'injured', statusNote: 'מתיחה בשריר אחורי', returnDate: addDays(t, 14) }),
    P('איתי פרידמן', 6, 'MF'),
    P('עידו שפירא', 8, 'MF'),
    P('נועם גבאי', 10, 'MF', { captain: true }),
    P('רועי אוחיון', 14, 'MF'),
    P('תומר חדד', 16, 'MF', { registered: false }),
    P('אורי סויסה', 18, 'MF'),
    P('ליאור עמר', 7, 'MF'),
    P('אלי אלבז', 9, 'FW'),
    P('גיא מלכה', 11, 'FW', { status: 'suspended', statusNote: 'הרחקה - 5 צהובים', returnDate: addDays(t, 6) }),
    P('עומר זוהר', 17, 'FW'),
    P('בן נחום', 19, 'FW', { medicalExpiry: addDays(t, -3) }),
    P('יונתן חורי', 20, 'FW'),
  ];
  const id = (n: number) => players.find((p) => p.number === n)!.id;

  const lineup442 = [1, 2, 4, 5, 3, 7, 6, 10, 14, 9, 11].map(id);
  const squadBase = [1, 22, 2, 3, 4, 5, 12, 6, 8, 10, 14, 7, 9, 11, 17, 19].map(id);

  const ev = (minute: number, type: MatchEvent['type'], extra: Partial<MatchEvent> = {}): MatchEvent => ({
    id: uid(),
    minute,
    type,
    ...extra,
  });

  const finished = (
    daysAgo: number,
    opponent: string,
    home: boolean,
    events: MatchEvent[],
    ratings: Record<number, number>,
    motm: number,
  ): Match => ({
    id: uid(),
    date: addDays(t, -daysAgo),
    time: '16:00',
    opponent,
    home,
    venue: home ? 'מגרש עירוני קצרין' : `מגרש ${opponent.split(' ').slice(-1)[0]}`,
    competition: 'ליגה',
    status: 'finished',
    squad: squadBase,
    formation: '4-4-2',
    slots: lineup442,
    lineupPublished: true,
    events,
    ratings: Object.fromEntries(Object.entries(ratings).map(([n, r]) => [id(Number(n)), r])),
    motm: id(motm),
    duration: 90,
  });

  const matches: Match[] = [
    finished(
      21,
      'הפועל חצור הגלילית',
      true,
      [
        ev(12, 'goal', { playerId: id(9), assistId: id(10) }),
        ev(34, 'yellow', { playerId: id(4) }),
        ev(51, 'opp_goal'),
        ev(60, 'sub', { outId: id(14), inId: id(8) }),
        ev(71, 'goal', { playerId: id(10), assistId: id(7) }),
        ev(78, 'sub', { outId: id(11), inId: id(17) }),
        ev(85, 'goal', { playerId: id(17), assistId: id(8) }),
      ],
      { 1: 7, 2: 6.5, 4: 6, 5: 7, 3: 6.5, 7: 7.5, 6: 7, 10: 8.5, 14: 6, 9: 8, 11: 6, 8: 7, 17: 7.5 },
      10,
    ),
    finished(
      14,
      'מכבי ראש פינה',
      false,
      [
        ev(23, 'opp_goal'),
        ev(40, 'goal', { playerId: id(11), assistId: id(9), penalty: true }),
        ev(55, 'yellow', { playerId: id(6) }),
        ev(65, 'sub', { outId: id(6), inId: id(8) }),
        ev(70, 'sub', { outId: id(9), inId: id(19) }),
        ev(88, 'opp_goal'),
      ],
      { 1: 6, 2: 6, 4: 6.5, 5: 6, 3: 5.5, 7: 6, 6: 5.5, 10: 6.5, 14: 6, 9: 6, 11: 7, 8: 6, 19: 5.5 },
      11,
    ),
    finished(
      7,
      'עירוני צפת',
      true,
      [
        ev(8, 'goal', { playerId: id(10) }),
        ev(27, 'goal', { playerId: id(9), assistId: id(2) }),
        ev(44, 'yellow', { playerId: id(11) }),
        ev(58, 'goal', { playerId: id(14), assistId: id(10) }),
        ev(63, 'sub', { outId: id(9), inId: id(17) }),
        ev(63, 'sub', { outId: id(2), inId: id(12) }),
        ev(80, 'opp_goal'),
      ],
      { 1: 7, 2: 7.5, 4: 7, 5: 7, 3: 7, 7: 6.5, 6: 7, 10: 9, 14: 7.5, 9: 8, 11: 6.5, 17: 6.5, 12: 6.5 },
      10,
    ),
    {
      id: uid(),
      date: addDays(t, 6),
      time: '16:30',
      opponent: 'בני ג׳ש',
      home: false,
      venue: 'מגרש ג׳ש',
      competition: 'ליגה',
      status: 'scheduled',
      squad: [],
      formation: '4-3-3',
      slots: Array(11).fill(null),
      lineupPublished: false,
      events: [],
      ratings: {},
      duration: 90,
    },
    {
      id: uid(),
      date: addDays(t, 13),
      time: '16:00',
      opponent: 'הפועל מסעדה',
      home: true,
      venue: 'מגרש עירוני קצרין',
      competition: 'גביע המחוז',
      status: 'scheduled',
      squad: [],
      formation: '4-4-2',
      slots: Array(11).fill(null),
      lineupPublished: false,
      events: [],
      ratings: {},
      duration: 90,
    },
  ];

  const training = (offset: number, attendance?: boolean): TeamEvent => ({
    id: uid(),
    type: 'training',
    title: 'אימון קבוצתי',
    date: addDays(t, offset),
    time: '19:30',
    location: 'מגרש עירוני קצרין',
    attendance: attendance
      ? Object.fromEntries(players.filter((p) => p.status === 'fit').map((p, i) => [p.id, (i + offset) % 5 !== 0]))
      : undefined,
  });

  const events: TeamEvent[] = [
    training(-10, true),
    training(-8, true),
    training(-3, true),
    training(-1, true),
    training(1),
    training(3),
    { id: uid(), type: 'meeting', title: 'שיחת קבוצה + וידאו', date: addDays(t, 4), time: '20:00', location: 'מועדון הקבוצה' },
    training(8),
    training(10),
  ];

  // תשובות הגעה לדוגמה לאירוע הקרוב ולמשחק הקרוב
  const rsvp: AppState['rsvp'] = {};
  const nextTraining = events.find((e) => e.date === addDays(t, 1))!;
  rsvp[nextTraining.id] = {};
  rsvp[matches[3].id] = {};
  players.forEach((p, i) => {
    if (p.status !== 'fit') return;
    if (i % 4 !== 3) rsvp[nextTraining.id][p.id] = i % 7 === 0 ? 'no' : 'yes';
    if (i % 3 !== 2) rsvp[matches[3].id][p.id] = i % 9 === 0 ? 'maybe' : 'yes';
  });

  const staff = [
    { id: uid(), name: 'שלמה אוחנה', role: 'מאמן ראשי', phone: '0521234567', salary: 6000, salaryType: 'חודשי' as const },
    { id: uid(), name: 'קובי בן דוד', role: 'עוזר מאמן', phone: '0539876543', salary: 2500, salaryType: 'חודשי' as const },
    { id: uid(), name: 'רפי שטרן', role: 'מאמן שוערים', phone: '0547654321', salary: 150, salaryType: 'לאימון' as const },
    { id: uid(), name: 'מירב לוי', role: 'פיזיותרפיסטית', phone: '0502223344', salary: 200, salaryType: 'למשחק' as const },
    { id: uid(), name: 'אריק נגר', role: 'מנהל טכני', phone: '0585556677', salary: 3000, salaryType: 'חודשי' as const },
  ];
  const monthStart = t.slice(0, 8) + '01';
  const lastMonth = addDays(monthStart, -20).slice(0, 8) + '01';

  return {
    version: 1,
    settings: {
      teamName: 'ותיקי קצרין',
      league: 'ליגת הוותיקים - מחוז צפון',
      color: '#fde100',
      managerPin: '1234',
      showRatingsToPlayers: true,
    },
    players,
    matches,
    events,
    rsvp,
    equipment: [
      { id: uid(), name: 'כדורי משחק (מידה 5)', category: 'כדורים', qty: 12, condition: 'תקין', location: 'מחסן' },
      { id: uid(), name: 'כדורי אימון', category: 'כדורים', qty: 25, condition: 'בלוי', location: 'מחסן', notes: 'להחליף 10 לפני העונה הבאה' },
      { id: uid(), name: 'סט מדי בית', category: 'מדים', qty: 20, condition: 'חדש', location: 'אצל המנהל הטכני' },
      { id: uid(), name: 'סט מדי חוץ', category: 'מדים', qty: 20, condition: 'תקין', location: 'אצל המנהל הטכני' },
      { id: uid(), name: 'אפודי אימון', category: 'אימון', qty: 24, condition: 'תקין', location: 'מחסן' },
      { id: uid(), name: 'קונוסים', category: 'אימון', qty: 40, condition: 'תקין', location: 'מחסן' },
      { id: uid(), name: 'מוטות סלאלום', category: 'אימון', qty: 10, condition: 'תקין', location: 'מחסן' },
      { id: uid(), name: 'שערים ניידים', category: 'אימון', qty: 2, condition: 'לתיקון', location: 'מגרש', notes: 'רשת קרועה בשער אחד' },
      { id: uid(), name: 'כפפות שוער', category: 'מדים', qty: 3, condition: 'בלוי', location: 'אצל אבי' },
      { id: uid(), name: 'תיק עזרה ראשונה', category: 'רפואי', qty: 1, condition: 'תקין', location: 'אצל הפיזיו', notes: 'לבדוק תוקף תרסיס קירור' },
    ],
    maintenance: [
      { id: uid(), title: 'כביסת מדים אחרי המשחק', due: addDays(t, 1), done: false, owner: 'אריק', priority: 'גבוהה' },
      { id: uid(), title: 'ניפוח ובדיקת כדורים', due: addDays(t, 5), done: false, owner: 'קובי', priority: 'רגילה' },
      { id: uid(), title: 'תיקון רשת שער נייד', due: addDays(t, 3), done: false, priority: 'רגילה' },
      { id: uid(), title: 'חידוש תיק עזרה ראשונה', due: addDays(t, 10), done: false, owner: 'מירב', priority: 'רגילה' },
      { id: uid(), title: 'סימון קווי מגרש אימונים', due: addDays(t, -2), done: true, owner: 'אריק' },
    ],
    staff,
    transactions: [
      ...staff
        .filter((s) => s.salaryType === 'חודשי')
        .map((s) => ({ id: uid(), date: lastMonth, kind: 'salary' as const, amount: s.salary, category: 'משכורת', staffId: s.id, paid: true })),
      ...staff
        .filter((s) => s.salaryType === 'חודשי')
        .map((s) => ({ id: uid(), date: monthStart, kind: 'salary' as const, amount: s.salary, category: 'משכורת', staffId: s.id, paid: s.role !== 'מאמן ראשי' })),
      { id: uid(), date: addDays(t, -7), kind: 'expense', amount: 600, category: 'שופטים', note: 'משחק נגד עירוני צפת', paid: true },
      { id: uid(), date: addDays(t, -12), kind: 'expense', amount: 1800, category: 'ציוד', note: '6 כדורי משחק', paid: true },
      { id: uid(), date: addDays(t, -14), kind: 'expense', amount: 900, category: 'הסעות', note: 'אוטובוס לראש פינה', paid: true },
      { id: uid(), date: addDays(t, -5), kind: 'expense', amount: 250, category: 'כביסה', paid: false },
      { id: uid(), date: addDays(t, -20), kind: 'income', amount: 10000, category: 'חסות', note: 'חסות עונתית - מוסך הגולן', paid: true },
      { id: uid(), date: addDays(t, -15), kind: 'income', amount: 4000, category: 'דמי חבר', note: '20 שחקנים × 200', paid: true },
      { id: uid(), date: addDays(t, -25), kind: 'income', amount: 8000, category: 'מועצה מקומית', note: 'תמיכה רבעונית', paid: true },
    ],
    tdTasks: [
      { id: uid(), title: 'הגשת רשימת שחקנים לאיגוד למשחק הגביע', due: addDays(t, 9), done: false, priority: 'גבוהה' },
      { id: uid(), title: 'חידוש אישורים רפואיים (2 שחקנים)', due: addDays(t, 7), done: false, priority: 'גבוהה' },
      { id: uid(), title: 'הזמנת הסעה למשחק בג׳ש', due: addDays(t, 3), done: false, priority: 'רגילה' },
      { id: uid(), title: 'כרטיס שחקן לתומר חדד', due: addDays(t, 5), done: false, priority: 'רגילה' },
      { id: uid(), title: 'תיאום מגרש אימונים לחודש הבא', due: addDays(t, 14), done: false, priority: 'נמוכה' },
    ],
    checklist: [
      'טופס הרכב חתום',
      'כרטיסי שחקנים',
      'מדים (בית + חוץ) וכפפות שוער',
      'כדורי חימום',
      'תיק עזרה ראשונה + קרח',
      'מים ובקבוקים',
      'תיאום שופט ומגיש עזרה ראשונה',
      'הסעה / קבוצת נסיעה',
    ].map((text) => ({ id: uid(), text, done: false })),
    prospects: [
      { id: uid(), name: 'מאור חביב', position: 'MF', age: 34, club: 'חופשי', rating: 4, status: 'הוזמן לאימון', notes: 'קשר טכני, שיחק בליגה ב׳' },
      { id: uid(), name: 'סהר בירנבאום', position: 'DF', age: 36, club: 'מכבי ראש פינה', rating: 3, status: 'במעקב' },
    ],
    tdNotes: '',
  };
}
