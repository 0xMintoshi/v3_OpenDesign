import { useState, useEffect } from 'react';

const TABLET_QUERY = '(max-width: 1180px)';

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.matchMedia(TABLET_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(TABLET_QUERY);
    const handler = (e) => setIsTablet(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isTablet;
}
