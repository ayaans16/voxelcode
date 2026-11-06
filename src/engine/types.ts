/**
 * Core engine types. Nothing in /src/engine may import DOM, React or three.
 */

export type VoxelType = "trunk" | "branch" | "leaf" | "blossom" | "golden";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

/** A voxel before it has been assigned its position in the growth order. */
export interface RawVoxel {
  x: number;
  y: number;
  z: number;
  type: VoxelType;
}

/**
 * A voxel in the final tree. `growthIndex` is its rank in the order of
 * appearance (0 = first voxel to appear). The visible tree at progress p is
 * simply every voxel with growthIndex < floor(p * N).
 */
export interface Voxel extends RawVoxel {
  growthIndex: number;
}

/** A seeded random number generator returning floats in [0, 1). */
export type Rng = () => number;

export type SpeciesId =
  | "bamboo"
  | "willow"
  | "weeping-willow"
  | "pine"
  | "oak"
  | "banyan"
  | "cherry"
  | "cypress";

/** A tree is fully defined by these three values. */
export interface TreeSpec {
  seed: number;
  species: SpeciesId;
  difficulty: Difficulty;
}

export interface GeneratorParams {
  rng: Rng;
  difficulty: Difficulty;
  /** Target height of the tree in voxels. */
  height: number;
  /** Target horizontal reach of the canopy in voxels (meaning varies a little by species). */
  radius: number;
}

/**
 * A generator returns voxels IN ORDER OF APPEARANCE:
 *   1. trunk, base to top
 *   2. branches, splitting outward
 *   3. leaves
 * and every voxel except the first must touch (share a face with) an earlier one.
 */
export type Generator = (params: GeneratorParams) => RawVoxel[];

export interface Palette {
  trunk: number;
  branch: number;
  leaf: number;
  blossom: number;
  golden: number;
}

export interface Species {
  id: SpeciesId;
  name: string;
  /** Pattern ids that map to this species. */
  patterns: readonly string[];
  /** Target dimensions per difficulty. */
  dims: Record<Difficulty, { height: number; radius: number }>;
  generate: Generator;
  palette: Palette;
  /** Keeps its leaves in winter (they gain snow instead of going bare-white). */
  evergreen?: boolean;
}
