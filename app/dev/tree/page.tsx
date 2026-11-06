"use client";

/**
 * Dev playground: a fake progress slider drives the voxel tree.
 * Handy for tuning species and for developing your oak generator visually.
 */
import { useMemo, useState } from "react";
import { Select } from "@/components/Select";
import { TreeCanvas } from "@/render/react/TreeCanvas";
import { SPECIES, SPECIES_IDS } from "@/engine/species";
import { generateTree } from "@/engine/generate";
import { seedFromSlug } from "@/engine/prng";
import { visibleCount } from "@/engine/visible";
import { SEASONS, type Season } from "@/engine/seasons";
import { DIFFICULTIES, type Difficulty, type SpeciesId } from "@/engine/types";

const field = "border border-line bg-panel px-2 py-1 text-[12px] text-ink";

export default function TreePlayground() {
  const [species, setSpecies] = useState<SpeciesId>("oak");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [slug, setSlug] = useState("two-sum");
  const [progress, setProgress] = useState(0.05);
  const [autumn, setAutumn] = useState(0);
  const [signal, setSignal] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [season, setSeason] = useState<Season>("summer");

  const voxels = useMemo(
    () => generateTree({ seed: seedFromSlug(slug), species, difficulty }),
    [slug, species, difficulty],
  );
  const shown = visibleCount(progress, voxels.length);
  const palette = SPECIES[species].palette;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 p-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <span className="badge">Tree playground</span>
        <div className="text-[12px] text-mute">Species<Select label="Species" className="mt-1 w-full" value={species} onChange={setSpecies} options={SPECIES_IDS.map((s) => ({ value: s, label: SPECIES[s].name }))} /></div>
        <div className="text-[12px] text-mute">Difficulty<Select label="Difficulty" className="mt-1 w-full" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} /></div>
        <label className="block text-[12px] text-mute">
          Seed (problem slug)
          <input className={field + " mt-1 block w-full"} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="block text-[12px] text-mute">
          Progress: {(progress * 100).toFixed(0)}% ({shown} / {voxels.length} voxels)
          <input type="range" min={0} max={1} step={0.005} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="mt-1 block w-full accent-[var(--accent)]" />
        </label>
        <label className="block text-[12px] text-mute">
          Streak tint: {(autumn * 100).toFixed(0)}%
          <input type="range" min={0} max={1} step={0.05} value={autumn} onChange={(e) => setAutumn(Number(e.target.value))} className="mt-1 block w-full accent-[var(--accent)]" />
        </label>
        <div className="text-[12px] text-mute">Season<Select label="Season" className="mt-1 w-full" value={season} onChange={setSeason} options={SEASONS.map((x) => ({ value: x, label: x }))} /></div>
        <label className="flex items-center gap-2 text-[12px] text-mute">
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />
          Reduced motion
        </label>
        <button
          className="btn btn-primary w-full px-4 py-2 text-[12px]"
          onClick={() => {
            setProgress(1);
            setSignal((s) => s + 1);
          }}
        >
          Complete (cascade)
        </button>
      </div>
      <div className="relative h-[70vh] border border-line bg-panel">
        <div className="grid-bg absolute inset-0 opacity-30" />
        <TreeCanvas
          className="absolute inset-0"
          voxels={voxels}
          palette={palette}
          shown={shown}
          autumn={autumn}
          season={season}
          evergreen={SPECIES[species].evergreen}
          reducedMotion={reduced}
          completionSignal={signal}
        />
      </div>
    </div>
  );
}
