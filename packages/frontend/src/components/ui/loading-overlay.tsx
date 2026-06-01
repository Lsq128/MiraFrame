"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  message?: string;
  visible?: boolean;
  className?: string;
}

export function LoadingOverlay({ message = "加载中...", visible = true, className }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm", className)}>
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      {message && <p className="mt-4 text-lg font-semibold text-foreground">{message}</p>}
    </div>
  );
}
