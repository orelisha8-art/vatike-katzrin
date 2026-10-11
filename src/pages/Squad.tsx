import { useState } from 'react';
import { useApp } from '../store';
import { go } from '../router';
import { Avatar, Empty, Fab, Icon, PageHead, Segmented } from '../components/ui';
import PlayerForm from '../components/PlayerForm';
import { FutCard } from '../components/club';
import { byNumber, playerStats, POS_ORDER, POSITIONS, STATUS } from '../utils';
import type { Position } from '../types';

export default function Squad({ manager }: { manager: boolean }) {
  const state = useApp();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | Position | 'out'>('all');
  const [showInactive, setShowInactive] = useState(false);

  const list = state.players
    .filter((p) => (showInactive ? !p.active : p.active))
    .filter((p) => !q || p.name.includes(q.trim()) || String(p.number) === q.trim())
    .filter((p) => (filter === 'all' ? true : filter === 'out' ? p.status !== 'fit' : p.position === filter))
    .sort(byNumber);

  const groups = POS_ORDER.map((pos) => ({ pos, players: list.filter((p) => p.position === pos) })).filter((g) => g.players.length);
  const inactiveCount = state.players.filter((p) => !p.active).length;

  return (
    <div className="page">
      <PageHead title="הסגל" sub={`${state.players.filter((p) => p.active).length} שחקנים פעילים`} />

      <div className="toolbar">
        <input className="input search" placeholder="חיפוש לפי שם או מספר…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'הכל' },
            ...POS_ORDER.map((p) => ({ value: p, label: POSITIONS[p] })),
            { value: 'out', label: 'לא כשירים' },
          ]}
        />
      </div>

      {groups.length === 0 && (
        <Empty
          icon="users"
          title={state.players.length ? 'לא נמצאו שחקנים' : 'עוד אין שחקנים בסגל'}
          action={manager && !state.players.length ? <button className="btn btn-primary" onClick={() => setAdding(true)}>הוספת שחקן ראשון</button> : undefined}
        />
      )}

      {groups.map((g) => (
        <section key={g.pos} className="squad-group">
          <h2 className="group-title">
            {POSITIONS[g.pos]} <span>{g.players.length}</span>
          </h2>
          <div className="fut-grid">
            {g.players.map((p) => (
              <FutCard key={p.id} player={p} state={state} onClick={() => go('squad/' + p.id)} />
            ))}
          </div>
        </section>
      ))}

      {manager && inactiveCount > 0 && (
        <button className="btn btn-ghost" onClick={() => setShowInactive(!showInactive)}>
          {showInactive ? 'חזרה לסגל הפעיל' : `שחקנים לא פעילים (${inactiveCount})`}
        </button>
      )}

      {manager && <Fab label="שחקן" onClick={() => setAdding(true)} />}
      {adding && <PlayerForm onClose={() => setAdding(false)} />}
    </div>
  );
}
