import { useEffect, useState, type ReactNode } from 'react';
import { isServerDown, login, setSession, useApp, useLoaded, useMode, useNoTeam, useSession, useSync } from './store';
import { go, useRoute } from './router';
import { Avatar, Icon } from './components/ui';
import { byNumber } from './utils';
import Dashboard from './pages/Dashboard';
import Squad from './pages/Squad';
import PlayerProfile from './pages/PlayerProfile';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Schedule from './pages/Schedule';
import Equipment from './pages/Equipment';
import Finance from './pages/Finance';
import TechDirector from './pages/TechDirector';
import SettingsPage from './pages/Settings';
import Stats from './pages/Stats';
import More from './pages/More';
import PlayerHome from './pages/PlayerHome';

/** צבע הקבוצה + צבע טקסט קריא עליו (שחור על צבע בהיר, לבן על כהה) */
function applyBrand(color: string) {
  const root = document.documentElement.style;
  root.setProperty('--brand', color);
  const n = parseInt(color.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  root.setProperty('--on-brand', 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#0a0a0a' : '#ffffff');
}

type NavItem = { path: string; label: string; icon: string };

const MANAGER_NAV: NavItem[] = [
  { path: '', label: 'בית', icon: 'home' },
  { path: 'squad', label: 'סגל', icon: 'users' },
  { path: 'matches', label: 'משחקים', icon: 'ball' },
  { path: 'schedule', label: 'לו״ז', icon: 'calendar' },
  { path: 'more', label: 'עוד', icon: 'grid' },
];
const MANAGER_EXTRA: NavItem[] = [
  { path: 'stats', label: 'סטטיסטיקה', icon: 'trophy' },
  { path: 'equipment', label: 'ציוד ואחזקה', icon: 'box' },
  { path: 'finance', label: 'כספים ומשכורות', icon: 'wallet' },
  { path: 'td', label: 'מנהל טכני', icon: 'clipboard' },
  { path: 'settings', label: 'הגדרות', icon: 'settings' },
];
const PLAYER_NAV: NavItem[] = [
  { path: '', label: 'בית', icon: 'home' },
  { path: 'schedule', label: 'לו״ז', icon: 'calendar' },
  { path: 'matches', label: 'משחקים', icon: 'ball' },
  { path: 'squad', label: 'הקבוצה', icon: 'users' },
  { path: 'stats', label: 'טבלאות', icon: 'trophy' },
];

export default function App() {
  const mode = useMode();
  const session = useSession();
  const loaded = useLoaded();
  const noTeam = useNoTeam();
  if (mode === 'loading') return <Splash />;
  if (!session) return <Login />;
  if (!loaded) return noTeam ? <Splash text="הקבוצה עוד לא הוגדרה. מנהל צריך להתחבר ראשון עם קוד הצוות." logout /> : <Splash />;
  return <TeamApp />;
}

function Splash({ text, logout }: { text?: string; logout?: boolean }) {
  return (
    <div className="login">
      <div className="login-card splash">
        <div className="login-logo-ph spin"><Icon name="ball" size={40} /></div>
        <p className="muted">{text ?? 'טוען…'}</p>
        {logout && <button className="btn" onClick={() => setSession(null)}>חזרה</button>}
      </div>
    </div>
  );
}

function SyncBadge() {
  const sync = useSync();
  const [, force] = useState(0);
  useEffect(() => {
    if (!sync.savedAt) return;
    const t = setTimeout(() => force((x) => x + 1), 1600);
    return () => clearTimeout(t);
  }, [sync.savedAt]);
  if (sync.error) return <span className="sync-badge error">{sync.error}</span>;
  if (sync.saving) return <span className="sync-badge">שומר…</span>;
  if (sync.savedAt && Date.now() - sync.savedAt < 1500) return <span className="sync-badge saved">נשמר ✓</span>;
  return null;
}

function TeamApp() {
  const state = useApp();
  const session = useSession();
  const route = useRoute();

  useEffect(() => {
    applyBrand(state.settings.color);
    document.title = state.settings.teamName;
  }, [state.settings.color, state.settings.teamName]);

  // שחקן שנמחק — ניתוק
  const sessionPlayer = session?.role === 'player' ? state.players.find((p) => p.id === session.playerId) : undefined;
  if (!session) return null;
  if (session.role === 'player' && !sessionPlayer) return <PickPlayer token={session.token} />;

  const isManager = session.role === 'manager';
  const nav = isManager ? MANAGER_NAV : PLAYER_NAV;
  const [section, id] = route;
  const active = section ?? '';
  const activeTab = isManager && MANAGER_EXTRA.some((n) => n.path === active) ? 'more' : active;

  let page;
  switch (section) {
    case undefined:
      page = isManager ? <Dashboard /> : <PlayerHome playerId={sessionPlayer!.id} />;
      break;
    case 'squad':
      page = id ? <PlayerProfile id={id} manager={isManager} meId={sessionPlayer?.id} /> : <Squad manager={isManager} />;
      break;
    case 'matches':
      page = id ? <MatchDetail id={id} manager={isManager} meId={sessionPlayer?.id} /> : <Matches manager={isManager} />;
      break;
    case 'schedule':
      page = <Schedule manager={isManager} meId={sessionPlayer?.id} />;
      break;
    case 'stats':
      page = <Stats />;
      break;
    case 'me':
      page = <PlayerProfile id={sessionPlayer!.id} manager={false} meId={sessionPlayer!.id} />;
      break;
    default:
      if (!isManager) page = <PlayerHome playerId={sessionPlayer!.id} />;
      else if (section === 'more') page = <More items={MANAGER_EXTRA} />;
      else if (section === 'equipment') page = <Equipment />;
      else if (section === 'finance') page = <Finance />;
      else if (section === 'td') page = <TechDirector />;
      else if (section === 'settings') page = <SettingsPage />;
      else page = <Dashboard />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {state.settings.logo ? <img src={state.settings.logo} alt="" className="brand-logo" /> : <div className="brand-logo brand-logo-ph"><Icon name="ball" size={22} /></div>}
          <div>
            <strong>{state.settings.teamName}</strong>
            <small>{isManager ? 'צוות ניהולי' : sessionPlayer!.name}</small>
          </div>
        </div>
        <nav>
          {[...nav, ...(isManager ? MANAGER_EXTRA : [])]
            .filter((n) => n.path !== 'more')
            .map((n) => (
              <a key={n.path} href={'#/' + n.path} className={active === n.path ? 'active' : ''}>
                <Icon name={n.icon} />
                {n.label}
              </a>
            ))}
          {!isManager && (
            <a href="#/me" className={active === 'me' ? 'active' : ''}>
              <Icon name="star" />
              הפרופיל שלי
            </a>
          )}
        </nav>
        <button className="sidebar-logout" onClick={() => setSession(null)}>
          <Icon name="logout" /> החלפת משתמש
        </button>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="brand">
            {state.settings.logo ? <img src={state.settings.logo} alt="" className="brand-logo" /> : <div className="brand-logo brand-logo-ph"><Icon name="ball" size={20} /></div>}
            <strong>{state.settings.teamName}</strong>
          </div>
          {isManager ? (
            <span className="role-chip">צוות</span>
          ) : (
            <button className="role-chip player" onClick={() => go('me')}>
              <Avatar player={sessionPlayer} size={26} />
              {sessionPlayer!.name.split(' ')[0]}
            </button>
          )}
          <button className="icon-btn" onClick={() => setSession(null)} aria-label="החלפת משתמש">
            <Icon name="logout" size={20} />
          </button>
        </div>
        <SyncBadge />
        <main className="content">{page}</main>
      </div>

      <nav className="bottom-nav">
        {nav.map((n) => (
          <a key={n.path} href={'#/' + n.path} className={activeTab === n.path ? 'active' : ''}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function Login() {
  const mode = useMode();
  const [info, setInfo] = useState<{ teamName: string; league: string }>({ teamName: '', league: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [localMode, setLocalMode] = useState<'choose' | 'manager'>('choose');

  useEffect(() => {
    if (mode !== 'remote') return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        setInfo({ teamName: d.teamName, league: d.league });
        if (d.color) applyBrand(d.color);
        document.title = d.teamName;
      })
      .catch(() => {});
  }, [mode]);

  const brand = (name: string, league: string) => (
    <div className="login-brand">
      <div className="login-logo-ph">
        <Icon name="ball" size={40} />
      </div>
      <h1>{name || 'ניהול קבוצה'}</h1>
      <p>{league}</p>
    </div>
  );

  if (mode === 'local') return <LocalLogin brand={brand} localMode={localMode} setLocalMode={setLocalMode} />;

  const submit = async () => {
    if (!code || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await login(code);
      setSession(r.role === 'manager' ? { role: 'manager', token: r.token } : { role: 'player', playerId: '', token: r.token });
      go('');
    } catch (e) {
      setError((e as Error).message);
      setCode('');
    }
    setBusy(false);
  };

  return (
    <div className="login">
      <div className="login-card">
        {brand(info.teamName, info.league)}
        <div className="login-pin">
          {isServerDown() && <p className="server-down">השרת לא זמין כרגע (מסד הנתונים כבוי). נסו שוב בעוד כמה דקות.</p>}
          <p>הזן קוד כניסה</p>
          <input
            className={'pin-input' + (error ? ' shake' : '')}
            inputMode="numeric"
            type="password"
            autoFocus
            value={code}
            maxLength={10}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            aria-label="קוד כניסה"
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-lg full" onClick={submit} disabled={!code || busy}>
            {busy ? 'בודק…' : 'כניסה'}
          </button>
          <p className="muted small">שחקנים — קוד הקבוצה. צוות — קוד הצוות. את הקודים מקבלים מהמנהל.</p>
        </div>
      </div>
    </div>
  );
}

function LocalLogin({
  brand,
  localMode,
  setLocalMode,
}: {
  brand: (n: string, l: string) => ReactNode;
  localMode: 'choose' | 'manager';
  setLocalMode: (m: 'choose' | 'manager') => void;
}) {
  const state = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const expected = state.settings.managerPin ?? '1234';
  return (
    <div className="login">
      <div className="login-card">
        {brand(state.settings.teamName, state.settings.league)}
        {localMode === 'choose' ? (
          <div className="login-choices">
            <button className="login-choice" onClick={() => setLocalMode('manager')}>
              <Icon name="clipboard" size={30} />
              <strong>צוות ניהולי</strong>
              <small>מאמנים, מנהל טכני והנהלה</small>
            </button>
            <button className="login-choice" onClick={() => setSession({ role: 'player', playerId: '' })}>
              <Icon name="users" size={30} />
              <strong>שחקן</strong>
              <small>לו״ז, אישור הגעה, הרכבים וסטטיסטיקה</small>
            </button>
          </div>
        ) : (
          <div className="login-pin">
            <p>הזן קוד צוות</p>
            <input
              className={'pin-input' + (error ? ' shake' : '')}
              inputMode="numeric"
              type="password"
              autoFocus
              value={pin}
              maxLength={8}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                setPin(v);
                setError(false);
                if (v.length >= expected.length) {
                  if (v === expected) {
                    setSession({ role: 'manager' });
                    go('');
                  } else {
                    setError(true);
                    setTimeout(() => setPin(''), 400);
                  }
                }
              }}
              aria-label="קוד צוות"
            />
            {error && <p className="error-text">קוד שגוי</p>}
            <p className="muted small">מצב מקומי · קוד ברירת מחדל: 1234</p>
            <button className="btn btn-ghost" onClick={() => setLocalMode('choose')}>
              חזרה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PickPlayer({ token }: { token?: string }) {
  const state = useApp();
  const [q, setQ] = useState('');
  const players = state.players.filter((p) => p.active && p.name.includes(q.trim())).sort(byNumber);
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-players">
          <h1>{state.settings.teamName}</h1>
          <p>מי אתה?</p>
          <input className="input" placeholder="חיפוש שם…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="login-player-list">
            {players.map((p) => (
              <button
                key={p.id}
                className="login-player"
                onClick={() => {
                  setSession({ role: 'player', playerId: p.id, token });
                  go('');
                }}
              >
                <Avatar player={p} size={40} />
                <span>{p.name}</span>
                <small>{p.number}</small>
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={() => setSession(null)}>
            חזרה
          </button>
        </div>
      </div>
    </div>
  );
}
