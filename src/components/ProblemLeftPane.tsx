"use client";

import { useState } from "react";
import type { Problem } from "@/problems/schema";
import type { Session } from "@/engine/session";
import { editorialUnlocked } from "@/engine/session";
import { patternLabel } from "@/engine/patterns";
import { Markdown } from "./Markdown";
import { PixelIcon } from "./PixelIcon";

type Tab = "statement" | "hints" | "editorial";

const DIFF_STYLE = { easy: "text-pass", medium: "text-warn", hard: "text-fail" } as const;

export function ProblemLeftPane({ problem, session, onRevealHint }: { problem: Problem; session: Session; onRevealHint: () => void }) {
  const [tab, setTab] = useState<Tab>("statement");
  const unlocked = editorialUnlocked(session, problem.hints.length);
  const tabs: { id: Tab; label: string }[] = [
    { id: "statement", label: "Statement" },
    { id: "hints", label: `Hints ${session.hintsUsed}/${problem.hints.length}` },
    { id: "editorial", label: "Editorial" },
  ];

  return (
    <section aria-label="Problem" className="flex h-full min-h-0 flex-col bg-panel">
      <div role="tablist" aria-label="Problem sections" className="flex h-9 shrink-0 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const i = tabs.findIndex((x) => x.id === tab);
                const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]!;
                setTab(next.id);
                document.getElementById(`tab-${next.id}`)?.focus();
              }
            }}
            tabIndex={tab === t.id ? 0 : -1}
            className={
              "px-4 text-[12px] transition-colors " +
              (tab === t.id ? "border-b-2 border-accent font-bold text-ink" : "border-b-2 border-transparent text-mute hover:text-ink")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-auto p-5">
        {tab === "statement" && (
          <>
            <h1 className="text-lg font-extrabold tracking-tight text-ink">{problem.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`border border-line-strong px-2 py-0.5 font-bold uppercase ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>
              {problem.patterns.map((p) => (
                <span key={p} className="border border-line px-2 py-0.5 text-mute">
                  {patternLabel(p)}
                </span>
              ))}
            </div>
            <Markdown>{problem.statement}</Markdown>
            <h2 className="mt-6 font-pixel text-[11px] uppercase tracking-widest text-accent">Examples</h2>
            <div className="mt-2 space-y-3">
              {problem.examples.map((ex, i) => (
                <div key={i} className="border border-line bg-panel-2 p-3 text-[12px]">
                  <div className="text-dim">Example {i + 1}</div>
                  <pre className="mt-1 whitespace-pre-wrap">
                    <span className="text-dim">Input:  </span>
                    {ex.input}
                    {"\n"}
                    <span className="text-dim">Output: </span>
                    {ex.output}
                  </pre>
                  {ex.explanation && <p className="mt-1 text-mute">{ex.explanation}</p>}
                </div>
              ))}
            </div>
            <h2 className="mt-6 font-pixel text-[11px] uppercase tracking-widest text-accent">Constraints</h2>
            <ul className="prose-vc mt-1 text-[12px]">
              {problem.constraints.map((c) => (
                <li key={c}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "hints" && (
          <div className="space-y-3">
            <p className="text-[12px] text-mute">Hints go from a nudge to a near-answer. They never shrink your tree; they only reduce the golden-leaf bonus.</p>
            {problem.hints.slice(0, session.hintsUsed).map((h, i) => (
              <div key={i} className="border border-line bg-panel-2 p-3 text-[12px]">
                <div className="mb-1 font-pixel text-[10px] uppercase tracking-widest text-accent">Hint {i + 1}</div>
                {h}
              </div>
            ))}
            {session.hintsUsed < problem.hints.length ? (
              <button type="button" onClick={onRevealHint} className="border border-line-strong px-3 py-1.5 text-[12px] text-ink hover:border-accent hover:text-accent">
                Reveal hint {session.hintsUsed + 1} of {problem.hints.length}
              </button>
            ) : (
              <p className="text-[12px] text-dim">That was the last hint. The editorial is now unlocked.</p>
            )}
          </div>
        )}

        {tab === "editorial" &&
          (unlocked ? (
            <Markdown>{problem.editorial}</Markdown>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-[12px] text-mute">
              <PixelIcon name="lock" px={4} className="text-dim" />
              <p>The editorial unlocks after you solve this problem, or after you have viewed every hint.</p>
              <p className="text-dim">
                Hints viewed: {session.hintsUsed} / {problem.hints.length}
              </p>
            </div>
          ))}
      </div>
    </section>
  );
}
