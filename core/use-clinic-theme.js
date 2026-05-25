import { useEffect, useState } from 'react';
import { getTheme } from './themes.js';

export function useClinicTheme() {
  const slug = new URLSearchParams(window.location.search).get('clinic') ?? 'default';
  const [activeSlug, setActiveSlug] = useState(slug);

  useEffect(() => {
    const theme = getTheme(slug);
    Object.entries(theme.vars).forEach(([prop, val]) => {
      document.documentElement.style.setProperty(prop, val);
    });
    setActiveSlug(theme.slug);
  }, [slug]);

  return activeSlug;
}
