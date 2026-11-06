"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { PROBLEMS, getProblem, speciesForProblem } from "@/problems";
import { SPECIES } from "@/engine/species";
import { generateTree } from "@/engine/generate";
import { forestSlot } from "@/engine/forest";
import { applyAccents } from "@/engine/progress";
import { isSolved } from "@/engine/session";
import { autumnFactor } from "@/engine/visible";
import { forestStats, heatmap } from "@/engine/stats";
import type { SpeciesId } from "@/engine/types";
import { ForestCanvas } from "@/render/react/ForestCanvas";
import type { ForestEntry } from "@/render/ForestScene";
import { useReducedMotion, useSeason, useSessions, useSettings, useStorage } from "@/storage/react";
import { SeasonPicker } from "./SeasonPicker";
import { Heatmap } from "./Heatmap";
import { PixelIcon } from "./PixelIcon";

const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
};

function Bar({ label, value, max, swatch }: { label: string; value: number; max: number; swatch?: string }) {
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span className="flex w-28 shrink-0 items-center gap-1.5 truncate text-mute">
        {swatch && <span aria-hidden className="h-2.5 w-2.5 shrink-0" style={{ background: swatch }} />}
        {label}
      </span>
      <span className="h-2 flex-1 bg-panel-2">
        <span className="block h-full bg-accent" style={{ width: `${max === 0 ? 0 : (value / max) * 100}%` }} />
      </span>
      <span className="w-5 text-right tabular-nums text-ink">{value}</span>
    </li>
  );
}

export function ForestView() {
  const storage = useStorage();
  const { sessions, loaded } = useSessions();
  const { settings, growth } = useSettings();
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const { season } = useSeason();
  const [selected, setSelected] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<unknown | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const solved = useMemo(() => sessions.filter(isSolved).sort((a, b) => (a.solvedAt ?? 0) - (b.solvedAt ?? 0)).filter((s) => getProblem(s.slug)), [sessions]);
  const stats = useMemo(() => forestStats(sessions, now), [sessions, now]);
  const counts = useMemo(() => heatmap(sessions), [sessions]);
  const autumn = autumnFactor(stats.currentStreak, growth.autumnFullStreak);

  const entries = useMemo<ForestEntry[]>(
    () =>
      solved.map((s, i) => {
        const problem = getProblem(s.slug)!;
        const species = SPECIES[speciesForProblem(problem)];
        const base = generateTree({ seed: s.seed, species: species.id, difficulty: problem.difficulty });
        const voxels = s.accents ? applyAccents(base, s.accents, s.seed) : base;
        const slot = forestSlot(i, s.slug);
        return { slug: s.slug, voxels, palette: species.palette, autumn, evergreen: species.evergreen, x: slot.x, z: slot.z };
      }),
    [solved, autumn],
  );

  const selectedSession = solved.find((s) => s.slug === selected);
  const selectedProblem = selected ? getProblem(selected) : undefined;
  const maxSpecies = Math.max(0, ...Object.values(stats.bySpecies));
  const maxDiff = Math.max(0, ...Object.values(stats.byDifficulty));

  async function doExport() {
    if (!storage) return;
    const bundle = await storage.exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxelcode-forest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: "ok", text: `Exported ${bundle.sessions.length} sessions.` });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      setPendingImport(JSON.parse(await file.text()));
      setMessage(null);
    } catch {
      setPendingImport(null);
      setMessage({ kind: "error", text: "That file is not valid JSON." });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function doImport(mode: "merge" | "replace") {
    if (!storage || pendingImport === null) return;
    try {
      const res = await storage.importAll(pendingImport, mode);
      setMessage({ kind: "ok", text: `Imported ${res.sessions} sessions (${mode}).` });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    }
    setPendingImport(null);
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-[560px] flex-col lg:flex-row">
      <div className="relative min-h-[320px] flex-1 border-b border-line lg:border-b-0 lg:border-r">
        <div className="grid-bg absolute inset-0 opacity-20" />
        <ForestCanvas className="absolute inset-0" entries={entries} selected={selected} onSelect={setSelected} reducedMotion={reducedMotion} season={season} />
        <div className="absolute left-4 top-3 flex flex-wrap items-center gap-3">
          <span className="badge">Your forest</span>
          <SeasonPicker compact />
        </div>
        {loaded && solved.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <PixelIcon name="seed" px={6} />
            <p className="font-extrabold text-ink">Your forest is empty</p>
            <p className="max-w-xs text-[12px] text-mute">Solve a problem and its tree will take root here.</p>
            <Link href="/problems" className="btn btn-primary px-4 py-2 text-[12px]">
              Plant a seed
            </Link>
          </div>
        )}
        <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[10px] text-dim">Drag to orbit - scroll to zoom - right-drag to pan - click a tree</p>

        {selectedSession && selectedProblem && (
          <div className="block absolute bottom-8 left-4 w-72 p-4 text-[12px]" role="dialog" aria-label="Selected tree">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-pixel text-[10px] uppercase tracking-widest text-accent">{SPECIES[selectedSession.species].name}</p>
                <h2 className="mt-1 text-base font-extrabold text-ink">{selectedProblem.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="text-dim hover:text-ink">
                <PixelIcon name="cross" px={2} />
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <dt className="text-dim">Solved</dt>
              <dd className="text-ink">{new Date(selectedSession.solvedAt!).toLocaleDateString()}</dd>
              <dt className="text-dim">Time taken</dt>
              <dd className="text-ink">{fmtDuration(selectedSession.solveSeconds ?? selectedSession.activeSeconds)}</dd>
              <dt className="text-dim">Attempts</dt>
              <dd className="text-ink">{selectedSession.attempts.filter((a) => a.summary.kind === "hidden").length} submits, {selectedSession.attempts.length} runs</dd>
              <dt className="text-dim">Difficulty</dt>
              <dd className="text-ink">{selectedProblem.difficulty}</dd>
              <dt className="text-dim">Bonuses</dt>
              <dd className="text-ink">
                {[selectedSession.firstTryFullPass ? "first try" : null, (selectedSession.accents?.golden ?? 0) > 0 ? "golden leaves" : null, (selectedSession.accents?.blossom ?? 0) > 0 ? "fast solve blossoms" : null].filter(Boolean).join(", ") || "none"}
              </dd>
            </dl>
            <Link href={`/problems/${selectedProblem.slug}`} className="mt-3 inline-block border border-line-strong px-3 py-1.5 font-bold text-ink hover:border-accent hover:text-accent">
              Open problem
            </Link>
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 space-y-6 overflow-auto bg-bg p-5 lg:w-[340px]" aria-label="Forest statistics">
        <section>
          <h2 className="badge">Stats</h2>
          <dl className="mt-3 grid grid-cols-2 gap-px border border-line bg-line text-center">
            {[
              ["Trees", `${stats.solved} / ${PROBLEMS.length}`],
              ["Streak", `${stats.currentStreak}d`],
              ["Best streak", `${stats.longestStreak}d`],
              ["Total time", fmtDuration(stats.totalActiveSeconds)],
            ].map(([k, v]) => (
              <div key={k} className="bg-panel py-3">
                <dt className="text-[10px] text-dim">{k}</dt>
                <dd className="text-base font-extrabold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {stats.currentStreak > 0 && <p className="mt-2 text-[11px] text-mute">Your leaves are shifting toward autumn gold ({Math.round(autumn * 100)}%). Break the streak and they simply go green again.</p>}
        </section>

        <section>
          <h2 className="badge">By species</h2>
          <ul className="mt-3 space-y-1.5">
            {Object.entries(stats.bySpecies).length === 0 && <li className="text-[11px] text-dim">Nothing yet.</li>}
            {(Object.entries(stats.bySpecies) as [SpeciesId, number][]).map(([id, n]) => (
              <Bar key={id} label={SPECIES[id].name} value={n} max={maxSpecies} swatch={`#${SPECIES[id].palette.leaf.toString(16).padStart(6, "0")}`} />
            ))}
          </ul>
        </section>

        <section>
          <h2 className="badge">By difficulty</h2>
          <ul className="mt-3 space-y-1.5">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <Bar key={d} label={d} value={stats.byDifficulty[d]} max={maxDiff} />
            ))}
          </ul>
        </section>

        <section>
          <h2 className="badge">Activity</h2>
          <div className="mt-3">
            <Heatmap counts={counts} now={now} />
          </div>
        </section>

        <section>
          <h2 className="badge">Trees</h2>
          <ul className="mt-3 space-y-1">
            {solved.length === 0 && <li className="text-[11px] text-dim">No trees yet.</li>}
            {solved.map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => setSelected(s.slug)}
                  aria-pressed={selected === s.slug}
                  className={"flex w-full items-center justify-between border px-2.5 py-1.5 text-left text-[12px] " + (selected === s.slug ? "border-accent text-accent" : "border-line text-mute hover:text-ink")}
                >
                  <span>{getProblem(s.slug)?.title}</span>
                  <span className="text-[10px] text-dim">{SPECIES[s.species].name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="badge">Your data</h2>
          <p className="mt-2 text-[11px] text-dim">Everything lives in this browser. Export a JSON backup any time, or move it to another device.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={doExport} className="btn flex-1 px-3 py-1.5 text-[12px]">
              Export JSON
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn flex-1 px-3 py-1.5 text-[12px]">
              Import JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a voxelcode export file" onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
          {pendingImport !== null && (
            <div className="mt-3 space-y-2 border border-accent/50 bg-accent-soft p-3 text-[12px]">
              <p className="text-ink">How should this file be imported?</p>
              <p className="text-mute">Merge keeps whichever copy of each problem has more progress. Replace wipes this browser&apos;s data first.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => void doImport("merge")} className="bg-accent px-3 py-1 font-bold text-accent-ink">
                  Merge
                </button>
                <button type="button" onClick={() => void doImport("replace")} className="border border-line-strong px-3 py-1 font-bold text-ink hover:border-accent">
                  Replace
                </button>
                <button type="button" onClick={() => setPendingImport(null)} className="px-3 py-1 text-mute hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {message && (
            <p role="status" className={"mt-3 border px-3 py-2 text-[12px] " + (message.kind === "ok" ? "border-pass/50 text-pass" : "border-warn/50 text-warn")}>
              {message.kind === "ok" ? "OK: " : "Problem: "}
              {message.text}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
