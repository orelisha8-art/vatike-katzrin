import type { AppState, Match } from '../types';
import { FORMATIONS, lastName, onPitch } from '../utils';
import { Avatar } from './ui';

/** מגרש עם המערך. כשמועבר onSlot — לחיצה על עמדה פותחת בחירת שחקן */
export default function Pitch({ match, state, onSlot }: { match: Match; state: AppState; onSlot?: (i: number) => void }) {
  const slots = FORMATIONS[match.formation] ?? FORMATIONS['4-4-2'];
  const live = match.status !== 'scheduled';
  const current = new Set(onPitch(match));

  return (
    <div className="pitch">
      <svg className="pitch-lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden>
        <rect x="3" y="3" width="94" height="134" />
        <line x1="3" y1="70" x2="97" y2="70" />
        <circle cx="50" cy="70" r="11" />
        <rect x="24" y="3" width="52" height="20" />
        <rect x="38" y="3" width="24" height="7" />
        <rect x="24" y="117" width="52" height="20" />
        <rect x="38" y="130" width="24" height="7" />
      </svg>
      {slots.map((slot, i) => {
        const pid = match.slots[i];
        const p = pid ? state.players.find((x) => x.id === pid) : undefined;
        const subbedOff = live && p && !current.has(p.id);
        const goals = p ? match.events.filter((e) => e.type === 'goal' && e.playerId === p.id).length : 0;
        const yellow = p && match.events.some((e) => e.type === 'yellow' && e.playerId === p.id);
        const Tag = onSlot ? 'button' : 'div';
        return (
          <Tag
            key={i}
            className={'slot' + (p ? ' filled' : '') + (subbedOff ? ' off' : '')}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            onClick={onSlot ? () => onSlot(i) : undefined}
          >
            {p ? (
              <>
                <span className="slot-avatar">
                  <Avatar player={p} size={42} />
                  {p.photo && p.number != null && <span className="slot-num">{p.number}</span>}
                  {goals > 0 && <span className="slot-badge">{'⚽'.repeat(Math.min(goals, 3))}</span>}
                  {yellow && <span className="slot-card" />}
                </span>
                <span className="slot-name">{lastName(p.name)}</span>
              </>
            ) : (
              <>
                <span className="slot-empty">+</span>
                <span className="slot-name">{slot.label}</span>
              </>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
