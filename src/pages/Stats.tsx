import { useState } from 'react';
import { useApp, useSession } from '../store';
import { go } from '../router';
import { Avatar, PageHead, RatingBadge, Segmented } from '../components/ui';
import { attendanceRate, playerStats, type PlayerStats } from '../utils';

type Col = 'goals' | 'assists' | 'ga' | 'avgRating' | 'minutes' | 'apps' | 'motm' | 'cards' | 'att';

export default function Stats() {
  const state = useApp();
  const session = useSession();
  const showRatings = session?.role === 'manager' || state.settings.showRatingsToPlayers;
  const [col, setCol] = useState<Col>('goals');

  const rows = state.players
    .filter((p) => p.active)
    .map((p) => {
      const s = playerStats(state, p.id);
      return { p, s, att: attendanceRate(state, p.id) };
    });

  const val = (r: { s: PlayerStats; att: number | null }): number => {
    switch (col) {
      case 'ga':
        return r.s.goals + r.s.assists;
      case 'cards':
        return r.s.yellow + r.s.red * 3;
      case 'att':
        return r.att ?? -1;
      case 'avgRating':
        return r.s.avgRating ?? -1;
      default:
        return r.s[col];
    }
  };
  const sorted = [...rows].sort((a, b) => val(b) - val(a)).filter((r) => val(r) > 0);

  const options: { value: Col; label: string }[] = [
    { value: 'goals', label: 'שערים' },
    { value: 'assists', label: 'בישולים' },
    { value: 'ga', label: 'שערים+בישולים' },
    ...(showRatings ? [{ value: 'avgRating' as Col, label: 'ציון' }] : []),
    { value: 'motm', label: 'שחקן המשחק' },
    { value: 'minutes', label: 'דקות' },
    { value: 'apps', label: 'הופעות' },
    { value: 'att', label: 'נוכחות' },
    { value: 'cards', label: 'כרטיסים' },
  ];

  const display = (r: (typeof rows)[number]) => {
    if (col === 'avgRating') return <RatingBadge value={Math.round((r.s.avgRating ?? 0) * 10) / 10} />;
    if (col === 'cards') return `🟨${r.s.yellow} 🟥${r.s.red}`;
    if (col === 'att') return r.att + '%';
    return val(r);
  };

  return (
    <div className="page">
      <PageHead title="טבלאות העונה" />
      <div className="tabs-scroll">
        <Segmented value={col} onChange={setCol} options={options} />
      </div>
      {sorted.length > 0 && (
        <div className="podium">
          {[sorted[1], sorted[0], sorted[2]].map((r, i) =>
            r ? (
              <button key={r.p.id} className={'podium-step place-' + [2, 1, 3][i]} onClick={() => go('squad/' + r.p.id)}>
                <span className="podium-avatar">
                  <Avatar player={r.p} size={[2, 1, 3][i] === 1 ? 76 : 60} />
                  {[2, 1, 3][i] === 1 && <span className="crown">👑</span>}
                </span>
                <strong>{r.p.name}</strong>
                <span className="podium-val">{display(r)}</span>
                <span className="podium-block">{[2, 1, 3][i]}</span>
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      )}
      <section className="card">
        {sorted.length === 0 ? (
          <p className="muted">אין עדיין נתונים</p>
        ) : (
          <ol className="leaders big">
            {sorted.map((r, i) => (
              <li key={r.p.id}>
                <button onClick={() => go('squad/' + r.p.id)}>
                  <span className={'rank' + (i < 3 ? ' top' + (i + 1) : '')}>{i + 1}</span>
                  <Avatar player={r.p} size={40} />
                  <span className="leader-name">
                    <strong>{r.p.name}</strong>
                    <small>
                      {r.s.apps} הופעות · {r.s.goals} ⚽ · {r.s.assists} 🅰️
                    </small>
                  </span>
                  <b className="big-num">{display(r)}</b>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
