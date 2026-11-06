"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getProblem, speciesForProblem, starterFor } from "@/problems";
import { LANGUAGES, LANGUAGE_LABELS, FILE_EXTENSION, isNativeLanguage, type Language } from "@/problems/languages";
import { SPECIES } from "@/engine/species";
import { generateTree } from "@/engine/generate";
import { seedFromSlug } from "@/engine/prng";
import { visibleCount, autumnFactor } from "@/engine/visible";
import { applyAccents, medianSolveSeconds } from "@/engine/progress";
import { addActiveSeconds, createSession, isSolved, recordAttempt, recordCheckpoint, recordHint, sessionProgress, type Attempt, type Session } from "@/engine/session";
import { currentStreak, solveSecondsFor } from "@/engine/stats";
import { RunnerClient } from "@/runner/RunnerClient";
import { buildRunRequest } from "@/runner/problemRun";
import { summarizeResults } from "@/runner/summary";
import type { TestResult } from "@/runner/protocol";
import { useReducedMotion, useSeason, useSettings, useStorage } from "@/storage/react";
import { CodeEditor } from "./CodeEditor";
import { ResultsPanel, type ResultsView } from "./ResultsPanel";
import { CheckpointCard } from "./CheckpointCard";
import { TreePanel } from "./TreePanel";
import { ProblemLeftPane } from "./ProblemLeftPane";
import { ResizeHandle } from "./ResizeHandle";
import { useStoredSize } from "./useStoredSize";
import { PixelIcon } from "./PixelIcon";
import { Select } from "./Select";

const IDLE_CUTOFF_MS = 60_000;

/** Which native languages the local compile server can build (true/false once known, undefined while loading). */
function useRuntimes(): Partial<Record<"java" | "c" | "go", boolean>> {
  const [state, setState] = useState<Partial<Record<"java" | "c" | "go", boolean>>>({});
  useEffect(() => {
    let alive = true;
    fetch("/api/runtimes")
      .then((r) => r.json())
      .then((j: { enabled?: boolean; runtimes?: Record<"java" | "c" | "go", { available: boolean }> }) => {
        if (!alive) return;
        if (!j.enabled || !j.runtimes) setState({ java: false, c: false, go: false });
        else setState({ java: j.runtimes.java.available, c: j.runtimes.c.available, go: j.runtimes.go.available });
      })
      .catch(() => alive && setState({ java: false, c: false, go: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
const FLUSH_EVERY_MS = 10_000;

export function ProblemWorkspace({ slug }: { slug: string }) {
  const problem = useMemo(() => getProblem(slug), [slug]);
  if (!problem) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <p className="font-pixel text-accent">404 / No such problem</p>
        <Link href="/problems" className="mt-4 inline-block border border-line-strong px-4 py-2 text-[12px] hover:border-accent">
          Back to the roadmap
        </Link>
      </div>
    );
  }
  return <Workspace slug={slug} />;
}

function Workspace({ slug }: { slug: string }) {
  const problem = getProblem(slug)!;
  const storage = useStorage();
  const { settings, growth, loaded: settingsLoaded } = useSettings();
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const { season } = useSeason();

  const species = SPECIES[speciesForProblem(problem)];
  const seed = useMemo(() => seedFromSlug(slug), [slug]);
  const baseVoxels = useMemo(() => generateTree({ seed, species: species.id, difficulty: problem.difficulty }), [seed, species.id, problem.difficulty]);

  // ---- session (source of truth is the ref; state mirrors it for rendering) ----
  const sessionRef = useRef<Session | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [streak, setStreak] = useState(0);
  const dirty = useRef(false);
  const [completionSignal, setCompletionSignal] = useState(0);
  const [instantTree, setInstantTree] = useState(true);

  const commit = useCallback(
    (fn: (s: Session) => Session) => {
      const cur = sessionRef.current;
      if (!cur) return;
      const next = fn(cur);
      if (next === cur) return;
      sessionRef.current = next;
      setSession(next);
      dirty.current = true;
      void storage?.putSession(next).then(() => (dirty.current = false));
    },
    [storage],
  );

  // Load or create the session: opening a problem plants the seed.
  useEffect(() => {
    if (!storage || !settingsLoaded) return;
    let alive = true;
    (async () => {
      const all = await storage.listSessions();
      let s = all.find((x) => x.slug === slug);
      if (!s) {
        s = createSession({ slug, difficulty: problem.difficulty, species: species.id, seed, now: Date.now() }, growth);
        await storage.putSession(s);
      }
      if (!alive) return;
      sessionRef.current = s;
      setSession(s);
      setStreak(currentStreak(all, Date.now()));
      // The first frame shows the saved state instantly; later growth animates.
      setTimeout(() => setInstantTree(false), 400);
    })();
    return () => {
      alive = false;
    };
    // growth is intentionally read once at load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, settingsLoaded, slug]);

  // ---- active time: counts only while the tab is visible, focused, and recently used ----
  const lastInteraction = useRef(0);
  useEffect(() => {
    const bump = () => (lastInteraction.current = Date.now());
    bump();
    const events = ["keydown", "pointerdown", "pointermove", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const tick = setInterval(() => {
      const s = sessionRef.current;
      if (!s || isSolved(s)) return;
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      if (Date.now() - lastInteraction.current > IDLE_CUTOFF_MS) return;
      sessionRef.current = addActiveSeconds(s, 1);
      dirty.current = true;
    }, 1000);
    const flush = setInterval(() => {
      if (dirty.current && sessionRef.current) {
        dirty.current = false;
        void storage?.putSession(sessionRef.current);
      }
    }, FLUSH_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden" && sessionRef.current) void storage?.putSession(sessionRef.current);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(tick);
      clearInterval(flush);
      document.removeEventListener("visibilitychange", onHide);
      if (sessionRef.current) void storage?.putSession(sessionRef.current);
    };
  }, [storage]);

  // ---- editor state ----
  const [language, setLanguage] = useState<Language>("javascript");
  const runtimes = useRuntimes();
  const [code, setCode] = useState("");
  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const langInit = useRef(false);

  useEffect(() => {
    if (settingsLoaded && !langInit.current) {
      langInit.current = true;
      setLanguage(settings.defaultLanguage);
    }
  }, [settingsLoaded, settings.defaultLanguage]);

  useEffect(() => {
    if (!storage || !settingsLoaded) return;
    let alive = true;
    storage.getDraft(slug, language).then((d) => {
      if (alive) setCode(d?.code ?? starterFor(problem, language));
    });
    return () => {
      alive = false;
    };
  }, [storage, settingsLoaded, slug, language, problem]);

  const onCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        void storage?.putDraft({ slug, language, code: value, updatedAt: Date.now() });
      }, 500);
    },
    [storage, slug, language],
  );
  useEffect(() => () => clearTimeout(draftTimer.current), []);

  const [rightOpen, setRightOpen] = useState(true);

  // ---- running ----
  const runner = useRef<RunnerClient | null>(null);
  useEffect(() => {
    runner.current = new RunnerClient();
    return () => runner.current?.dispose();
  }, []);
  useEffect(() => {
    if (language === "python") void runner.current?.warmup("python");
  }, [language]);

  const [view, setView] = useState<ResultsView>({ kind: "idle" });
  const [running, setRunning] = useState(false);

  const execute = useCallback(
    async (which: "visible" | "hidden") => {
      if (running || !runner.current || !sessionRef.current) return;
      setRunning(true);
      setView({ kind: "running", which, status: "loading", language });
      const outcome = await runner.current.run(buildRunRequest(problem, language, code, which), {
        onStatus: (status) => setView({ kind: "running", which, status, language }),
      });
      setRunning(false);
      if (outcome.kind === "fatal" && outcome.results.length === 0) {
        setView({ kind: "fatal", message: outcome.message, line: outcome.line, errorKind: outcome.error });
        return;
      }
      const results: TestResult[] = outcome.results;
      const summary = summarizeResults(results);
      const attempt: Attempt = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        problemSlug: slug,
        language,
        code,
        timestamp: Date.now(),
        runtimeMs: results.reduce((t, r) => t + r.runtimeMs, 0),
        summary: {
          kind: which,
          passed: summary.passed,
          total: summary.total,
          failedCategories: summary.failedCategories,
          allPassed: summary.allPassed,
          anyTimeout: summary.anyTimeout,
          anyError: summary.anyError,
        },
      };
      const wasSolved = isSolved(sessionRef.current);
      let median: number | undefined;
      if (storage) median = medianSolveSeconds(solveSecondsFor(await storage.listSessions(), problem.difficulty, slug));
      commit((s) => recordAttempt(s, attempt, { growth, medianSeconds: median }));
      setView(which === "visible" ? { kind: "visible", results } : { kind: "hidden", results });
      if (!wasSolved && sessionRef.current && isSolved(sessionRef.current)) setCompletionSignal((n) => n + 1);
    },
    [running, problem, language, code, slug, storage, commit, growth],
  );

  const executeRef = useRef(execute);
  useEffect(() => {
    executeRef.current = execute;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        void executeRef.current(e.shiftKey ? "hidden" : "visible");
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        setRightOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- layout ----
  const left = useStoredSize("vc-left", 400, 280, 640);
  const right = useStoredSize("vc-right", 340, 260, 520);
  const results = useStoredSize("vc-results", 230, 90, 520);

  // ---- derived tree ----
  const progress = session ? sessionProgress(session) : 0;
  const shown = visibleCount(progress, baseVoxels.length);
  const accents = session?.accents;
  const solvedNow = session ? isSolved(session) : false;
  const voxels = useMemo(() => (accents && solvedNow ? applyAccents(baseVoxels, accents, seed) : baseVoxels), [baseVoxels, accents, solvedNow, seed]);
  const autumn = autumnFactor(streak, growth.autumnFullStreak);

  if (!session) {
    return <div className="p-10 text-[12px] text-dim">Planting your seed...</div>;
  }
  const solved = isSolved(session);

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-[560px] flex-col">
      {/* toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-bg px-4">
        <Link href="/problems" className="flex items-center gap-1.5 text-[12px] text-mute hover:text-ink">
          <PixelIcon name="chevron" px={2} className="rotate-180" />
          Roadmap
        </Link>
        <span className="text-line-strong">/</span>
        <span className="truncate text-[12px] font-bold text-ink">{problem.title}</span>
        {solved && <span className="border border-pass/50 px-2 py-0.5 text-[10px] font-bold uppercase text-pass">Solved</span>}
        <div className="ml-auto flex items-center gap-2">
          <Select<Language>
            label="Language"
            value={language}
            onChange={setLanguage}
            align="right"
            className="w-36"
            options={LANGUAGES.map((l) => {
              const missing = isNativeLanguage(l) && runtimes[l] === false;
              return { value: l, label: LANGUAGE_LABELS[l], hint: missing ? "not installed" : `.${FILE_EXTENSION[l]}`, disabled: missing && l !== language };
            })}
          />
          <button
            type="button"
            onClick={() => onCodeChange(starterFor(problem, language))}
            className="btn px-3 py-1 text-[12px] font-normal"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => void execute("visible")}
            className="btn px-3 py-1 text-[12px]"
            title="Ctrl/Cmd + Enter"
          >
            <span className="inline-flex items-center gap-1.5">
              <PixelIcon name="play" px={2} />
              Run
            </span>
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => void execute("hidden")}
            className="btn btn-primary px-4 py-1 text-[12px]"
            title="Ctrl/Cmd + Shift + Enter"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => setRightOpen((o) => !o)}
            aria-pressed={rightOpen}
            aria-label={rightOpen ? "Collapse tree panel" : "Expand tree panel"}
            title="Toggle tree panel (Ctrl/Cmd + \)"
            className={"btn px-2 py-1.5 " + (rightOpen ? "btn-on" : "")}
          >
            <PixelIcon name="panelRight" px={2} />
          </button>
        </div>
      </div>

      {/* three panes */}
      <div className="flex min-h-0 flex-1">
        <div style={{ width: left.size }} className="min-w-0 shrink-0">
          <ProblemLeftPane problem={problem} session={session} onRevealHint={() => commit((s) => recordHint(s, s.hintsUsed))} />
        </div>
        <ResizeHandle orientation="vertical" label="Resize problem pane" onStart={left.begin} onResize={left.resizeBy} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 bg-panel">
            <CodeEditor path={`${slug}.${FILE_EXTENSION[language]}`} language={language} value={code} onChange={onCodeChange} onRun={() => void execute("visible")} onSubmit={() => void execute("hidden")} />
          </div>
          <ResizeHandle orientation="horizontal" label="Resize results panel" onStart={results.begin} onResize={(d) => results.resizeBy(-d)} />
          <div style={{ height: results.size }} className="shrink-0">
            <ResultsPanel view={view} problem={problem} />
          </div>
        </div>

        {rightOpen && (
          <>
            <ResizeHandle orientation="vertical" label="Resize tree panel" onStart={right.begin} onResize={(d) => right.resizeBy(-d)} />
            <aside style={{ width: right.size }} className="min-w-0 shrink-0 space-y-3 overflow-auto bg-bg p-3">
              <TreePanel
                voxels={voxels}
                palette={species.palette}
                shown={shown}
                progress={progress}
                autumn={autumn}
                reducedMotion={reducedMotion}
                completionSignal={completionSignal}
                speciesName={species.name}
                season={season}
                evergreen={species.evergreen}
                solved={solved}
                instant={instantTree}
              />
              <CheckpointCard problem={problem} session={session} growth={growth} onAnswer={(a) => commit((s) => recordCheckpoint(s, a, growth))} />
              <dl className="grid grid-cols-3 gap-px border border-line bg-line text-center text-[11px]">
                {[
                  ["Submits", session.attempts.filter((a) => a.summary.kind === "hidden").length],
                  ["Hints", session.hintsUsed],
                  ["Streak", `${streak}d`],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-panel py-2">
                    <dt className="text-dim">{k}</dt>
                    <dd className="font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
