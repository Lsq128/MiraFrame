"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface HoverActionBarProps {
  children: React.ReactNode;
  actions: ActionItem[];
  className?: string;
}

export function HoverActionBar({ children, actions, className }: HoverActionBarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getButtonClass = (v: ActionItem["variant"]) =>
    v === "danger" ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

  return (
    <div className={cn("relative", className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onTouchStart={() => setIsHovered(p => !p)}>
      {children}
      <div className={cn(
        "absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-md backdrop-blur-sm transition-all duration-200",
        isHovered ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      )}>
        {actions.map((action, index) => (
          <button key={index} type="button" className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors", getButtonClass(action.variant))}
            onClick={e => { e.stopPropagation(); e.preventDefault(); action.onClick(); }} aria-label={action.label} title={action.label}>
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
