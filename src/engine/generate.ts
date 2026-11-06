import { mulberry32 } from "./prng";
import { Builder, NEIGHBORS } from "./generators/kit";
import { getSpecies } from "./species";
import type { RawVoxel, Rng, TreeSpec, Voxel } from "./types";

/**
 * Generates the COMPLETE final tree for a spec. Deterministic: the same
 * (seed, species, difficulty) always yields the same voxels in the same order.
 * The visible tree at any moment is just a prefix of this list.
 */
export function generateTree(spec: TreeSpec): Voxel[] {
  const species = getSpecies(spec.species);
  const dims = species.dims[spec.difficulty];
  const rng = mulberry32(spec.seed);
  const raw = species.generate({
    rng,
    difficulty: spec.difficulty,
    height: dims.height,
    radius: dims.radius,
  });
  const full = spec.difficulty === "hard" ? addBlossomCrown(raw, rng) : raw;
  return full.map((v, growthIndex) => ({ ...v, growthIndex }));
}

/** Hard trees finish with a crown of blossoms perched on the highest leaves. */
function addBlossomCrown(raw: readonly RawVoxel[], rng: Rng): RawVoxel[] {
  const b = Builder.from(raw);
  const leaves = raw.filter((v) => v.type === "leaf").sort((a, c) => c.y - a.y);
  const crown = leaves.slice(0, 16);
  const added: RawVoxel[] = [];
  for (const v of crown) {
    if (b.add(v.x, v.y + 1, v.z, "blossom")) added.push({ x: v.x, y: v.y + 1, z: v.z, type: "blossom" });
  }
  for (const v of added) {
    for (const [dx, dy, dz] of NEIGHBORS) {
      if (dy < 0 || rng() > 0.35) continue;
      b.add(v.x + dx, v.y + dy, v.z + dz, "blossom");
    }
  }
  return b.voxels;
}

export interface TreeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function treeBounds(voxels: readonly RawVoxel[]): TreeBounds {
  const bounds: TreeBounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (const v of voxels) {
    bounds.minX = Math.min(bounds.minX, v.x);
    bounds.maxX = Math.max(bounds.maxX, v.x);
    bounds.minY = Math.min(bounds.minY, v.y);
    bounds.maxY = Math.max(bounds.maxY, v.y);
    bounds.minZ = Math.min(bounds.minZ, v.z);
    bounds.maxZ = Math.max(bounds.maxZ, v.z);
  }
  return bounds;
}
