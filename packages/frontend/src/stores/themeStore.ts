import { create } from "zustand";

type Theme = "light" | "dark" | "cupcake" | "bumblebee" | "emerald" | "corporate" | "synthwave" | "retro" | "cyberpunk" | "valentine" | "halloween" | "garden" | "forest" | "aqua" | "lofi" | "pastel" | "fantasy" | "wireframe" | "black" | "luxury" | "dracula" | "cmyk" | "autumn" | "business" | "acid" | "lemonade" | "night" | "coffee" | "winter" | "dim" | "nord" | "sunset" | "light-dark" | "dark-light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Initialize from localStorage or default to "light-dark" (auto)
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light-dark";
  const stored = localStorage.getItem("openoii-theme");
  if (stored) return stored as Theme;
  // Detect system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark-light";
  }
  return "light-dark";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),

  setTheme: (theme) => {
    localStorage.setItem("openoii-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current.endsWith("dark") || current.includes("dark") ? "light" : "dark";
    get().setTheme(next);
  },
}));

// Apply theme on load
if (typeof window !== "undefined") {
  const theme = getInitialTheme();
  document.documentElement.setAttribute("data-theme", theme);
}
