"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROBLEMS } from "@/problems";
import { PATTERNS } from "@/engine/patterns";
import { sessionProgress, isSolved, type Session } from "@/engine/session";
import { useSessions } from "@/storage/react";
import type { Problem } from "@/problems/schema";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";
type StatusFilter = "all" | "todo" | "growing" | "solved";
type Status = "todo" | "growing" | "solved";

function statusOf(s: Session | undefined): Status {
  if (!s) return "todo";
  return isSolved(s) ? "solved" : "growing";
}

const STATUS_LABEL: Record<Status, string> = { todo: "Not started", growing: "Growing", solved: "Solved" };
const DIFF_COLOR = { easy: "text-pass", medium: "text-warn", hard: "text-fail" } as const;

function treeIconFor(s: Session | undefined): PixelIconName | null {
  if (!s) return null; // not opened: an empty plot
  if (isSolved(s)) return "tree";
  return sessionProgress(s) < 0.3 ? "seed" : "sapling";
}

/** A ring showing solved / total for a pattern. Count text is inside, so color is not the only signal. */
function ProgressRing({ solved, total }: { solved: number; total: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const frac = total === 0 ? 0 : solved / total;
  return (
    <div className="relative h-11 w-11 shrink-0" role="img" aria-label={`${solved} of ${total} solved`}>
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="butt"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-pixel text-[11px] text-ink">
        {solved}/{total}
      </span>
    </div>
  );
}

function ProblemNode({ problem, session }: { problem: Problem; session: Session | undefined }) {
  const status = statusOf(session);
  const icon = treeIconFor(session);
  const pct = session ? Math.round(sessionProgress(session) * 100) : 0;
  return (
    <li className="relative z-10 w-40 shrink-0">
      <Link
        href={`/problems/${problem.slug}`}
        className={
          "group flex h-full flex-col gap-2 border-2 bg-panel p-3 shadow-[3px_3px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[3px_5px_0_var(--shadow)] " +
          (status === "solved" ? "border-pass" : status === "growing" ? "border-accent/70" : "border-line-strong")
        }
      >
        <div className="flex h-10 items-end justify-between">
          {icon ? <PixelIcon name={icon} px={4} /> : <span aria-hidden className="h-8 w-8 border border-dashed border-line-strong" />}
          <span className={`text-[10px] font-bold uppercase ${DIFF_COLOR[problem.difficulty]}`}>{problem.difficulty}</span>
        </div>
        <span className="text-[12px] font-bold leading-snug text-ink group-hover:text-accent">{problem.title}</span>
        <span className="mt-auto flex items-center justify-between text-[11px] text-dim">
          <span>{STATUS_LABEL[status]}</span>
          {status === "growing" && <span className="tabular-nums text-mute">{pct}%</span>}
          {status === "solved" && <PixelIcon name="check" px={2} className="text-pass" />}
        </span>
        {status === "growing" && (
          <span className="h-1 w-full bg-panel-2">
            <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
          </span>
        )}
      </Link>
    </li>
  );
}

function FilterGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      <span className="mr-1 font-pixel text-[10px] uppercase tracking-widest text-dim">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={
            "btn px-2.5 py-1 text-[11px] " + (value === o.id ? "btn-on" : "")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Roadmap() {
  const { sessions, loaded } = useSessions();
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const bySlug = useMemo(() => new Map(sessions.map((s) => [s.slug, s] as const)), [sessions]);

  const sections = useMemo(() => {
    return PATTERNS.map((pattern) => {
      const all = PROBLEMS.filter((p) => p.patterns[0] === pattern.id);
      const solved = all.filter((p) => statusOf(bySlug.get(p.slug)) === "solved").length;
      const shown = all.filter((p) => (difficulty === "all" || p.difficulty === difficulty) && (status === "all" || statusOf(bySlug.get(p.slug)) === status));
      return { pattern, all, solved, shown };
    }).filter((s) => s.all.length > 0);
  }, [bySlug, difficulty, status]);

  const totalSolved = sections.reduce((n, s) => n + s.solved, 0);
  const anyShown = sections.some((s) => s.shown.length > 0);

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-20 pt-10">
      <span className="badge">Roadmap</span>
      <h1 className="pixel-title mt-4 text-4xl text-ink sm:text-5xl">Pick a seed</h1>
      <p className="mt-4 max-w-xl text-mute">Each problem is a seed. Pass tests to grow it, finish it to move it into your forest.</p>

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-line py-3">
        <FilterGroup
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { id: "all", label: "All" },
            { id: "easy", label: "Easy" },
            { id: "medium", label: "Medium" },
            { id: "hard", label: "Hard" },
          ]}
        />
        <FilterGroup
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { id: "all", label: "All" },
            { id: "todo", label: "Not started" },
            { id: "growing", label: "Growing" },
            { id: "solved", label: "Solved" },
          ]}
        />
        <span className="ml-auto flex items-center gap-2 text-[12px] text-mute">
          <PixelIcon name="tree" px={2} />
          {loaded ? `${totalSolved} / ${PROBLEMS.length} trees grown` : "Loading..."}
        </span>
      </div>

      <div className="mt-8 space-y-10">
        {sections.map(({ pattern, all, solved, shown }) => (
          <section key={pattern.id} aria-labelledby={`h-${pattern.id}`} hidden={shown.length === 0}>
            <div className="flex items-center gap-4">
              <ProgressRing solved={solved} total={all.length} />
              <div>
                <h2 id={`h-${pattern.id}`} className="text-lg font-extrabold tracking-tight text-ink">
                  {pattern.label}
                </h2>
                <p className="text-[11px] text-dim">
                  {all.length} {all.length === 1 ? "problem" : "problems"}
                </p>
              </div>
            </div>
            <div className="relative mt-4 overflow-x-auto pb-2">
              {/* the path line connecting the nodes */}
              <div aria-hidden className="absolute left-6 right-6 top-[3.2rem] z-0 h-0.5 bg-line-strong" style={{ width: Math.max(0, shown.length * 11 - 3) + "rem" }} />
              <ol className="relative flex gap-6 pr-6">
                {shown.map((p) => (
                  <ProblemNode key={p.slug} problem={p} session={bySlug.get(p.slug)} />
                ))}
              </ol>
            </div>
          </section>
        ))}
        {loaded && !anyShown && <p className="border border-dashed border-line-strong p-8 text-center text-mute">No problems match these filters.</p>}
      </div>
    </div>
  );
}
