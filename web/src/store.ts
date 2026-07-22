import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from './lib/i18n';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  theme: Theme;
  lang: Lang;
  favorites: string[];
  recentlyUsed: string[];
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  toggleFavorite: (id: string) => void;
  moveFavorite: (id: string, direction: 'up' | 'down') => void;
  reorderFavorites: (orderedIds: string[]) => void;
  addRecentlyUsed: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      lang: 'zh',
      favorites: [],
      recentlyUsed: [],
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id],
        })),
      moveFavorite: (id, direction) =>
        set((state) => {
          const idx = state.favorites.indexOf(id);
          if (idx < 0) return state;
          const next = [...state.favorites];
          const target = direction === 'up' ? idx - 1 : idx + 1;
          if (target < 0 || target >= next.length) return state;
          [next[idx], next[target]] = [next[target], next[idx]];
          return { favorites: next };
        }),
      reorderFavorites: (orderedIds) =>
        set((state) => {
          const setIds = new Set(state.favorites);
          const next = orderedIds.filter((id) => setIds.has(id));
          for (const id of state.favorites) {
            if (!next.includes(id)) next.push(id);
          }
          return { favorites: next };
        }),
      addRecentlyUsed: (id) =>
        set((state) => ({
          recentlyUsed: [
            id,
            ...state.recentlyUsed.filter((r) => r !== id),
          ].slice(0, 12),
        })),
    }),
    { name: 'json-toolkit-storage' }
  )
);
