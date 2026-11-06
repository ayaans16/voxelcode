import type { Session } from "@/engine/session";
import { Emitter, buildBundle, normalizeSettings, planImport } from "./base";
import { DEFAULT_SETTINGS, draftId, type Draft, type ExportBundle, type ImportMode, type Settings, type Storage } from "./types";

/** In-memory Storage. Used by tests and as a safe fallback when IndexedDB is unavailable. */
export class MemoryStorage implements Storage {
  private sessions = new Map<string, Session>();
  private drafts = new Map<string, Draft>();
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private emitter = new Emitter();

  async getSession(slug: string) {
    const s = this.sessions.get(slug);
    return s ? structuredClone(s) : undefined;
  }
  async putSession(session: Session) {
    this.sessions.set(session.slug, structuredClone(session));
    this.emitter.emit();
  }
  async listSessions() {
    return [...this.sessions.values()].map((s) => structuredClone(s));
  }
  async deleteSession(slug: string) {
    this.sessions.delete(slug);
    this.emitter.emit();
  }
  async getDraft(slug: string, language: Draft["language"]) {
    const d = this.drafts.get(draftId(slug, language));
    return d ? { ...d } : undefined;
  }
  async putDraft(draft: Draft) {
    this.drafts.set(draftId(draft.slug, draft.language), { ...draft });
  }
  async getSettings() {
    return structuredClone(this.settings);
  }
  async putSettings(settings: Settings) {
    this.settings = normalizeSettings(settings);
    this.emitter.emit();
  }
  async exportAll(): Promise<ExportBundle> {
    return buildBundle(await this.listSessions(), [...this.drafts.values()].map((d) => ({ ...d })), await this.getSettings());
  }
  async importAll(raw: unknown, mode: ImportMode) {
    const { bundle, sessions } = planImport(raw, mode, await this.listSessions());
    if (mode === "replace") {
      this.sessions.clear();
      this.drafts.clear();
    }
    for (const s of sessions) this.sessions.set(s.slug, structuredClone(s));
    for (const d of bundle.drafts) this.drafts.set(draftId(d.slug, d.language), { ...d });
    if (mode === "replace") this.settings = normalizeSettings(bundle.settings);
    this.emitter.emit();
    return { sessions: bundle.sessions.length };
  }
  async clearAll() {
    this.sessions.clear();
    this.drafts.clear();
    this.settings = { ...DEFAULT_SETTINGS };
    this.emitter.emit();
  }
  subscribe(listener: () => void) {
    return this.emitter.subscribe(listener);
  }
}
