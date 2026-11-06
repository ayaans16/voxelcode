/**
 * Building blocks shared by all tree generators.
 *
 * Key idea: the Builder only ever accepts a voxel that touches (shares a face
 * with) a voxel it already holds. Because emission order IS growth order, that
 * single rule makes "no floating voxels" true by construction.
 */
import type { Rng, RawVoxel, VoxelType } from "../types";
import { cellNoise } from "../prng";

export type Vec = readonly [number, number, number];

const OFFSET = 512;
export function cellKey(x: number, y: number, z: number): number {
  return (x + OFFSET) * 1048576 + (y + OFFSET) * 1024 + (z + OFFSET);
}

export const NEIGHBORS: readonly Vec[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export class Builder {
  readonly voxels: RawVoxel[] = [];
  private readonly cells = new Set<number>();

  static from(voxels: readonly RawVoxel[]): Builder {
    const b = new Builder();
    for (const v of voxels) b.add(v.x, v.y, v.z, v.type);
    return b;
  }

  has(x: number, y: number, z: number): boolean {
    return this.cells.has(cellKey(x, y, z));
  }

  touches(x: number, y: number, z: number): boolean {
    for (const [dx, dy, dz] of NEIGHBORS) {
      if (this.has(x + dx, y + dy, z + dz)) return true;
    }
    return false;
  }

  /** Adds a voxel. Returns false if the cell is already taken. Throws if it would float. */
  add(x: number, y: number, z: number, type: VoxelType): boolean {
    if (this.has(x, y, z)) return false;
    if (this.voxels.length > 0 && !this.touches(x, y, z)) {
      throw new Error(`Floating voxel at (${x}, ${y}, ${z}) of type ${type}`);
    }
    this.cells.add(cellKey(x, y, z));
    this.voxels.push({ x, y, z, type });
    return true;
  }

  /** Draws a face-connected line (every step moves along one axis). Includes both ends. */
  line(from: Vec, to: Vec, type: VoxelType): Vec[] {
    const path: Vec[] = [from, ...linePoints(from, to)];
    for (const [x, y, z] of path) this.add(x, y, z, type);
    return path;
  }
}

/**
 * Cells from `from` (exclusive) to `to` (inclusive) using only axis-aligned steps.
 * At each step we advance the axis with the most remaining work, so the path
 * stays close to the true straight line.
 */
export function linePoints(from: Vec, to: Vec): Vec[] {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const a = d.map(Math.abs);
  const s = d.map(Math.sign);
  const done = [0, 0, 0];
  const pos = [from[0], from[1], from[2]];
  const total = a[0]! + a[1]! + a[2]!;
  const out: Vec[] = [];
  for (let i = 0; i < total; i++) {
    let best = -1;
    let bestRatio = -1;
    for (let k = 0; k < 3; k++) {
      if (done[k]! < a[k]!) {
        const ratio = (a[k]! - done[k]!) / a[k]!;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = k;
        }
      }
    }
    done[best]!++;
    pos[best]! += s[best]!;
    out.push([pos[0]!, pos[1]!, pos[2]!]);
  }
  return out;
}

export interface BranchOptions {
  type: VoxelType;
  /** Subtracted from dir.y after every step: positive bends the branch downward. */
  gravity?: number;
  /** Branches never dip below this height. */
  minY?: number;
}

/**
 * Walks a smooth path from `from` in direction `dir` for `length` steps and
 * voxelizes it. Returns every cell on the path (including `from`).
 */
export function walkBranch(
  b: Builder,
  from: Vec,
  dir: Vec,
  length: number,
  opts: BranchOptions,
): Vec[] {
  const gravity = opts.gravity ?? 0;
  const minY = opts.minY ?? 1;
  let [dx, dy, dz] = dir;
  const len = Math.hypot(dx, dy, dz) || 1;
  dx /= len;
  dy /= len;
  dz /= len;
  let px = from[0];
  let py = from[1];
  let pz = from[2];
  let last: Vec = from;
  const path: Vec[] = [from];
  for (let i = 0; i < length; i++) {
    px += dx;
    py += dy;
    pz += dz;
    dy -= gravity;
    const target: Vec = [Math.round(px), Math.max(minY, Math.round(py)), Math.round(pz)];
    if (target[0] === last[0] && target[1] === last[1] && target[2] === last[2]) continue;
    for (const pt of linePoints(last, target)) {
      b.add(pt[0], pt[1], pt[2], opts.type);
      path.push(pt);
    }
    last = target;
  }
  return path;
}

export type Shape = (x: number, y: number, z: number) => boolean;

export function anyOf(shapes: readonly Shape[]): Shape {
  return (x, y, z) => {
    for (const s of shapes) if (s(x, y, z)) return true;
    return false;
  };
}

/** A lumpy ellipsoid: the radius wobbles per cell so silhouettes are not perfect spheres. */
export function ellipsoid(
  seed: number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  lumpiness = 0.25,
): Shape {
  return (x, y, z) => {
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const nz = (z - cz) / rz;
    const d = nx * nx + ny * ny + nz * nz;
    const wobble = 1 + lumpiness * (cellNoise(seed, x, y, z) - 0.5);
    return d <= wobble;
  };
}

export interface LeafOptions {
  /** Chance that a candidate cell inside the shape becomes a leaf. */
  density: number;
  /** Lower score grows first. Default: bottom to top. */
  score?: (x: number, y: number, z: number) => number;
  /** Random noise added to the score so growth is not perfectly layered. */
  jitter?: number;
  /** Fixed type, or a function to pick per voxel. */
  type?: VoxelType | ((rng: Rng) => VoxelType);
  /** Hard cap on number of leaves added. */
  max?: number;
}

/**
 * Grows leaves outward from everything already in the builder, restricted to
 * `inShape`. It is a frontier expansion (like Prim's algorithm): only cells
 * touching the existing tree can be added, and the lowest-scoring one goes next.
 * That guarantees connectivity and gives a pleasant bottom-to-top reveal.
 */
export function growLeaves(b: Builder, rng: Rng, inShape: Shape, opts: LeafOptions): number {
  const score = opts.score ?? ((_x: number, y: number) => y);
  const jitter = opts.jitter ?? 1;
  const max = opts.max ?? Infinity;
  const pickType = (): VoxelType => {
    const t = opts.type ?? "leaf";
    return typeof t === "function" ? t(rng) : t;
  };
  const considered = new Set<number>();
  const frontier: { x: number; y: number; z: number; s: number }[] = [];

  const consider = (x: number, y: number, z: number) => {
    const k = cellKey(x, y, z);
    if (considered.has(k)) return;
    considered.add(k);
    if (b.has(x, y, z) || !inShape(x, y, z)) return;
    if (rng() >= opts.density) return;
    frontier.push({ x, y, z, s: score(x, y, z) + rng() * jitter });
  };

  for (const v of b.voxels.slice()) {
    for (const [dx, dy, dz] of NEIGHBORS) consider(v.x + dx, v.y + dy, v.z + dz);
  }

  let added = 0;
  while (frontier.length > 0 && added < max) {
    let bestIdx = 0;
    for (let i = 1; i < frontier.length; i++) {
      if (frontier[i]!.s < frontier[bestIdx]!.s) bestIdx = i;
    }
    const cell = frontier[bestIdx]!;
    frontier[bestIdx] = frontier[frontier.length - 1]!;
    frontier.pop();
    if (b.add(cell.x, cell.y, cell.z, pickType())) added++;
    for (const [dx, dy, dz] of NEIGHBORS) consider(cell.x + dx, cell.y + dy, cell.z + dz);
  }
  return added;
}

/** A direction on the horizontal plane at `angle` radians, with vertical component `rise`. */
export function dirFromAngle(angle: number, rise: number): Vec {
  return [Math.cos(angle), rise, Math.sin(angle)];
}
