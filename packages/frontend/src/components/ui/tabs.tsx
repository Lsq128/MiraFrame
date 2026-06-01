"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
  variant?: "default" | "underline";
}

export function Tabs({ tabs, activeTab, onChange, className, variant = "default" }: TabsProps) {
  if (variant === "underline") {
    return (
      <div className={cn("flex gap-0 border-b", className)}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} type="button" disabled={tab.disabled} onClick={() => onChange(tab.key)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-b-2 -mb-px",
                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
              )}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}{tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button key={tab.key} type="button" disabled={tab.disabled} onClick={() => onChange(tab.key)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              isActive ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}{tab.label}
          </button>
        );
      })}
    </div>
  );
}
