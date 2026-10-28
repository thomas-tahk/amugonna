import { useSyncExternalStore } from 'react';

export type TabId = 'kitchen' | 'cook' | 'recipes';

export interface Route {
  tab: TabId;
  recipeId: number | null;
}

const CHANGE = 'amugonna:route';

/** #kitchen, #cook, #recipes, #cook/recipe/<id>. Anything else (including no hash) is the Kitchen. */
export function parseHash(hash: string): Route {
  const m = /^#(kitchen|cook|recipes)(?:\/recipe\/(\d+))?$/.exec(hash);
  if (!m) return { tab: 'kitchen', recipeId: null };
  const recipeId = m[2] && m[1] === 'cook' ? Number(m[2]) : null;
  return { tab: m[1] as TabId, recipeId };
}

export const tabHash = (tab: TabId) => `#${tab}`;
export const recipeHash = (id: number) => `#cook/recipe/${id}`;

/** The one place that moves through the app: pushes a history entry, so system Back walks back. */
export function navigate(hash: string) {
  if (window.location.hash === hash) return;
  window.history.pushState(null, '', hash);
  window.dispatchEvent(new Event(CHANGE));
}

/** Replace the current entry (used when a recipe URL has no in-app history behind it). */
export function replaceRoute(hash: string) {
  window.history.replaceState(null, '', hash);
  window.dispatchEvent(new Event(CHANGE));
}

/** Drop the hash without adding history (sign-out). */
export function clearRoute() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener('hashchange', cb);
  window.addEventListener(CHANGE, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener('hashchange', cb);
    window.removeEventListener(CHANGE, cb);
  };
}

const snapshot = () => window.location.hash;

export function useRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, snapshot));
}
