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
      addRecentlyUsed: (id) =>
        set((state) => ({
          recentlyUsed: [
            id,
            ...state.recentlyUsed.filter((r) => r !== id),
          ].slice(0, 10),
        })),
    }),
    { name: 'json-toolkit-storage' }
  )
);
