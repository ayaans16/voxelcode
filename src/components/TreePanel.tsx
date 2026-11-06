"use client";

import type { Palette, Voxel } from "@/engine/types";
import { TreeCanvas } from "@/render/react/TreeCanvas";
import { PixelIcon } from "./PixelIcon";
import { SeasonPicker } from "./SeasonPicker";
import type { Season } from "@/engine/seasons";

interface Props {
  voxels: readonly Voxel[];
  palette: Palette;
  shown: number;
  progress: number;
  autumn: number;
  reducedMotion: boolean;
  completionSignal: number;
  speciesName: string;
  season: Season;
  evergreen?: boolean;
  solved: boolean;
  instant?: boolean;
}

function stageLabel(progress: number, solved: boolean): string {
  if (solved) return "Fully grown";
  if (progress < 0.15) return "Seed planted";
  if (progress < 0.5) return "Sprouting";
  if (progress < 0.85) return "Growing";
  return "Almost there";
}

export function TreePanel({ voxels, palette, shown, progress, autumn, reducedMotion, completionSignal, speciesName, season, evergreen, solved, instant }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <section aria-label="Your tree" className="block">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="badge">Your tree</span>
        <span className="text-[12px] font-bold text-ink">{speciesName}</span>
      </div>
      <div className="relative h-64 overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-25" />
        <TreeCanvas
          className="absolute inset-0"
          voxels={voxels}
          palette={palette}
          shown={shown}
          autumn={autumn}
          season={season}
          evergreen={evergreen}
          reducedMotion={reducedMotion}
          completionSignal={completionSignal}
          instant={instant}
          label={`${speciesName} tree, ${pct} percent grown`}
        />
        <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] text-dim">Drag to look around</p>
      </div>
      <div className="border-t border-line px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-mute">
            <PixelIcon name={solved ? "tree" : progress < 0.15 ? "seed" : "sapling"} px={2} />
            {stageLabel(progress, solved)}
          </span>
          <span className="tabular-nums text-ink">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Growth progress" className="h-3 border-2 border-line-strong bg-panel-2">
          <div className="h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-dim">
          {shown} / {voxels.length} voxels
        </p>
        <div className="mt-2">
          <SeasonPicker compact />
        </div>
      </div>
    </section>
  );
}
