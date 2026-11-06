import type { Session } from "@/engine/session";
import { migrateBundle } from "./migrations";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, type Draft, type ExportBundle, type ImportMode, type Settings } from "./types";
import { settingsSchema } from "./schema";

/** Shared pieces so Memory and IndexedDB implementations behave identically. */
export class Emitter {
  private listeners = new Set<() => void>();
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(): void {
    for (const l of this.listeners) l();
  }
}

export function normalizeSettings(raw: unknown): Settings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  return parsed.success ? (parsed.data as Settings) : { ...DEFAULT_SETTINGS };
}

export function buildBundle(sessions: Session[], drafts: Draft[], settings: Settings): ExportBundle {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    app: "voxelcode",
    sessions,
    drafts,
    settings,
  };
}

/** Decide what to write for an import. Merge keeps whichever session has more progress. */
export function planImport(
  raw: unknown,
  mode: ImportMode,
  existing: Session[],
): { bundle: ExportBundle; sessions: Session[] } {
  const bundle = migrateBundle(raw);
  if (mode === "replace") return { bundle, sessions: bundle.sessions };
  const byslug = new Map(existing.map((s) => [s.slug, s] as const));
  for (const incoming of bundle.sessions) {
    const cur = byslug.get(incoming.slug);
    if (!cur || incoming.progress.progress > cur.progress.progress || (incoming.solvedAt !== undefined && cur.solvedAt === undefined)) {
      byslug.set(incoming.slug, incoming);
    }
  }
  return { bundle, sessions: [...byslug.values()] };
}
