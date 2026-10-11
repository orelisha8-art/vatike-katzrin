import { useEffect, useRef, useState } from 'react';
import { addPhoto, captionPhoto, removePhoto, useApp, useGallery, type Photo } from '../store';
import { Empty, Icon, PageHead } from '../components/ui';
import { resizeImage } from '../utils';

/** גלריית הקבוצה — כולם רואים, הצוות מעלה ומוחק */
export default function Gallery({ manager }: { manager: boolean }) {
  const photos = useGallery();
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setBusy(files.length);
    for (const f of Array.from(files)) {
      try {
        await addPhoto(await resizeImage(f, 1600, false));
      } catch (e) {
        alert('העלאת תמונה נכשלה: ' + (e as Error).message);
      }
      setBusy((n) => n - 1);
    }
  };

  return (
    <div className="page">
      <PageHead
        title="גלריה"
        sub={`${photos.length} תמונות`}
        actions={
          manager && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => input.current?.click()} disabled={busy > 0}>
                <Icon name="camera" size={16} /> {busy ? `מעלה… (${busy})` : 'העלאת תמונות'}
              </button>
              <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && upload(e.target.files).then(() => (e.target.value = ''))} />
            </>
          )
        }
      />
      {photos.length === 0 ? (
        <Empty icon="camera" title="עוד אין תמונות" text={manager ? 'העלו תמונות מאימונים, משחקים וערבי גיבוש' : 'הצוות יעלה תמונות בקרוב'} />
      ) : (
        <div className="gallery-grid">
          {photos.map((p, i) => (
            <button key={p.id} className={'g-item' + (i % 5 === 0 ? ' wide' : '')} onClick={() => setOpen(i)}>
              <img src={p.src} alt={p.caption || 'תמונת קבוצה'} loading="lazy" />
              {p.caption && <span className="g-cap">{p.caption}</span>}
            </button>
          ))}
        </div>
      )}
      {open !== null && photos[open] && <Lightbox photos={photos} index={open} setIndex={setOpen} manager={manager} />}
    </div>
  );
}

function Lightbox({ photos, index, setIndex, manager }: { photos: Photo[]; index: number; setIndex: (i: number | null) => void; manager: boolean }) {
  const p = photos[index];
  const [caption, setCaption] = useState(p.caption);
  useEffect(() => setCaption(p.caption), [p.id, p.caption]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowLeft') setIndex((index + 1) % photos.length);
      if (e.key === 'ArrowRight') setIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, photos.length, setIndex]);

  return (
    <div className="lightbox" onClick={() => setIndex(null)}>
      <div className="lb-top" onClick={(e) => e.stopPropagation()}>
        <span>
          {index + 1} / {photos.length}
        </span>
        <button className="icon-btn" onClick={() => setIndex(null)} aria-label="סגירה">
          <Icon name="x" />
        </button>
      </div>
      <img src={p.src} alt={p.caption || ''} onClick={(e) => e.stopPropagation()} />
      {photos.length > 1 && (
        <>
          <button className="lb-nav prev" onClick={(e) => (e.stopPropagation(), setIndex((index - 1 + photos.length) % photos.length))} aria-label="הקודמת">
            ›
          </button>
          <button className="lb-nav next" onClick={(e) => (e.stopPropagation(), setIndex((index + 1) % photos.length))} aria-label="הבאה">
            ‹
          </button>
        </>
      )}
      <div className="lb-bottom" onClick={(e) => e.stopPropagation()}>
        {manager ? (
          <>
            <input
              className="input"
              placeholder="הוסיפו כיתוב לתמונה…"
              value={caption}
              maxLength={140}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={() => caption !== p.caption && captionPhoto(p.id, caption)}
            />
            <button
              className="btn btn-ghost danger"
              onClick={() => {
                if (!window.confirm('למחוק את התמונה?')) return;
                void removePhoto(p.id);
                setIndex(photos.length > 1 ? Math.min(index, photos.length - 2) : null);
              }}
            >
              <Icon name="trash" size={16} /> מחיקה
            </button>
          </>
        ) : (
          p.caption && <p>{p.caption}</p>
        )}
      </div>
    </div>
  );
}

/** מצגת תמונות לדף הבית — מתחלפת לבד, אפשר להחליק */
export function HomeCarousel() {
  const state = useApp();
  const photos = useGallery();
  const slides = [...(state.settings.teamPhoto ? [{ id: 'team', src: state.settings.teamPhoto, caption: '' }] : []), ...photos].slice(0, 12);
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      const el = track.current;
      if (!el || document.hidden) return;
      const next = (Math.round(Math.abs(el.scrollLeft) / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: -next * el.clientWidth, behavior: 'smooth' }); // RTL — גלילה שלילית
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  return (
    <div className="carousel">
      <div className="car-track" ref={track} onScroll={(e) => setI(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}>
        {slides.map((s) => (
          <div key={s.id} className="car-slide">
            <img src={s.src} alt={s.caption || 'תמונת הקבוצה'} />
          </div>
        ))}
      </div>
      <div className="car-text">
        <strong>{state.settings.teamName}</strong>
        <span>{slides[i]?.caption || state.settings.league}</span>
      </div>
      {slides.length > 1 && (
        <div className="car-dots">
          {slides.map((s, k) => (
            <span key={s.id} className={k === i ? 'on' : ''} />
          ))}
        </div>
      )}
      <a className="car-all" href="#/gallery">
        <Icon name="camera" size={14} /> לגלריה
      </a>
    </div>
  );
}
