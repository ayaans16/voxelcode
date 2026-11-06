import * as THREE from "three";
import { cellNoise } from "@/engine/prng";
import { GROUND_BY_SEASON, type Season } from "@/engine/seasons";

/**
 * A chunk of voxel ground: three stacked layers (grass, dirt, stone) in a
 * lumpy disc. The top of the grass layer sits at y = -0.5, so a voxel with
 * center y = 0 rests directly on it.
 */
export function createGround(radius: number, seed = 1, season: Season = "summer"): THREE.InstancedMesh {
  const GRASS = GROUND_BY_SEASON[season].grass;
  const DIRT = GROUND_BY_SEASON[season].dirt;
  const STONE = GROUND_BY_SEASON[season].stone;
  const cells: { x: number; y: number; z: number; color: number }[] = [];
  const r = Math.ceil(radius) + 1;
  for (let x = -r; x <= r; x++) {
    for (let z = -r; z <= r; z++) {
      const edge = radius + (cellNoise(seed, x, 0, z) - 0.5) * 2.2;
      const d = Math.hypot(x, z);
      if (d > edge) continue;
      const n = cellNoise(seed + 1, x, 1, z);
      cells.push({ x, y: -1, z, color: GRASS[Math.floor(n * GRASS.length)]! });
      cells.push({ x, y: -2, z, color: DIRT[Math.floor(n * 7) % DIRT.length]! });
      if (d < edge - 1.2) cells.push({ x, y: -3, z, color: STONE });
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  cells.forEach((cell, i) => {
    m.makeTranslation(cell.x, cell.y, cell.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setHex(cell.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function disposeMesh(mesh: THREE.InstancedMesh): void {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
  mesh.dispose();
}
