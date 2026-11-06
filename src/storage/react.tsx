"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Session } from "@/engine/session";
import { sanitizeGrowthConstants, type GrowthConstants } from "@/engine/constants";
import { resolveSeason, type Season } from "@/engine/seasons";
import { getStorage } from "./index";
import { DEFAULT_SETTINGS, type Settings, type Storage } from "./types";

const StorageContext = createContext<Storage | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [storage] = useState<Storage | null>(() => (typeof window === "undefined" ? null : getStorage()));
  // false on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  // Render nothing storage-dependent on the server: IndexedDB only exists in the browser.
  return <StorageContext.Provider value={mounted ? storage : null}>{children}</StorageContext.Provider>;
}

/** Returns the storage, or null during SSR / first paint. */
export function useStorage(): Storage | null {
  return useContext(StorageContext);
}

/** All sessions, refreshed after any write. `loaded` is false until the first read finishes. */
export function useSessions(): { sessions: Session[]; loaded: boolean } {
  const storage = useStorage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!storage) return;
    let alive = true;
    const load = () =>
      storage.listSessions().then((s) => {
        if (alive) {
          setSessions(s);
          setLoaded(true);
        }
      });
    void load();
    const off = storage.subscribe(() => void load());
    return () => {
      alive = false;
      off();
    };
  }, [storage]);
  return { sessions, loaded };
}

export function useSettings(): {
  settings: Settings;
  growth: GrowthConstants;
  loaded: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
} {
  const storage = useStorage();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!storage) return;
    let alive = true;
    const load = () =>
      storage.getSettings().then((s) => {
        if (alive) {
          setSettings(s);
          setLoaded(true);
          try {
            localStorage.setItem("vc-theme", s.theme); // cache only: read by the pre-paint script
          } catch {
            /* private mode */
          }
        }
      });
    void load();
    const off = storage.subscribe(() => void load());
    return () => {
      alive = false;
      off();
    };
  }, [storage]);
  const update = useCallback(
    async (patch: Partial<Settings>) => {
      if (!storage) return;
      await storage.putSettings({ ...(await storage.getSettings()), ...patch });
    },
    [storage],
  );
  const growth = useMemo(() => sanitizeGrowthConstants(settings.growth), [settings.growth]);
  return { settings, growth, loaded, update };
}

/** The season trees should look like right now (the setting, or the calendar when it is "auto"). */
export function useSeason(): { season: Season; setting: Settings["season"]; set: (s: Settings["season"]) => void } {
  const { settings, update } = useSettings();
  const season = useMemo(() => resolveSeason(settings.season, new Date()), [settings.season]);
  return { season, setting: settings.season, set: (s) => void update({ season: s }) };
}

/** True when motion should be reduced (user setting wins, otherwise the OS preference). */
export function useReducedMotion(setting: Settings["reducedMotion"]): boolean {
  const system = useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return setting === "reduce" ? true : setting === "full" ? false : system;
}
