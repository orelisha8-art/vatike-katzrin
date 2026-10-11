import { useEffect, useRef, type ReactNode } from 'react';
import type { Player } from '../types';
import { initials, resizeImage } from '../utils';

// ---------- אייקונים ----------
const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  ball: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 7l4 3-1.5 4.5h-5L8 10zM12 2v5M16 10l5-2M14.5 14.5l3 4.5M9.5 14.5l-3 4.5M8 10L3 8',
  calendar: 'M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18M8 3v4M16 3v4',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  back: 'M9 6l6 6-6 6',
  chevron: 'M15 6l-6 6 6 6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  wallet: 'M3 7h18v12H3zM3 7l3-4h12l3 4M16 13h2',
  clipboard: 'M9 3h6v3H9zM7 5H5v16h14V5h-2M8 11h8M8 15h6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h0a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8',
  whistle: 'M3 12a5 5 0 0 0 9.6 2H21V9H9a5 5 0 0 0-6 3zM14 9V6',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM14 4h4v16h-4z',
  download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  upload: 'M12 15V3M7 8l5-5 5 5M4 20h16',
  pitch: 'M3 4h18v16H3zM3 12h18M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M8 4v3h8V4M8 20v-3h8v3',
};

export function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] || ''} />
    </svg>
  );
}

// ---------- אווטאר ----------
export function Avatar({ player, size = 44, photo, name }: { player?: Player; size?: number; photo?: string; name?: string }) {
  const src = photo ?? player?.photo;
  const label = name ?? player?.name ?? '';
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (src) return <img className="avatar" style={style} src={src} alt={label} />;
  return (
    <div className="avatar avatar-fallback" style={style}>
      {player?.number ?? initials(label)}
    </div>
  );
}

// ---------- חלון ----------
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="סגור">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- טפסים ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PhotoInput({ value, onChange, name, round = true }: { value?: string; onChange: (v?: string) => void; name: string; round?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="photo-input">
      <button type="button" className={'photo-btn' + (round ? '' : ' square')} onClick={() => ref.current?.click()}>
        {value ? <img src={value} alt="" /> : <span className="photo-ph"><Icon name="camera" size={26} /><small>{initials(name) || 'תמונה'}</small></span>}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await resizeImage(f));
          e.target.value = '';
        }}
      />
      <div className="photo-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => ref.current?.click()}>
          {value ? 'החלף תמונה' : 'הוסף תמונה'}
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => onChange(undefined)}>
            הסר
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- שונות ----------
export function Empty({ icon = 'ball', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={30} />
      </div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function PageHead({ title, sub, actions, onBack }: { title: string; sub?: ReactNode; actions?: ReactNode; onBack?: () => void }) {
  return (
    <header className="page-head">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="חזרה">
          <Icon name="back" />
        </button>
      )}
      <div className="page-head-text">
        <h1>{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'ok' | 'bad' | 'warn' | 'brand' }) {
  return (
    <div className={'stat' + (tone ? ' tone-' + tone : '')}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="fab" onClick={onClick} aria-label={label}>
      <Icon name="plus" size={26} />
      <span>{label}</span>
    </button>
  );
}

export function RatingBadge({ value }: { value?: number | null }) {
  if (value == null) return <span className="rating rating-none">–</span>;
  const tone = value >= 8 ? 'top' : value >= 7 ? 'good' : value >= 6 ? 'mid' : 'low';
  return <span className={'rating rating-' + tone}>{value % 1 ? value.toFixed(1) : value}</span>;
}

export function confirmDelete(what: string) {
  return window.confirm(`למחוק את ${what}? אי אפשר לבטל.`);
}
