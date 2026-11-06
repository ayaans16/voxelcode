import * as THREE from "three";
import { FX_BY_SEASON, type Season } from "@/engine/seasons";
import { cellNoise } from "@/engine/prng";

/**
 * Ambient falling particles for a season: petals in spring, leaves in autumn, snow in winter.
 * Purely cosmetic and skipped entirely under reduced motion.
 */
export class SeasonFx {
  readonly object = new THREE.Group();
  private mesh: THREE.InstancedMesh | null = null;
  private data: { x: number; y: number; z: number; speed: number; phase: number; size: number }[] = [];
  private season: Season = "summer";
  private enabled = true;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly e = new THREE.Euler();

  constructor(private extent = { radius: 14, height: 22, count: 1 }) {}

  configure(season: Season, extent: { radius: number; height: number; count?: number }, enabled: boolean): void {
    this.season = season;
    this.enabled = enabled;
    this.extent = { radius: extent.radius, height: extent.height, count: extent.count ?? 1 };
    this.rebuild();
  }

  private rebuild(): void {
    if (this.mesh) {
      this.object.remove(this.mesh);
      (this.mesh.material as THREE.Material).dispose();
      this.mesh.dispose();
      this.mesh = null;
    }
    const style = FX_BY_SEASON[this.season];
    if (!style || !this.enabled) return;
    const n = Math.round(style.count * this.extent.count);
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    const c = new THREE.Color();
    this.data = [];
    for (let i = 0; i < n; i++) {
      const r = (k: number) => cellNoise(500 + k, i, 1, 2);
      this.data.push({
        x: (r(1) * 2 - 1) * this.extent.radius,
        y: r(2) * this.extent.height,
        z: (r(3) * 2 - 1) * this.extent.radius,
        speed: style.speed[0] + r(4) * (style.speed[1] - style.speed[0]),
        phase: r(5) * Math.PI * 2,
        size: style.size[0] + r(6) * (style.size[1] - style.size[0]),
      });
      this.mesh.setColorAt(i, c.setHex(style.colors[Math.floor(r(7) * style.colors.length) % style.colors.length]!));
    }
    this.mesh.frustumCulled = false;
    this.object.add(this.mesh);
  }

  update(nowMs: number): void {
    const style = FX_BY_SEASON[this.season];
    if (!this.mesh || !style) return;
    const t = nowMs / 1000;
    const h = this.extent.height;
    this.data.forEach((d, i) => {
      const y = h - ((d.y + (h - 0) - t * d.speed) % h + h) % h; // falls from top to bottom, wraps
      const sway = Math.sin(t * 0.9 + d.phase) * style.sway;
      this.p.set(d.x + sway, Math.max(0.2, y), d.z + Math.cos(t * 0.7 + d.phase) * style.sway * 0.6);
      this.e.set(t * 0.8 + d.phase, t * 0.6, d.phase);
      this.q.setFromEuler(this.e);
      this.s.setScalar(d.size);
      this.m.compose(this.p, this.q, this.s);
      this.mesh!.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.enabled = false;
    this.rebuild();
  }
}
