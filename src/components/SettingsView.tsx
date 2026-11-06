"use client";

import { useState } from "react";
import { DEFAULT_GROWTH, sanitizeGrowthConstants, type GrowthConstants } from "@/engine/constants";
import { useSettings, useStorage } from "@/storage/react";
import { SeasonPicker } from "./SeasonPicker";
import { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/problems/languages";
import type { MotionSetting, ThemeSetting } from "@/storage/types";

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={"btn px-3 py-1.5 text-[12px] " + (value === o.id ? "btn-on" : "")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const GROWTH_FIELDS: { key: keyof GrowthConstants; label: string; hint: string; min: number; max: number; step: number }[] = [
  { key: "opened", label: "Open a problem", hint: "Growth for planting the seed", min: 0, max: 0.2, step: 0.01 },
  { key: "checkpointCorrect", label: "Checkpoint (correct)", hint: "Growth burst for the right approach", min: 0, max: 0.4, step: 0.01 },
  { key: "checkpointWrong", label: "Checkpoint (wrong)", hint: "Smaller burst: learning is rewarded either way", min: 0, max: 0.4, step: 0.01 },
  { key: "visibleMax", label: "Visible tests (max)", hint: "Scaled by the fraction of tests passing", min: 0, max: 0.6, step: 0.01 },
  { key: "goldenMax", label: "Golden leaves (max)", hint: "Share of leaves for a first-try pass", min: 0, max: 0.5, step: 0.01 },
  { key: "hintPenalty", label: "Hint cost", hint: "Share of the golden bonus each hint removes", min: 0, max: 1, step: 0.05 },
  { key: "blossomMax", label: "Speed blossoms (max)", hint: "Extra blossoms for beating your median time", min: 0, max: 0.5, step: 0.01 },
  { key: "autumnFullStreak", label: "Autumn streak (days)", hint: "Streak length for fully golden leaves", min: 1, max: 60, step: 1 },
];

export function SettingsView() {
  const storage = useStorage();
  const { settings, growth, loaded, update } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!loaded) return <div className="p-10 text-[12px] text-dim">Loading...</div>;

  const setGrowth = (key: keyof GrowthConstants, value: number) => {
    const merged = sanitizeGrowthConstants({ ...settings.growth, [key]: value });
    void update({ growth: { ...settings.growth, [key]: merged[key] } });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-10">
      <span className="badge">Preferences</span>
      <h1 className="pixel-title mt-4 text-4xl sm:text-5xl">Settings</h1>

      <section className="mt-10 space-y-6 border-t border-line pt-6">
        <div>
          <h2 className="font-bold text-ink">Theme</h2>
          <p className="mb-2 text-[12px] text-dim">System follows your OS setting.</p>
          <Segmented<ThemeSetting>
            label="Theme"
            value={settings.theme}
            onChange={(theme) => void update({ theme })}
            options={[
              { id: "system", label: "System" },
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
            ]}
          />
        </div>
        <div>
          <h2 className="font-bold text-ink">Season</h2>
          <p className="mb-2 text-[12px] text-dim">Changes how every tree looks (leaf colors, ground, falling petals, leaves or snow). Auto follows the calendar.</p>
          <SeasonPicker />
        </div>
        <div>
          <h2 className="font-bold text-ink">Reduced motion</h2>
          <p className="mb-2 text-[12px] text-dim">When on, trees jump to their final state: no easing, cascade, or orbit.</p>
          <Segmented<MotionSetting>
            label="Reduced motion"
            value={settings.reducedMotion}
            onChange={(reducedMotion) => void update({ reducedMotion })}
            options={[
              { id: "system", label: "Follow system" },
              { id: "reduce", label: "Always reduce" },
              { id: "full", label: "Full motion" },
            ]}
          />
        </div>
        <div>
          <h2 className="font-bold text-ink">Default language</h2>
          <p className="mb-2 text-[12px] text-dim">Used when you open a problem.</p>
          <Segmented<Language>
            label="Default language"
            value={settings.defaultLanguage}
            onChange={(defaultLanguage) => void update({ defaultLanguage })}
            options={LANGUAGES.map((l) => ({ id: l, label: LANGUAGE_LABELS[l] }))}
          />
          <p className="mt-2 text-[11px] text-dim">Java, C and Go are compiled by a local server using the JDK, C compiler and Go toolchain on this machine.</p>
        </div>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-bold text-ink">Growth constants</h2>
            <p className="text-[12px] text-dim">How much each action grows your tree. Hidden tests always fill whatever is left, so a full pass is always 100%.</p>
          </div>
          <button type="button" onClick={() => void update({ growth: {} })} className="border border-line-strong px-3 py-1.5 text-[12px] text-mute hover:border-accent hover:text-ink">
            Reset to defaults
          </button>
        </div>
        <ul className="mt-5 space-y-5">
          {GROWTH_FIELDS.map((f) => {
            const id = `g-${f.key}`;
            const isPct = f.key !== "autumnFullStreak" && f.key !== "hintPenalty";
            const v = growth[f.key];
            const fmt = f.key === "autumnFullStreak" ? `${v} days` : `${Math.round(v * 100)}%`;
            return (
              <li key={f.key}>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={id} className="text-[13px] text-ink">
                    {f.label}
                  </label>
                  <span className="tabular-nums text-accent">
                    {fmt}
                    {v !== DEFAULT_GROWTH[f.key] && <span className="ml-2 text-[10px] text-dim">(default {f.key === "autumnFullStreak" ? DEFAULT_GROWTH[f.key] : `${Math.round(DEFAULT_GROWTH[f.key] * 100)}%`})</span>}
                  </span>
                </div>
                <input id={id} type="range" min={f.min} max={f.max} step={f.step} value={v} onChange={(e) => setGrowth(f.key, Number(e.target.value))} className="mt-1 block w-full accent-[var(--accent)]" aria-describedby={`${id}-hint`} />
                <p id={`${id}-hint`} className="text-[11px] text-dim">
                  {f.hint}
                  {isPct ? "" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-bold text-ink">Your data</h2>
        <p className="mb-3 text-[12px] text-dim">Progress lives only in this browser (IndexedDB). Export and import are on the Forest page.</p>
        {!confirmReset ? (
          <button type="button" onClick={() => setConfirmReset(true)} className="border border-line-strong px-3 py-1.5 text-[12px] text-mute hover:border-warn hover:text-warn">
            Erase all progress...
          </button>
        ) : (
          <div className="space-y-2 border border-warn/50 bg-warn/10 p-4 text-[12px]">
            <p className="text-ink">This permanently deletes every session, draft and setting in this browser. Export a backup first if you might want it.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await storage?.clearAll();
                  setConfirmReset(false);
                }}
                className="bg-warn px-3 py-1 font-bold text-accent-ink"
              >
                Yes, erase everything
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="border border-line-strong px-3 py-1 text-ink">
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
