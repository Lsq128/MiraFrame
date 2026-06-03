import { create } from "zustand";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "miraframe-theme";
const LEGACY_THEME_STORAGE_KEY = "openoii-theme";

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (stored) return normalizeTheme(stored);
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function normalizeTheme(theme: string | null): Theme {
  if (theme === "dark" || theme === "dark-light" || theme === "night" || theme === "black") return "dark";
  if (theme === "light" || theme === "light-dark") return "light";
  return "light";
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  isDark: getInitialTheme() === "dark",

  setTheme: (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    applyTheme(theme);
    set({ theme, isDark: theme === "dark" });
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));

if (typeof window !== "undefined") {
  applyTheme(getInitialTheme());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    const hasUserTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (hasUserTheme) return;
    useThemeStore.getState().setTheme(event.matches ? "dark" : "light");
    localStorage.removeItem(THEME_STORAGE_KEY);
  });
}
