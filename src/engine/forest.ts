/** Where each tree stands in the grove. Pure and deterministic. */
import { cellNoise, hashString } from "./prng";

export interface ForestSlot {
  x: number;
  z: number;
}

export const FOREST_SPACING = 30;

/**
 * Square spiral from the center outward: (0,0), (1,0), (1,1), (0,1), (-1,1) ...
 * Each ring of the spiral is a little further from the center, so a new tree
 * never moves an old one: the n-th tree always has the same slot.
 */
export function spiralCell(index: number): [number, number] {
  if (index === 0) return [0, 0];
  let x = 0;
  let z = 0;
  let dx = 1;
  let dz = 0;
  let segment = 1;
  let passed = 0;
  let turns = 0;
  for (let i = 0; i < index; i++) {
    x += dx;
    z += dz;
    passed++;
    if (passed === segment) {
      passed = 0;
      [dx, dz] = [-dz, dx];
      turns++;
      if (turns % 2 === 0) segment++;
    }
  }
  return [x, z];
}

/** Slot for the n-th tree, with a small stable jitter keyed on its slug so the grove looks natural. */
export function forestSlot(index: number, slug: string, spacing = FOREST_SPACING): ForestSlot {
  const [cx, cz] = spiralCell(index);
  const h = hashString(slug);
  const jitter = spacing * 0.12;
  return {
    x: cx * spacing + (cellNoise(h, 1, 0, 0) - 0.5) * 2 * jitter,
    z: cz * spacing + (cellNoise(h, 2, 0, 0) - 0.5) * 2 * jitter,
  };
}

/** Ground radius (in voxels) needed to hold `count` trees. */
export function forestGroundRadius(count: number, spacing = FOREST_SPACING): number {
  if (count <= 1) return Math.round(spacing * 0.7);
  let maxCell = 0;
  for (let i = 0; i < count; i++) {
    const [x, z] = spiralCell(i);
    maxCell = Math.max(maxCell, Math.hypot(x, z));
  }
  return Math.ceil(maxCell * spacing + spacing * 0.7);
}
