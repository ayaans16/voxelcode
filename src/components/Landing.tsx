"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TreeCanvas } from "@/render/react/TreeCanvas";
import { SPECIES } from "@/engine/species";
import { generateTree } from "@/engine/generate";
import { visibleCount } from "@/engine/visible";
import type { SpeciesId } from "@/engine/types";
import { useReducedMotion, useSeason, useSettings } from "@/storage/react";
import { PixelIcon } from "./PixelIcon";
import { SeasonPicker } from "./SeasonPicker";

const DEMO: { id: SpeciesId; label: string }[] = [
  { id: "oak", label: "Oak" },
  { id: "willow", label: "Willow" },
  { id: "pine", label: "Pine" },
  { id: "cherry", label: "Cherry" },
  { id: "bamboo", label: "Bamboo" },
];

const STEPS = [
  { icon: "seed", title: "Plant", text: "Open a problem and a seed goes in the ground. Pick your approach to give it a first burst of growth." },
  { icon: "sapling", title: "Grow", text: "Every test you pass adds voxels, trunk first, then branches, then leaves. Growth only ever moves forward." },
  { icon: "tree", title: "Harvest", text: "Submit to finish the tree. It moves into your forest, where you can wander between everything you have solved." },
] as const;

export function Landing() {
  const { settings } = useSettings();
  const reduced = useReducedMotion(settings.reducedMotion);
  const { season } = useSeason();
  const [species, setSpecies] = useState<SpeciesId>("cherry");
  const [progress, setProgress] = useState(0.05);

  const voxels = useMemo(() => generateTree({ seed: 20260, species, difficulty: "medium" }), [species]);
  const shown = visibleCount(reduced ? 1 : progress, voxels.length);

  // Demo loop: grow, rest, start over.
  useEffect(() => {
    if (reduced) return;
    if (progress >= 1) {
      const t = setTimeout(() => setProgress(0.05), 3200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => Math.min(1, p + 0.018)), 110);
    return () => clearTimeout(t);
  }, [reduced, progress]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-8 lg:px-8">
      <section className="block overflow-hidden" aria-label="Live tree demo">
        <div className="relative lg:min-h-[640px]">
          <div className="grid-bg absolute inset-0" />
          <div className="relative order-2 h-[360px] lg:absolute lg:inset-0 lg:h-auto">
          <TreeCanvas
            className="absolute inset-0"
            voxels={voxels}
            palette={SPECIES[species].palette}
            evergreen={SPECIES[species].evergreen}
            season={season}
            shown={shown}
            reducedMotion={reduced}
            label={`${SPECIES[species].name} tree growing`}
          />
          </div>
          <div className="relative z-10 p-5 sm:p-8 lg:absolute lg:left-0 lg:top-0 lg:w-[440px]">
            <div className="block bg-panel/95 p-6">
              <span className="badge">Voxel coding practice</span>
              <h1 className="pixel-title mt-4 text-[1.9rem] text-ink sm:text-[2.3rem]">Every solve plants a tree.</h1>
              <p className="mt-4 text-mute">
                Practice problems in Python or JavaScript. Pass tests and a procedural voxel tree grows beside your code. Finish, and it takes root in your forest.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/problems" className="btn btn-primary px-6 py-3 text-[13px]">
                  Start planting
                </Link>
                <Link href="/forest" className="btn px-5 py-3 text-[13px]">
                  Visit the forest
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t-2 border-line-strong bg-panel px-5 py-3">
          <div role="group" aria-label="Species" className="flex flex-wrap gap-1.5">
            {DEMO.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={species === d.id}
                onClick={() => {
                  setSpecies(d.id);
                  setProgress(0.05);
                }}
                className={"btn px-3 py-1.5 text-[12px] " + (species === d.id ? "btn-on" : "")}
              >
                {d.label}
              </button>
            ))}
          </div>
          <SeasonPicker />
          <span className="ml-auto text-[11px] tabular-nums text-dim">
            {Math.round((reduced ? 1 : progress) * 100)}% grown - {shown} / {voxels.length} voxels
          </span>
        </div>
      </section>

      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="block p-5">
            <div className="flex items-center justify-between">
              <PixelIcon name={s.icon} px={5} />
              <span className="font-pixel text-[11px] text-dim">Step {i + 1}</span>
            </div>
            <h2 className="pixel-title mt-4 text-xl">{s.title}</h2>
            <p className="mt-2 text-[13px] text-mute">{s.text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-[12px] text-dim">Local-first: your progress stays in this browser. No accounts, no tracking. Nothing ever dies, and a missed day just turns the leaves green again.</p>
    </div>
  );
}
