"use client";

import { Link } from "react-router-dom";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onToggleAssets: () => void;
  onToggleHistory: () => void;
  assetsOpen?: boolean;
  historyOpen?: boolean;
  projectId?: number;
}

export function TopBar({
  onToggleAssets,
  onToggleHistory,
  assetsOpen = false,
  historyOpen = false,
}: TopBarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { openModal: openSettings } = useSettingsStore();
  const isDark = theme.includes("dark");

  return (
    <header className="flex-shrink-0 flex items-center h-10 bg-base-100 border-b-2 border-base-300 z-30 px-2">
      {/* Left */}
      <div className="flex items-center gap-1">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity px-2"
        >
          openOii
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right buttons */}
      <div className="flex items-center gap-1">
        {/* Assets */}
        <button
          onClick={onToggleAssets}
          className={cn(
            "btn btn-xs btn-ghost gap-1",
            assetsOpen && "btn-primary",
          )}
          aria-label="资产"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <span className="hidden sm:inline">资产</span>
        </button>

        {/* History */}
        <button
          onClick={onToggleHistory}
          className={cn(
            "btn btn-xs btn-ghost gap-1",
            historyOpen && "btn-primary",
          )}
          aria-label="历史"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="hidden sm:inline">历史</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-xs btn-ghost"
          aria-label={isDark ? "切换到亮色主题" : "切换到暗色主题"}
        >
          {isDark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="btn btn-xs btn-ghost"
          aria-label="设置"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
