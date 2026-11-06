/**
 * The storage boundary. The UI only ever talks to `Storage`; IndexedDB is one
 * implementation. To add a backend later, implement this interface (e.g. a
 * `RemoteStorage` that calls an API) and swap it in src/storage/index.ts.
 */
import type { Session } from "@/engine/session";
import type { GrowthConstants } from "@/engine/constants";
import type { SeasonSetting } from "@/engine/seasons";
import type { Language } from "@/problems/languages";

/** Bump when ANY persisted shape changes, and add a migration in migrations.ts. */
export const CURRENT_SCHEMA_VERSION = 1;

export type ThemeSetting = "system" | "light" | "dark";
export type MotionSetting = "system" | "reduce" | "full";

export interface Settings {
  theme: ThemeSetting;
  reducedMotion: MotionSetting;
  /** Seasonal look of trees. "auto" follows the calendar. */
  season: SeasonSetting;
  defaultLanguage: Language;
  /** Overrides on top of DEFAULT_GROWTH. */
  growth: Partial<GrowthConstants>;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  reducedMotion: "system",
  season: "auto",
  defaultLanguage: "javascript",
  growth: {},
};

export interface Draft {
  slug: string;
  language: Language;
  code: string;
  updatedAt: number;
}

export const draftId = (slug: string, language: string) => `${slug}:${language}`;

/** Everything in one JSON document, used for export / import. */
export interface ExportBundle {
  schemaVersion: number;
  exportedAt: number;
  app: "voxelcode";
  sessions: Session[];
  drafts: Draft[];
  settings: Settings;
}

export type ImportMode = "merge" | "replace";

export interface Storage {
  getSession(slug: string): Promise<Session | undefined>;
  putSession(session: Session): Promise<void>;
  listSessions(): Promise<Session[]>;
  deleteSession(slug: string): Promise<void>;

  getDraft(slug: string, language: Draft["language"]): Promise<Draft | undefined>;
  putDraft(draft: Draft): Promise<void>;

  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;

  exportAll(): Promise<ExportBundle>;
  /** Validates and migrates first; throws a readable Error on bad input. */
  importAll(raw: unknown, mode: ImportMode): Promise<{ sessions: number }>;
  clearAll(): Promise<void>;

  /** Called after any write, so open pages can refresh. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
