"use client";

import { useEffect, useRef } from "react";
import { ForestScene, type ForestEntry } from "../ForestScene";
import type { Season } from "@/engine/seasons";

interface Props {
  entries: readonly ForestEntry[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
  reducedMotion: boolean;
  season?: Season;
  className?: string;
}

export function ForestCanvas({ entries, selected, onSelect, reducedMotion, season = "summer", className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ForestScene | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!host.current) return;
    const s = new ForestScene(host.current, { reducedMotion });
    s.onSelect = (slug) => onSelectRef.current(slug);
    scene.current = s;
    return () => {
      s.dispose();
      scene.current = null;
    };
    // created once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scene.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    scene.current?.setSeason(season);
    scene.current?.setEntries(entries);
    scene.current?.select(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  useEffect(() => {
    scene.current?.select(selected);
  }, [selected]);

  useEffect(() => {
    scene.current?.setSeason(season);
  }, [season]);

  return <div ref={host} className={className} role="img" aria-label="Your forest: one voxel tree for every solved problem. Drag to orbit, scroll to zoom, click a tree for details." />;
}
