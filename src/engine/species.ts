/**
 * Species are plain data objects: add a new tree by adding one entry here
 * (plus a generator). `patterns` decides which problems grow which species.
 */
import type { Species, SpeciesId } from "./types";
import { generateBamboo } from "./generators/bamboo";
import { generatePine } from "./generators/pine";
import { generateCypress } from "./generators/cypress";
import { makeWillowGenerator, WILLOW_STYLE, WEEPING_WILLOW_STYLE } from "./generators/willow";
import { generateCherry } from "./generators/cherry";
import { generateBanyan } from "./generators/banyan";
import { generateOak } from "./generators/oak";

const GOLD = 0xf2c94c;

export const SPECIES: Record<SpeciesId, Species> = {
  bamboo: {
    id: "bamboo",
    name: "Bamboo",
    patterns: ["two-pointers", "bits"],
    dims: {
      easy: { height: 9, radius: 1 },
      medium: { height: 14, radius: 3 },
      hard: { height: 18, radius: 4 },
    },
    generate: generateBamboo,
    evergreen: true,
    palette: { trunk: 0x9bb84a, branch: 0x7f9c3a, leaf: 0x58a63c, blossom: 0xcdeb7f, golden: GOLD },
  },
  willow: {
    id: "willow",
    name: "Willow",
    patterns: ["sliding-window"],
    dims: {
      easy: { height: 9, radius: 4 },
      medium: { height: 14, radius: 6 },
      hard: { height: 18, radius: 8 },
    },
    generate: makeWillowGenerator(WILLOW_STYLE),
    palette: { trunk: 0x6e5a3c, branch: 0x7d6847, leaf: 0x8fbf4a, blossom: 0xd6ec8a, golden: GOLD },
  },
  "weeping-willow": {
    id: "weeping-willow",
    name: "Weeping willow",
    patterns: ["dp"],
    dims: {
      easy: { height: 10, radius: 4 },
      medium: { height: 16, radius: 6 },
      hard: { height: 20, radius: 8 },
    },
    generate: makeWillowGenerator(WEEPING_WILLOW_STYLE),
    palette: { trunk: 0x5f4e38, branch: 0x6f5c42, leaf: 0x6fae5c, blossom: 0xbfe39a, golden: GOLD },
  },
  pine: {
    id: "pine",
    name: "Tiered pine",
    patterns: ["binary-search"],
    dims: {
      easy: { height: 11, radius: 3 },
      medium: { height: 20, radius: 5 },
      hard: { height: 28, radius: 7 },
    },
    generate: generatePine,
    evergreen: true,
    palette: { trunk: 0x5b4331, branch: 0x4c6b3a, leaf: 0x2f7a4d, blossom: 0xe8f0e0, golden: GOLD },
  },
  oak: {
    id: "oak",
    name: "Oak",
    patterns: ["trees"],
    dims: {
      easy: { height: 8, radius: 4 },
      medium: { height: 14, radius: 7 },
      hard: { height: 20, radius: 9 },
    },
    generate: generateOak,
    palette: { trunk: 0x6b4a2f, branch: 0x7d5a3a, leaf: 0x4f9d3a, blossom: 0xf2b8c6, golden: GOLD },
  },
  banyan: {
    id: "banyan",
    name: "Banyan",
    patterns: ["graphs", "backtracking"],
    dims: {
      easy: { height: 8, radius: 5 },
      medium: { height: 11, radius: 8 },
      hard: { height: 14, radius: 11 },
    },
    generate: generateBanyan,
    palette: { trunk: 0x7a5b3b, branch: 0x8a6a46, leaf: 0x3f8f4a, blossom: 0xf2b8c6, golden: GOLD },
  },
  cherry: {
    id: "cherry",
    name: "Cherry blossom",
    patterns: ["hashing"],
    dims: {
      easy: { height: 9, radius: 4 },
      medium: { height: 14, radius: 6 },
      hard: { height: 18, radius: 8 },
    },
    generate: generateCherry,
    palette: { trunk: 0x5a3f33, branch: 0x6b4b3c, leaf: 0xf4b6c8, blossom: 0xfff0f4, golden: GOLD },
  },
  cypress: {
    id: "cypress",
    name: "Cypress",
    patterns: ["stack", "heap"],
    dims: {
      easy: { height: 10, radius: 2 },
      medium: { height: 18, radius: 3 },
      hard: { height: 26, radius: 4 },
    },
    generate: generateCypress,
    evergreen: true,
    palette: { trunk: 0x4d3b2c, branch: 0x3f5a3a, leaf: 0x2a5f3e, blossom: 0xe5efe0, golden: GOLD },
  },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];
export const FALLBACK_SPECIES: SpeciesId = "oak";

export function getSpecies(id: SpeciesId): Species {
  return SPECIES[id];
}

/** First pattern that has a species wins; unknown patterns fall back to oak. */
export function speciesForPatterns(patterns: readonly string[]): SpeciesId {
  for (const p of patterns) {
    for (const s of SPECIES_IDS) {
      if (SPECIES[s].patterns.includes(p)) return s;
    }
  }
  return FALLBACK_SPECIES;
}
