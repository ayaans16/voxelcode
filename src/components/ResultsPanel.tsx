"use client";

import { useState } from "react";
import type { TestResult } from "@/runner/protocol";
import { describeHiddenFailure, categoryLabel, summarizeResults } from "@/runner/summary";
import { lineDiff } from "@/runner/diff";
import { formatValue } from "@/runner/format";
import type { Problem } from "@/problems/schema";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

export type ResultsView =
  | { kind: "idle" }
  | { kind: "running"; which: "visible" | "hidden"; status: "loading" | "compiling" | "running"; language: string }
  | { kind: "visible"; results: TestResult[] }
  | { kind: "hidden"; results: TestResult[] }
  | { kind: "fatal"; message: string; line?: number; errorKind: string };

const STATUS: Record<TestResult["status"], { label: string; icon: PixelIconName; color: string }> = {
  pass: { label: "PASS", icon: "check", color: "text-pass" },
  fail: { label: "FAIL", icon: "cross", color: "text-fail" },
  error: { label: "ERROR", icon: "bolt", color: "text-warn" },
  timeout: { label: "TIME LIMIT", icon: "clock", color: "text-warn" },
};

function StatusTag({ status }: { status: TestResult["status"] }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-pixel text-[10px] tracking-wider ${s.color}`}>
      <PixelIcon name={s.icon} px={2} />
      {s.label}
    </span>
  );
}

function Diff({ expected, actual }: { expected: string; actual: string }) {
  const ops = lineDiff(expected, actual);
  return (
    <div className="grid gap-px border border-line bg-line text-[12px] sm:grid-cols-2">
      {(["expected", "actual"] as const).map((side) => (
        <div key={side} className="min-w-0 bg-panel-2">
          <div className="border-b border-line px-2 py-1 font-pixel text-[10px] uppercase tracking-widest text-dim">{side === "expected" ? "Expected" : "Your output"}</div>
          <pre className="max-h-48 overflow-auto p-2 leading-5">
            {ops
              .filter((o) => o.kind === "same" || (side === "expected" ? o.kind === "del" : o.kind === "add"))
              .map((o, i) => {
                const changed = o.kind !== "same";
                const glyph = changed ? (side === "expected" ? "- " : "+ ") : "  ";
                return (
                  <div key={i} className={changed ? (side === "expected" ? "bg-pass/15 text-pass" : "bg-fail/15 text-fail") : "text-mute"}>
                    {glyph}
                    {o.line}
                  </div>
                );
              })}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ResultRow({ result, index, problem, defaultOpen }: { result: TestResult; index: number; problem: Problem; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const test = problem.visibleTests[index];
  const bad = result.status !== "pass";
  const canOpen = bad || result.stdout.length > 0;
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!canOpen}
        aria-expanded={canOpen ? open : undefined}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] hover:bg-panel-2 disabled:cursor-default disabled:hover:bg-transparent"
      >
        <StatusTag status={result.status} />
        <span className="text-ink">Test {index + 1}</span>
        <span className="text-dim">{categoryLabel(result.category)}</span>
        <span className="ml-auto tabular-nums text-dim">{result.runtimeMs < 1 ? "<1" : Math.round(result.runtimeMs)} ms</span>
        {canOpen && <PixelIcon name={open ? "chevronDown" : "chevron"} px={2} className="text-dim" />}
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3 text-[12px]">
          {test && (
            <div>
              <div className="mb-1 font-pixel text-[10px] uppercase tracking-widest text-dim">Input</div>
              <pre className="overflow-auto border border-line bg-panel-2 p-2">
                {problem.signature.params.map((p, i) => `${p.name} = ${formatValue(test.args[i]).replace(/\n\s*/g, " ")}`).join("\n")}
              </pre>
            </div>
          )}
          {result.error && (
            <div className="border border-warn/50 bg-warn/10 p-2 text-warn">
              <span className="font-bold">{result.error.name}</span>
              {result.error.line ? ` (line ${result.error.line})` : ""}: {result.error.message}
            </div>
          )}
          {result.status === "fail" && result.actual !== undefined && <Diff expected={result.expected} actual={result.actual} />}
          {result.stdout && (
            <div>
              <div className="mb-1 font-pixel text-[10px] uppercase tracking-widest text-dim">Printed output</div>
              <pre className="max-h-32 overflow-auto border border-line bg-panel-2 p-2 text-mute">{result.stdout}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function ResultsPanel({ view, problem }: { view: ResultsView; problem: Problem }) {
  return (
    <section aria-label="Test results" aria-live="polite" className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="font-pixel text-[10px] uppercase tracking-widest text-accent">Results</span>
        {view.kind === "visible" && <Tally results={view.results} />}
        {view.kind === "hidden" && <Tally results={view.results} />}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {view.kind === "idle" && (
          <p className="p-4 text-[12px] text-dim">
            Run checks your code on the visible tests and grows the tree. Submit runs the hidden tests. Try <kbd className="border border-line-strong px-1">Ctrl/Cmd</kbd> + <kbd className="border border-line-strong px-1">Enter</kbd>.
          </p>
        )}
        {view.kind === "running" && (
          <p className="flex items-center gap-2 p-4 text-[12px] text-mute">
            <PixelIcon name="clock" px={2} />
            {view.status === "compiling"
              ? "Compiling..."
              : view.status === "loading" && view.language === "python"
                ? "Loading Python (first run takes a few seconds)..."
                : view.which === "hidden"
                  ? "Running hidden tests..."
                  : "Running visible tests..."}
          </p>
        )}
        {view.kind === "fatal" && (
          <div className="p-4 text-[12px]">
            <div className="border border-warn/50 bg-warn/10 p-3 text-warn">
              <div className="font-bold">
                {view.errorKind === "syntax" || view.errorKind === "compile"
                  ? "Your code didn't compile"
                  : view.errorKind === "missing_function"
                    ? "Function not found"
                    : view.errorKind === "unavailable"
                      ? "This language can't run right now"
                      : "Something went wrong"}
              </div>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-[12px]">
                {view.message}
                {view.line && view.errorKind !== "compile" ? ` (line ${view.line})` : ""}
              </pre>
            </div>
            <p className="mt-2 text-dim">Nothing was lost: your tree stays exactly as it was.</p>
          </div>
        )}
        {view.kind === "visible" && (
          <ul>
            {view.results.map((r, i) => (
              <ResultRow key={r.testId} result={r} index={i} problem={problem} defaultOpen={r.status !== "pass" && view.results.findIndex((x) => x.status !== "pass") === i} />
            ))}
          </ul>
        )}
        {view.kind === "hidden" && <HiddenSummary results={view.results} />}
      </div>
    </section>
  );
}

function Tally({ results }: { results: TestResult[] }) {
  const s = summarizeResults(results);
  return (
    <span className={`text-[11px] ${s.allPassed ? "text-pass" : "text-mute"}`}>
      {s.passed} / {s.total} passed
    </span>
  );
}

function HiddenSummary({ results }: { results: TestResult[] }) {
  const s = summarizeResults(results);
  return (
    <div className="space-y-3 p-4 text-[12px]">
      <p className={s.allPassed ? "text-pass" : "text-ink"}>{describeHiddenFailure(s)}</p>
      <ul className="space-y-1.5">
        {Object.entries(s.byCategory).map(([cat, t]) => {
          const ok = t.passed === t.total;
          const slow = results.some((r) => r.category === cat && r.status === "timeout");
          return (
            <li key={cat} className="flex items-center gap-3 border border-line bg-panel-2 px-3 py-2">
              <StatusTag status={ok ? "pass" : slow ? "timeout" : "fail"} />
              <span className="text-ink">{categoryLabel(cat)}</span>
              <span className="ml-auto tabular-nums text-dim">
                {t.passed} / {t.total}
              </span>
            </li>
          );
        })}
      </ul>
      {!s.allPassed && <p className="text-dim">Your tree keeps everything it has grown. Fix what is left and submit again.</p>}
      {results.some((r) => r.error && r.status === "timeout") && <p className="text-warn">Time limit exceeded on at least one test: look for a faster approach.</p>}
    </div>
  );
}
