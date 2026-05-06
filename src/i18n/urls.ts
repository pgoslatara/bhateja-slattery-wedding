import type { Locale } from './strings';

const BASE = import.meta.env.BASE_URL ?? '/';

function withBase(path: string) {
  const trimmedBase = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  return `${trimmedBase}${path}`;
}

export function localeUrl(lang: Locale, path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return lang === 'hi' ? withBase(`/hi${normalised}`) : withBase(normalised);
}

export function otherLocaleUrlForCurrent(currentLang: Locale, currentPath: string): string {
  const otherLang: Locale = currentLang === 'en' ? 'hi' : 'en';
  // Strip the base path and the /hi/ prefix if present, so we can rebuild against the other locale.
  let pathOnly = currentPath;
  if (BASE !== '/' && pathOnly.startsWith(BASE)) pathOnly = pathOnly.slice(BASE.length - (BASE.endsWith('/') ? 1 : 0));
  if (pathOnly.startsWith('/hi/')) pathOnly = pathOnly.slice(3);
  if (pathOnly === '/hi') pathOnly = '/';
  return localeUrl(otherLang, pathOnly || '/');
}
