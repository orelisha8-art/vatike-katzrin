import { useSyncExternalStore } from 'react';

const read = () => window.location.hash.replace(/^#\/?/, '');

export const useRoute = () => {
  const path = useSyncExternalStore(
    (l) => {
      window.addEventListener('hashchange', l);
      return () => window.removeEventListener('hashchange', l);
    },
    read,
  );
  return path.split('/').filter(Boolean);
};

export const go = (path: string) => {
  window.location.hash = '/' + path.replace(/^\//, '');
  window.scrollTo(0, 0);
};

export const back = () => window.history.back();
