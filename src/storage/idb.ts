import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Session } from "@/engine/session";
import { Emitter, buildBundle, normalizeSettings, planImport } from "./base";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, draftId, type Draft, type ExportBundle, type ImportMode, type Settings, type Storage } from "./types";

interface VoxelDB extends DBSchema {
  sessions: { key: string; value: Session };
  drafts: { key: string; value: Draft & { id: string } };
  kv: { key: string; value: unknown };
}

const DB_NAME = "voxelcode";

/**
 * IndexedDB storage. The DB version equals CURRENT_SCHEMA_VERSION; the
 * `upgrade` callback is where object stores are created and where future
 * versions would transform existing records (oldVersion tells you where
 * the user's data currently is).
 */
export class IdbStorage implements Storage {
  private dbPromise: Promise<IDBPDatabase<VoxelDB>>;
  private emitter = new Emitter();

  constructor(name: string = DB_NAME) {
    this.dbPromise = openDB<VoxelDB>(name, CURRENT_SCHEMA_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("sessions", { keyPath: "slug" });
          db.createObjectStore("drafts", { keyPath: "id" });
          db.createObjectStore("kv");
        }
        // Future: if (oldVersion < 2) { ...transform records using the cursor API... }
      },
    });
  }

  private async db() {
    return this.dbPromise;
  }

  async getSession(slug: string) {
    return (await this.db()).get("sessions", slug);
  }
  async putSession(session: Session) {
    await (await this.db()).put("sessions", session);
    this.emitter.emit();
  }
  async listSessions() {
    return (await this.db()).getAll("sessions");
  }
  async deleteSession(slug: string) {
    await (await this.db()).delete("sessions", slug);
    this.emitter.emit();
  }
  async getDraft(slug: string, language: Draft["language"]) {
    const d = await (await this.db()).get("drafts", draftId(slug, language));
    if (!d) return undefined;
    const { id: _id, ...rest } = d;
    void _id;
    return rest;
  }
  async putDraft(draft: Draft) {
    await (await this.db()).put("drafts", { ...draft, id: draftId(draft.slug, draft.language) });
  }
  async getSettings() {
    return normalizeSettings(await (await this.db()).get("kv", "settings"));
  }
  async putSettings(settings: Settings) {
    await (await this.db()).put("kv", normalizeSettings(settings), "settings");
    this.emitter.emit();
  }
  async exportAll(): Promise<ExportBundle> {
    const db = await this.db();
    const drafts = (await db.getAll("drafts")).map(({ id: _id, ...rest }) => {
      void _id;
      return rest;
    });
    return buildBundle(await db.getAll("sessions"), drafts, await this.getSettings());
  }
  async importAll(raw: unknown, mode: ImportMode) {
    const db = await this.db();
    const { bundle, sessions } = planImport(raw, mode, await db.getAll("sessions"));
    const tx = db.transaction(["sessions", "drafts", "kv"], "readwrite");
    if (mode === "replace") {
      await Promise.all([tx.objectStore("sessions").clear(), tx.objectStore("drafts").clear()]);
    }
    for (const s of sessions) await tx.objectStore("sessions").put(s);
    for (const d of bundle.drafts) await tx.objectStore("drafts").put({ ...d, id: draftId(d.slug, d.language) });
    if (mode === "replace") await tx.objectStore("kv").put(normalizeSettings(bundle.settings), "settings");
    await tx.done;
    this.emitter.emit();
    return { sessions: bundle.sessions.length };
  }
  async clearAll() {
    const db = await this.db();
    const tx = db.transaction(["sessions", "drafts", "kv"], "readwrite");
    await Promise.all([tx.objectStore("sessions").clear(), tx.objectStore("drafts").clear(), tx.objectStore("kv").clear()]);
    await tx.done;
    void DEFAULT_SETTINGS;
    this.emitter.emit();
  }
  subscribe(listener: () => void) {
    return this.emitter.subscribe(listener);
  }
}
