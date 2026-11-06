/**
 * Migrations: how old data becomes current data.
 *
 * Each entry upgrades a bundle from version N to N+1. `migrateBundle` applies
 * them in order, then the result is validated by bundleSchema. Add a new
 * entry (and bump CURRENT_SCHEMA_VERSION) whenever a persisted shape changes.
 */
import { bundleSchema } from "./schema";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, type ExportBundle } from "./types";

type Raw = Record<string, unknown>;

const MIGRATIONS: Record<number, (b: Raw) => Raw> = {
  /**
   * v0 -> v1. v0 was the pre-release format: no `drafts`, no `settings`,
   * sessions stored `hints` instead of `hintsUsed`, `progress` was a bare number,
   * and the version field was missing.
   */
  0: (b) => {
    // Be strict about what counts as an old export: otherwise any random JSON object
    // would "migrate" to an empty bundle and a Replace-import would wipe real data.
    if (!Array.isArray(b.sessions)) throw new Error("That file is not a voxelcode export.");
    const sessions = b.sessions as Raw[];
    return {
      ...b,
      app: "voxelcode",
      exportedAt: typeof b.exportedAt === "number" ? b.exportedAt : 0,
      drafts: Array.isArray(b.drafts) ? b.drafts : [],
      settings: b.settings ?? DEFAULT_SETTINGS,
      sessions: sessions.map((s) => {
        const { hints, progress, ...rest } = s;
        const p = typeof progress === "number" ? progress : 0;
        return {
          ...rest,
          hintsUsed: typeof s.hintsUsed === "number" ? s.hintsUsed : typeof hints === "number" ? hints : 0,
          attempts: Array.isArray(s.attempts) ? s.attempts : [],
          checkpoint: s.checkpoint ?? "none",
          activeSeconds: typeof s.activeSeconds === "number" ? s.activeSeconds : 0,
          progress:
            typeof progress === "object" && progress !== null
              ? progress
              : { opened: true, checkpoint: "none", visibleBest: 0, hiddenBest: 0, progress: p },
        };
      }),
      schemaVersion: 1,
    };
  },
};

export function detectVersion(raw: unknown): number {
  if (raw && typeof raw === "object" && "schemaVersion" in raw) {
    const v = (raw as Raw).schemaVersion;
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  }
  return 0;
}

/** Upgrades any known version to the current one and validates it. Throws a readable Error otherwise. */
export function migrateBundle(raw: unknown): ExportBundle {
  if (!raw || typeof raw !== "object") throw new Error("That file is not a voxelcode export.");
  let version = detectVersion(raw);
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`This export was made by a newer version of voxelcode (schema ${version}). Update the app to import it.`);
  }
  let data = raw as Raw;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from schema ${version}.`);
    data = step(data);
    version++;
  }
  const parsed = bundleSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`The export is damaged: ${first?.path.join(".") || "(root)"}: ${first?.message ?? "invalid"}`);
  }
  return parsed.data as ExportBundle;
}
