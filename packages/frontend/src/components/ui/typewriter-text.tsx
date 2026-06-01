"use client";

import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
  enabled?: boolean;
  onProgress?: (progress: number) => void;
}

export function TypewriterText({ text, onComplete, speed = 30, enabled = true, onProgress }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState(enabled ? "" : text);
  const [isComplete, setIsComplete] = useState(!enabled);
  const indexRef = useRef(0);
  const textRef = useRef(text);
  const progressRef = useRef<number | null>(null);

  const reportProgress = useCallback((progress: number) => {
    const rounded = Math.round(progress * 100) / 100;
    if (progressRef.current !== rounded) { onProgress?.(rounded); progressRef.current = rounded; }
  }, [onProgress]);

  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text;
      if (enabled) {
        if (text.startsWith(displayedText)) { if (isComplete) setIsComplete(false); }
        else { indexRef.current = 0; setDisplayedText(""); setIsComplete(false); progressRef.current = null; reportProgress(0); }
      } else { setDisplayedText(text); if (!isComplete) setIsComplete(true); reportProgress(1); }
    }
  }, [text, enabled, displayedText, isComplete, reportProgress]);

  useEffect(() => {
    if (!enabled) { setDisplayedText(text); if (!isComplete) { setIsComplete(true); reportProgress(1); onComplete?.(); } return; }
    if (indexRef.current >= text.length) { if (!isComplete) { setIsComplete(true); reportProgress(1); onComplete?.(); } return; }
    const timer = setTimeout(() => {
      if (indexRef.current < displayedText.length) indexRef.current = displayedText.length;
      indexRef.current += 1;
      setDisplayedText(text.slice(0, indexRef.current));
      reportProgress(text.length > 0 ? indexRef.current / text.length : 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [text, speed, enabled, displayedText, isComplete, onComplete, reportProgress]);

  return (
    <span>
      {displayedText}
      {enabled && !isComplete && <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle" />}
    </span>
  );
}
