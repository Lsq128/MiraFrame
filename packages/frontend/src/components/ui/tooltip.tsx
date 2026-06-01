"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
}

export function Tooltip({ content, children, side = "top", className, delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouch = useRef(false);

  const show = () => {
    if (isTouch.current) return;
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    setVisible(false);
  };
  const handleTouch = (e: React.TouchEvent) => { e.stopPropagation(); isTouch.current = true; setVisible(p => !p); };

  useEffect(() => {
    const handleOutside = () => { if (isTouch.current) setVisible(false); };
    document.addEventListener("touchstart", handleOutside);
    return () => document.removeEventListener("touchstart", handleOutside);
  }, []);

  const sideClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onTouchStart={handleTouch}>
      {children}
      {visible && (
        <div role="tooltip" className={cn("absolute z-50 whitespace-nowrap rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md", sideClasses[side], className)}>
          {content}
        </div>
      )}
    </div>
  );
}
