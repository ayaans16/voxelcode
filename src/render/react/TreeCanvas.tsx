"use client";

import { useEffect, useRef } from "react";
import type { Palette, Voxel } from "@/engine/types";
import { VoxelScene } from "../VoxelScene";
import type { Season } from "@/engine/seasons";

interface Props {
  voxels: readonly Voxel[];
  palette: Palette;
  /** How many voxels are currently visible (floor(progress * N)). */
  shown: number;
  autumn?: number;
  season?: Season;
  evergreen?: boolean;
  reducedMotion?: boolean;
  /** Increment to play the completion cascade. */
  completionSignal?: number;
  /** Jump straight to `shown` without easing (e.g. when reopening a saved tree). */
  instant?: boolean;
  className?: string;
  label?: string;
}

/** Thin React wrapper around VoxelScene. All three.js state lives in the class. */
export function TreeCanvas({
  voxels,
  palette,
  shown,
  autumn = 0,
  season = "summer",
  evergreen = false,
  reducedMotion = false,
  completionSignal = 0,
  instant = false,
  className,
  label = "Voxel tree",
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<VoxelScene | null>(null);
  const lastSignal = useRef(completionSignal);
  const first = useRef(true);

  useEffect(() => {
    if (!host.current) return;
    const s = new VoxelScene(host.current, { reducedMotion });
    scene.current = s;
    return () => {
      s.dispose();
      scene.current = null;
      first.current = true;
    };
    // The scene is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    if (s.updateVoxels(voxels, palette)) {
      s.setAutumn(autumn);
      return;
    }
    s.setSeason(season, evergreen);
    s.setTree(voxels, palette, undefined, evergreen);
    s.setSeason(season, evergreen);
    s.setReducedMotion(reducedMotion);
    s.setProgressCount(shown, false);
    s.setAutumn(autumn);
    first.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voxels, palette]);

  useEffect(() => {
    scene.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    scene.current?.setAutumn(autumn);
  }, [autumn]);

  useEffect(() => {
    scene.current?.setSeason(season, evergreen);
  }, [season, evergreen]);

  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    s.setProgressCount(shown, !(instant || first.current));
    first.current = false;
  }, [shown, instant, voxels]);

  useEffect(() => {
    if (completionSignal !== lastSignal.current) {
      lastSignal.current = completionSignal;
      scene.current?.playCompletion();
    }
  }, [completionSignal]);

  return <div ref={host} className={className} role="img" aria-label={label} />;
}
