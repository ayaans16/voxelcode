/** zod schemas for everything we persist. Imports are untrusted, so they are validated. */
import { z } from "zod";
import { CURRENT_SCHEMA_VERSION } from "./types";

const language = z.enum(["python", "javascript", "java", "c", "go"]);
const difficulty = z.enum(["easy", "medium", "hard"]);
const species = z.enum(["bamboo", "willow", "weeping-willow", "pine", "oak", "banyan", "cherry", "cypress"]);

export const attemptSchema = z.object({
  id: z.string(),
  problemSlug: z.string(),
  language,
  code: z.string(),
  summary: z.object({
    kind: z.enum(["visible", "hidden"]),
    passed: z.number(),
    total: z.number(),
    failedCategories: z.array(z.string()),
    allPassed: z.boolean(),
    anyTimeout: z.boolean(),
    anyError: z.boolean(),
  }),
  timestamp: z.number(),
  runtimeMs: z.number(),
});

export const progressStateSchema = z.object({
  opened: z.boolean(),
  checkpoint: z.enum(["none", "correct", "wrong"]),
  visibleBest: z.number().min(0).max(1),
  hiddenBest: z.number().min(0).max(1),
  progress: z.number().min(0).max(1),
});

export const sessionSchema = z.object({
  slug: z.string().min(1),
  difficulty,
  species,
  seed: z.number(),
  startedAt: z.number(),
  activeSeconds: z.number().min(0),
  checkpoint: z.enum(["none", "correct", "wrong"]),
  checkpointAnswer: z.object({ pattern: z.string(), time: z.string(), space: z.string(), correct: z.boolean() }).optional(),
  hintsUsed: z.number().int().min(0),
  attempts: z.array(attemptSchema),
  solvedAt: z.number().optional(),
  solveSeconds: z.number().optional(),
  firstTryFullPass: z.boolean().optional(),
  accents: z.object({ golden: z.number(), blossom: z.number() }).optional(),
  progress: progressStateSchema,
});

export const draftSchema = z.object({
  slug: z.string(),
  language,
  code: z.string(),
  updatedAt: z.number(),
});

export const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  reducedMotion: z.enum(["system", "reduce", "full"]).default("system"),
  season: z.enum(["auto", "spring", "summer", "autumn", "winter"]).default("auto"),
  defaultLanguage: language.default("javascript"),
  growth: z
    .object({
      opened: z.number(),
      checkpointCorrect: z.number(),
      checkpointWrong: z.number(),
      visibleMax: z.number(),
      goldenMax: z.number(),
      hintPenalty: z.number(),
      blossomMax: z.number(),
      autumnFullStreak: z.number(),
    })
    .partial()
    .default({}),
});

export const bundleSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  exportedAt: z.number(),
  app: z.literal("voxelcode"),
  sessions: z.array(sessionSchema),
  drafts: z.array(draftSchema),
  settings: settingsSchema,
});
