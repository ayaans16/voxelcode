import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryStorage } from "./memory";
import { IdbStorage } from "./idb";
import { migrateBundle, detectVersion } from "./migrations";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, type Storage } from "./types";
import { createSession, recordAttempt, type Attempt } from "@/engine/session";

const mk = (slug: string, now = 1000) => createSession({ slug, difficulty: "easy", species: "oak", seed: 7, now });
const solvedAttempt = (slug: string): Attempt => ({
  id: "a1",
  problemSlug: slug,
  language: "javascript",
  code: "x",
  timestamp: 5000,
  runtimeMs: 2,
  summary: { kind: "hidden", passed: 3, total: 3, failedCategories: [], allPassed: true, anyTimeout: false, anyError: false },
});

let dbCounter = 0;
const backends: [string, () => Storage][] = [
  ["MemoryStorage", () => new MemoryStorage()],
  ["IdbStorage", () => new IdbStorage(`test-db-${++dbCounter}`)],
];

describe.each(backends)("%s contract", (_name, make) => {
  it("stores, lists, and deletes sessions", async () => {
    const s = make();
    expect(await s.getSession("a")).toBeUndefined();
    await s.putSession(mk("a"));
    await s.putSession(mk("b"));
    expect((await s.getSession("a"))?.slug).toBe("a");
    expect((await s.listSessions()).map((x) => x.slug).sort()).toEqual(["a", "b"]);
    await s.deleteSession("a");
    expect(await s.getSession("a")).toBeUndefined();
  });

  it("round-trips a solved session exactly", async () => {
    const s = make();
    const solved = recordAttempt(mk("a"), solvedAttempt("a"));
    await s.putSession(solved);
    expect(await s.getSession("a")).toEqual(solved);
  });

  it("does not hand out live references", async () => {
    const s = make();
    await s.putSession(mk("a"));
    const got = (await s.getSession("a"))!;
    got.hintsUsed = 99;
    expect((await s.getSession("a"))!.hintsUsed).toBe(0);
  });

  it("keeps drafts per problem and language", async () => {
    const s = make();
    await s.putDraft({ slug: "a", language: "python", code: "py", updatedAt: 1 });
    await s.putDraft({ slug: "a", language: "javascript", code: "js", updatedAt: 2 });
    await s.putDraft({ slug: "a", language: "python", code: "py2", updatedAt: 3 });
    expect((await s.getDraft("a", "python"))?.code).toBe("py2");
    expect((await s.getDraft("a", "javascript"))?.code).toBe("js");
    expect(await s.getDraft("b", "python")).toBeUndefined();
  });

  it("returns default settings and persists changes", async () => {
    const s = make();
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS);
    await s.putSettings({ ...DEFAULT_SETTINGS, theme: "light", growth: { opened: 0.1 } });
    expect(await s.getSettings()).toMatchObject({ theme: "light", growth: { opened: 0.1 } });
  });

  it("notifies subscribers on writes and stops after unsubscribe", async () => {
    const s = make();
    let calls = 0;
    const off = s.subscribe(() => calls++);
    await s.putSession(mk("a"));
    expect(calls).toBe(1);
    off();
    await s.putSession(mk("b"));
    expect(calls).toBe(1);
  });

  it("exports and re-imports everything (replace)", async () => {
    const a = make();
    await a.putSession(recordAttempt(mk("x"), solvedAttempt("x")));
    await a.putSession(mk("y"));
    await a.putDraft({ slug: "x", language: "javascript", code: "c", updatedAt: 1 });
    const bundle = JSON.parse(JSON.stringify(await a.exportAll()));
    expect(bundle.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const b = make();
    const res = await b.importAll(bundle, "replace");
    expect(res.sessions).toBe(2);
    expect(await b.listSessions()).toHaveLength(2);
    expect((await b.getDraft("x", "javascript"))?.code).toBe("c");
    expect((await b.getSession("x"))?.solvedAt).toBe(5000);
  });

  it("merge keeps the session with more progress", async () => {
    const a = make();
    const solved = recordAttempt(mk("x"), solvedAttempt("x"));
    await a.putSession(solved);
    const bundle = JSON.parse(JSON.stringify(await a.exportAll()));
    const b = make();
    await b.putSession(mk("x")); // less progress locally
    await b.putSession(mk("z"));
    await b.importAll(bundle, "merge");
    expect((await b.getSession("x"))?.solvedAt).toBe(5000);
    expect(await b.getSession("z")).toBeDefined();
    // And merging a weaker copy does not overwrite a stronger one:
    const weak = JSON.parse(JSON.stringify(await make().exportAll()));
    weak.sessions = [mk("x")];
    await b.importAll(weak, "merge");
    expect((await b.getSession("x"))?.solvedAt).toBe(5000);
  });

  it("rejects garbage imports without touching data", async () => {
    const s = make();
    await s.putSession(mk("keep"));
    await expect(s.importAll({ nope: true }, "replace")).rejects.toThrow();
    await expect(s.importAll("hello", "replace")).rejects.toThrow(/not a voxelcode export/);
    expect(await s.getSession("keep")).toBeDefined();
  });

  it("clearAll wipes everything", async () => {
    const s = make();
    await s.putSession(mk("a"));
    await s.putDraft({ slug: "a", language: "python", code: "x", updatedAt: 1 });
    await s.clearAll();
    expect(await s.listSessions()).toEqual([]);
    expect(await s.getDraft("a", "python")).toBeUndefined();
  });
});

describe("migrations", () => {
  it("detects versions, treating missing as 0", () => {
    expect(detectVersion({})).toBe(0);
    expect(detectVersion({ schemaVersion: 1 })).toBe(1);
    expect(detectVersion(null)).toBe(0);
  });

  it("upgrades a v0 export (no version, bare progress number, `hints`)", () => {
    const v0 = {
      sessions: [
        {
          slug: "old",
          difficulty: "easy",
          species: "oak",
          seed: 3,
          startedAt: 10,
          hints: 2,
          progress: 0.4,
        },
      ],
    };
    const out = migrateBundle(v0);
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.sessions[0]).toMatchObject({ slug: "old", hintsUsed: 2, attempts: [], checkpoint: "none", activeSeconds: 0 });
    expect(out.sessions[0]!.progress.progress).toBe(0.4);
    expect(out.settings).toEqual(DEFAULT_SETTINGS);
    expect(out.drafts).toEqual([]);
  });

  it("is a no-op for current data", async () => {
    const s = new MemoryStorage();
    await s.putSession(mk("a"));
    const bundle = JSON.parse(JSON.stringify(await s.exportAll()));
    expect(migrateBundle(bundle).sessions).toEqual(bundle.sessions);
  });

  it("refuses data from a newer schema with a helpful message", () => {
    expect(() => migrateBundle({ schemaVersion: 99 })).toThrow(/newer version/);
  });

  it("reports damaged data readably", () => {
    expect(() => migrateBundle({ schemaVersion: 1, app: "voxelcode", exportedAt: 1, sessions: [{ slug: "" }], drafts: [], settings: {} })).toThrow(/damaged/);
  });
});
