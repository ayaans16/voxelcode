"use client";

import { useMemo } from "react";
import { dayKey } from "@/engine/stats";

const WEEKS = 20;

/** Calendar heatmap of solves per day. Counts are in each cell's label, so color is never the only cue. */
export function Heatmap({ counts, now }: { counts: Record<string, number>; now: number }) {
  const { cells, max } = useMemo(() => {
    const end = new Date(now);
    end.setHours(12, 0, 0, 0);
    // Align the grid so the last column ends on today's weekday.
    const todayIdx = end.getDay();
    const totalDays = (WEEKS - 1) * 7 + todayIdx + 1;
    const start = new Date(end);
    start.setDate(end.getDate() - (totalDays - 1));
    const out: { key: string; count: number; col: number; row: number }[] = [];
    let m = 0;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d.getTime());
      const count = counts[key] ?? 0;
      m = Math.max(m, count);
      out.push({ key, count, col: Math.floor(i / 7), row: i % 7 });
    }
    return { cells: out, max: m };
  }, [counts, now]);

  const level = (c: number) => (c === 0 ? 0 : max <= 1 ? 4 : Math.min(4, Math.ceil((c / max) * 4)));
  const fills = ["var(--panel-2)", "color-mix(in srgb, var(--accent) 28%, var(--panel-2))", "color-mix(in srgb, var(--accent) 50%, var(--panel-2))", "color-mix(in srgb, var(--accent) 75%, var(--panel-2))", "var(--accent)"];

  return (
    <div>
      <svg viewBox={`0 0 ${WEEKS * 13} ${7 * 13}`} className="w-full" role="img" aria-label="Solves per day over the last 20 weeks">
        {cells.map((c) => (
          <rect key={c.key} x={c.col * 13} y={c.row * 13} width={11} height={11} fill={fills[level(c.count)]} stroke="var(--line)" strokeWidth={0.5} shapeRendering="crispEdges">
            <title>{`${c.key}: ${c.count} ${c.count === 1 ? "solve" : "solves"}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-dim">
        Less
        {fills.map((f, i) => (
          <span key={i} className="h-2.5 w-2.5 border border-line" style={{ background: f }} />
        ))}
        More
      </div>
    </div>
  );
}
