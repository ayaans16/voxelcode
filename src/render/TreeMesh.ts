import * as THREE from "three";
import type { Palette, Voxel } from "@/engine/types";
import { cellNoise } from "@/engine/prng";
import { voxelColor } from "./seasons";
import type { Season } from "@/engine/seasons";

const APPEAR_MS = 380;
const MAX_REVEAL_MS = 700;
const CASCADE_MS = 800;
const PULSE_MS = 300;
const PUFF_COUNT = 28;
const PUFF_MS = 2400;

const shared = { geo: null as THREE.BoxGeometry | null };
function boxGeo(): THREE.BoxGeometry {
  return (shared.geo ??= new THREE.BoxGeometry(1, 1, 1));
}

/** easeOutBack: overshoots slightly, giving new voxels their tiny bounce. */
function easeOutBack(t: number): number {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

interface Puff {
  start: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  color: number;
}

/**
 * Renders one tree as a single InstancedMesh. Voxels appear in growth order, so
 * "the first `shown` voxels are visible" is just `mesh.count = shown`.
 */
export class TreeMesh {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private voxels: readonly Voxel[] = [];
  private palette: Palette;
  private autumn = 0;
  private season: Season = "summer";
  private evergreen = false;
  private shown = 0;
  private reduceMotion = false;
  /** index -> start time (ms) of its ease-in animation */
  private appearing = new Map<number, number>();
  private cascadeStart = -1;
  private maxY = 1;
  private puffMesh: THREE.InstancedMesh | null = null;
  private puffs: Puff[] = [];
  private readonly tmp = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpScale = new THREE.Vector3();
  private readonly quat = new THREE.Quaternion();
  private readonly color = new THREE.Color();

  constructor(voxels: readonly Voxel[], palette: Palette, opts: { castShadow?: boolean; season?: Season; evergreen?: boolean } = {}) {
    this.palette = palette;
    this.season = opts.season ?? "summer";
    this.evergreen = opts.evergreen ?? false;
    this.mesh = this.build(voxels);
    this.mesh.castShadow = opts.castShadow ?? true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
  }

  get object(): THREE.InstancedMesh {
    return this.mesh;
  }

  get total(): number {
    return this.voxels.length;
  }

  get shownCount(): number {
    return this.shown;
  }

  private build(voxels: readonly Voxel[]): THREE.InstancedMesh {
    this.voxels = voxels;
    this.maxY = Math.max(1, ...voxels.map((v) => v.y));
    const mesh = new THREE.InstancedMesh(
      boxGeo(),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      Math.max(1, voxels.length),
    );
    voxels.forEach((v, i) => {
      this.writeMatrix(mesh, i, 1);
      this.writeColor(mesh, i);
    });
    mesh.count = 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  private writeMatrix(mesh: THREE.InstancedMesh, i: number, scale: number): void {
    const v = this.voxels[i]!;
    this.tmpPos.set(v.x, v.y, v.z);
    this.tmpScale.setScalar(Math.max(0.0001, scale));
    this.tmp.compose(this.tmpPos, this.quat.identity(), this.tmpScale);
    mesh.setMatrixAt(i, this.tmp);
  }

  private writeColor(mesh: THREE.InstancedMesh, i: number): void {
    const v = this.voxels[i]!;
    mesh.setColorAt(i, this.color.setHex(voxelColor(v.type, this.palette, this.autumn, v.x, v.y, v.z, this.season, this.evergreen)));
  }

  /** Replace the voxel list (e.g. when accents recolor leaves). Keeps the shown count if sizes match. */
  setVoxels(voxels: readonly Voxel[], palette?: Palette): void {
    const sameShape = voxels.length === this.voxels.length;
    const keep = sameShape ? this.shown : 0;
    if (palette) this.palette = palette;
    this.group.remove(this.mesh);
    this.mesh.dispose();
    (this.mesh.material as THREE.Material).dispose();
    const castShadow = this.mesh.castShadow;
    this.mesh = this.build(voxels);
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
    this.appearing.clear();
    this.shown = Math.min(keep, voxels.length);
    this.mesh.count = this.shown;
  }

  setAutumn(autumn: number): void {
    if (Math.abs(autumn - this.autumn) < 0.001) return;
    this.autumn = autumn;
    this.voxels.forEach((_, i) => this.writeColor(this.mesh, i));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  setSeason(season: Season, evergreen: boolean): void {
    if (season === this.season && evergreen === this.evergreen) return;
    this.season = season;
    this.evergreen = evergreen;
    this.voxels.forEach((_, i) => this.writeColor(this.mesh, i));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  setReducedMotion(reduce: boolean): void {
    this.reduceMotion = reduce;
    if (reduce) this.finishAnimations();
  }

  /** Show the first n voxels. New ones ease in unless motion is reduced or `animate` is false. */
  setShown(n: number, now: number, animate = true): void {
    const target = Math.max(0, Math.min(this.voxels.length, Math.floor(n)));
    const prev = this.shown;
    if (target === prev) return;
    if (target < prev) {
      for (let i = target; i < prev; i++) this.appearing.delete(i);
    } else if (animate && !this.reduceMotion) {
      const stagger = Math.min(35, MAX_REVEAL_MS / Math.max(1, target - prev));
      for (let i = prev; i < target; i++) {
        this.appearing.set(i, now + (i - prev) * stagger);
        this.writeMatrix(this.mesh, i, 0);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    this.shown = target;
    this.mesh.count = target;
  }

  /** Cascade up the tree plus a puff of floating leaf voxels. Skipped under reduced motion. */
  playCompletion(now: number): void {
    if (this.reduceMotion) return;
    this.cascadeStart = now;
    this.spawnPuff(now);
  }

  private spawnPuff(now: number): void {
    const leaves = this.voxels.filter((v) => v.type !== "trunk" && v.type !== "branch");
    const top = leaves.slice().sort((a, b) => b.y - a.y).slice(0, Math.max(PUFF_COUNT * 3, 1));
    this.puffs = [];
    for (let i = 0; i < PUFF_COUNT && top.length > 0; i++) {
      const v = top[Math.floor(cellNoise(99, i, 3, 5) * top.length)]!;
      const a = cellNoise(100, i, 1, 2) * Math.PI * 2;
      this.puffs.push({
        start: now + cellNoise(101, i, 4, 4) * 500,
        x: v.x,
        y: v.y,
        z: v.z,
        vx: Math.cos(a) * (0.8 + cellNoise(102, i, 0, 0)),
        vy: 1.6 + cellNoise(103, i, 0, 0) * 2.2,
        vz: Math.sin(a) * (0.8 + cellNoise(104, i, 0, 0)),
        spin: (cellNoise(105, i, 0, 0) - 0.5) * 6,
        color: voxelColor(v.type, this.palette, this.autumn, v.x, v.y, v.z, this.season, this.evergreen),
      });
    }
    if (this.puffMesh) {
      this.group.remove(this.puffMesh);
      (this.puffMesh.material as THREE.Material).dispose();
      this.puffMesh.dispose();
    }
    this.puffMesh = new THREE.InstancedMesh(boxGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), this.puffs.length);
    this.puffs.forEach((p, i) => this.puffMesh!.setColorAt(i, this.color.setHex(p.color)));
    this.puffMesh.count = this.puffs.length;
    this.group.add(this.puffMesh);
  }

  private finishAnimations(): void {
    for (const i of this.appearing.keys()) this.writeMatrix(this.mesh, i, 1);
    this.appearing.clear();
    if (this.cascadeStart >= 0) this.restoreAll();
    this.cascadeStart = -1;
    this.clearPuff();
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private restoreAll(): void {
    for (let i = 0; i < this.shown; i++) this.writeMatrix(this.mesh, i, 1);
  }

  private clearPuff(): void {
    if (!this.puffMesh) return;
    this.group.remove(this.puffMesh);
    (this.puffMesh.material as THREE.Material).dispose();
    this.puffMesh.dispose();
    this.puffMesh = null;
    this.puffs = [];
  }

  /** Advance animations. Returns true while anything is still moving. */
  update(now: number): boolean {
    let busy = false;
    let dirty = false;

    if (this.appearing.size > 0) {
      for (const [i, start] of this.appearing) {
        const t = (now - start) / APPEAR_MS;
        if (t < 0) {
          busy = true;
          continue;
        }
        if (t >= 1) {
          this.writeMatrix(this.mesh, i, 1);
          this.appearing.delete(i);
        } else {
          this.writeMatrix(this.mesh, i, easeOutBack(t));
          busy = true;
        }
        dirty = true;
      }
    }

    if (this.cascadeStart >= 0) {
      const elapsed = now - this.cascadeStart;
      if (elapsed > CASCADE_MS + PULSE_MS) {
        this.restoreAll();
        this.cascadeStart = -1;
        dirty = true;
      } else {
        for (let i = 0; i < this.shown; i++) {
          if (this.appearing.has(i)) continue;
          const v = this.voxels[i]!;
          const local = elapsed - (v.y / this.maxY) * CASCADE_MS;
          const t = local / PULSE_MS;
          this.writeMatrix(this.mesh, i, t > 0 && t < 1 ? 1 + 0.35 * Math.sin(t * Math.PI) : 1);
        }
        busy = true;
        dirty = true;
      }
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;

    if (this.puffMesh) {
      let alive = false;
      this.puffs.forEach((p, i) => {
        const t = (now - p.start) / PUFF_MS;
        if (t < 0) {
          this.tmpScale.setScalar(0.0001);
          this.tmpPos.set(p.x, p.y, p.z);
        } else if (t >= 1) {
          this.tmpScale.setScalar(0.0001);
          this.tmpPos.set(p.x, p.y, p.z);
        } else {
          alive = true;
          const s = t * PUFF_MS * 0.001;
          this.tmpPos.set(p.x + p.vx * s, p.y + p.vy * s - 0.6 * s * s, p.z + p.vz * s);
          this.tmpScale.setScalar(0.45 * (1 - t) ** 1.5);
        }
        this.quat.setFromEuler(new THREE.Euler(0, p.spin * (now - p.start) * 0.001, p.spin * 0.5 * (now - p.start) * 0.001));
        this.tmp.compose(this.tmpPos, this.quat, this.tmpScale);
        this.puffMesh!.setMatrixAt(i, this.tmp);
      });
      this.puffMesh.instanceMatrix.needsUpdate = true;
      if (alive) busy = true;
      else this.clearPuff();
    }
    return busy;
  }

  dispose(): void {
    this.clearPuff();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
