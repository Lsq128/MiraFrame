"use client";

import { Link } from "react-router-dom";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { BRAND } from "@/lib/brand";
import { FolderKanban, Settings, Sparkles, Sun, Moon } from "lucide-react";

export function TopBar() {
  const { theme, toggleTheme } = useThemeStore();
  const { openModal: openSettings } = useSettingsStore();
  const isDark = theme.includes("dark");

  return (
    <header className="flex-shrink-0 flex items-center h-11 bg-base-100/95 backdrop-blur border-b border-base-300 z-30 px-3">
      {/* Left */}
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>{BRAND.name}</span>
          <span className="hidden sm:inline text-muted-foreground font-medium">{BRAND.cnName}</span>
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right buttons */}
      <div className="flex items-center gap-1">
        <Link
          to="/projects"
          className="btn btn-xs btn-ghost gap-1"
          aria-label="项目"
        >
          <FolderKanban className="h-4 w-4" />
          <span className="hidden sm:inline">项目</span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-xs btn-ghost"
          aria-label={isDark ? "切换到亮色主题" : "切换到暗色主题"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="btn btn-xs btn-ghost"
          aria-label="设置"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
