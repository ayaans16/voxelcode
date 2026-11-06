"use client";

import { SEASONS, SEASON_LABELS } from "@/engine/seasons";
import { useSeason } from "@/storage/react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

const ICON: Record<string, PixelIconName> = {
  auto: "spark",
  spring: "blossom",
  summer: "sun",
  autumn: "leaf",
  winter: "snow",
};

/** A row of blocky season buttons. "Auto" follows the calendar. Writes the shared season setting. */
export function SeasonPicker({ compact = false }: { compact?: boolean }) {
  const { setting, set, season } = useSeason();
  const options = ["auto", ...SEASONS] as const;
  return (
    <div role="radiogroup" aria-label="Season" className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={setting === o}
          onClick={() => set(o)}
          title={o === "auto" ? `Auto (follows the calendar: ${SEASON_LABELS[season]})` : SEASON_LABELS[o]}
          className={"btn " + (setting === o ? "btn-on" : "") + (compact ? " px-2 py-1 text-[11px]" : " px-3 py-1.5 text-[12px]")}
        >
          <PixelIcon name={ICON[o]!} px={2} />
          {compact ? (o === "auto" ? "Auto" : "") : o === "auto" ? "Auto" : SEASON_LABELS[o]}
        </button>
      ))}
    </div>
  );
}
