"use client";

import { useRef } from "react";

interface Props {
  /** Called with the pixel delta since the drag started (or per key press). */
  onResize: (deltaPx: number) => void;
  /** Called when a drag begins, so the caller can snapshot the starting size. */
  onStart?: () => void;
  orientation: "vertical" | "horizontal";
  label: string;
}

/** A draggable, keyboard-operable splitter (arrow keys move it by 16px). */
export function ResizeHandle({ onResize, onStart, orientation, label }: Props) {
  const origin = useRef<number | null>(null);
  const vertical = orientation === "vertical"; // a vertical bar resizes columns

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      tabIndex={0}
      className={
        "group relative shrink-0 touch-none bg-line outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent " +
        (vertical ? "w-px cursor-col-resize" : "h-px cursor-row-resize")
      }
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = vertical ? e.clientX : e.clientY;
        onStart?.();
      }}
      onPointerMove={(e) => {
        if (origin.current === null) return;
        onResize((vertical ? e.clientX : e.clientY) - origin.current);
      }}
      onPointerUp={() => (origin.current = null)}
      onPointerCancel={() => (origin.current = null)}
      onKeyDown={(e) => {
        const step = 16;
        const dec = vertical ? "ArrowLeft" : "ArrowUp";
        const inc = vertical ? "ArrowRight" : "ArrowDown";
        if (e.key === dec || e.key === inc) {
          e.preventDefault();
          onStart?.();
          onResize(e.key === inc ? step : -step);
        }
      }}
    >
      {/* A wider invisible hit area makes the 1px line easy to grab. */}
      <span className={"absolute " + (vertical ? "-left-1.5 -right-1.5 top-0 bottom-0" : "-top-1.5 -bottom-1.5 left-0 right-0")} />
    </div>
  );
}
