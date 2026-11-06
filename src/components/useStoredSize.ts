"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A pane size that survives reloads. localStorage is a per-viewer convenience
 * only: reads/writes are wrapped because it can throw (private mode, blocked data).
 */
export function useStoredSize(key: string, initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial);
  const start = useRef(initial);

  useEffect(() => {
    // Reading localStorage must wait until after hydration, so this one-time setState is intentional.
    try {
      const raw = localStorage.getItem(key);
      const n = raw === null ? NaN : Number(raw);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Number.isFinite(n)) setSize(Math.min(max, Math.max(min, n)));
    } catch {
      /* ignore */
    }
  }, [key, min, max]);

  const begin = useCallback(() => {
    start.current = size;
  }, [size]);

  const resizeBy = useCallback(
    (delta: number) => {
      const next = Math.min(max, Math.max(min, start.current + delta));
      setSize(next);
      try {
        localStorage.setItem(key, String(next));
      } catch {
        /* ignore */
      }
    },
    [key, min, max],
  );

  return { size, begin, resizeBy };
}
