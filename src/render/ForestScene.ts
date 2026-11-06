import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Palette, Voxel } from "@/engine/types";
import { FOREST_SPACING, forestGroundRadius } from "@/engine/forest";
import { createGround, disposeMesh } from "./ground";
import { TreeMesh } from "./TreeMesh";
import { lightingForDate } from "./daynight";
import { SeasonFx } from "./SeasonFx";
import type { Season } from "@/engine/seasons";

export interface ForestEntry {
  slug: string;
  voxels: readonly Voxel[];
  palette: Palette;
  autumn: number;
  evergreen?: boolean;
  x: number;
  z: number;
}

/** A navigable 3D grove: one TreeMesh per solved problem on a big chunk of voxel ground. */
export class ForestScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.5, 1200);
  private controls: OrbitControls;
  private ambient = new THREE.AmbientLight(0xffffff, 0.8);
  private sun = new THREE.DirectionalLight(0xffffff, 1.5);
  private trees = new Map<string, { mesh: TreeMesh; entry: ForestEntry }>();
  private ground: THREE.InstancedMesh | null = null;
  private season: Season = "summer";
  private groundRadius = 20;
  private fx = new SeasonFx();
  private marker = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0xff9455));
  private raycaster = new THREE.Raycaster();
  private raf = 0;
  private running = false;
  private resizeObserver: ResizeObserver;
  private lightTimer: ReturnType<typeof setInterval> | undefined;
  private focusTarget: THREE.Vector3 | null = null;
  private down: { x: number; y: number } | null = null;
  private reducedMotion: boolean;
  private lightCenter = new THREE.Vector3();
  private lightRadius = 60;
  onSelect: (slug: string | null) => void = () => undefined;

  private readonly onVisibility = () => (document.hidden ? this.stop() : this.start());

  constructor(private readonly container: HTMLElement, opts: { reducedMotion?: boolean } = {}) {
    this.reducedMotion = opts.reducedMotion ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    const el = this.renderer.domElement;
    el.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    el.setAttribute("aria-hidden", "true");

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.ambient, this.sun, this.sun.target, this.fx.object);
    this.marker.visible = false;
    this.scene.add(this.marker);

    this.controls = new OrbitControls(this.camera, el);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = 1.4;
    this.controls.minPolarAngle = 0.35;
    this.controls.screenSpacePanning = false;
    this.camera.position.set(60, 55, 60);

    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.applyLighting();
    this.lightTimer = setInterval(() => this.applyLighting(), 60_000);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  /** Replace everything in the grove. Trees already present keep their meshes when nothing changed. */
  setEntries(entries: readonly ForestEntry[]): void {
    const wanted = new Set(entries.map((e) => e.slug));
    for (const [slug, t] of this.trees) {
      if (!wanted.has(slug)) {
        this.scene.remove(t.mesh.group);
        t.mesh.dispose();
        this.trees.delete(slug);
      }
    }
    const now = performance.now();
    let fresh = 0;
    for (const entry of entries) {
      const existing = this.trees.get(entry.slug);
      if (existing && existing.entry.voxels === entry.voxels) {
        existing.mesh.setAutumn(entry.autumn);
        existing.entry = entry;
        continue;
      }
      if (existing) {
        this.scene.remove(existing.mesh.group);
        existing.mesh.dispose();
      }
      const mesh = new TreeMesh(entry.voxels, entry.palette, { season: this.season, evergreen: entry.evergreen });
      mesh.setReducedMotion(this.reducedMotion);
      mesh.setAutumn(entry.autumn);
      mesh.group.position.set(entry.x, 0, entry.z);
      mesh.group.userData.slug = entry.slug;
      this.scene.add(mesh.group);
      // New trees grow in one after another (instant under reduced motion).
      mesh.setShown(mesh.total, now + fresh++ * 180, true);
      this.trees.set(entry.slug, { mesh, entry });
    }

    if (this.ground) {
      this.scene.remove(this.ground);
      disposeMesh(this.ground);
    }
    const radius = forestGroundRadius(Math.max(1, entries.length));
    this.groundRadius = radius;
    this.ground = createGround(radius, 99, this.season);
    this.scene.add(this.ground);
    this.configureFx();

    this.lightRadius = radius + FOREST_SPACING;
    const dist = Math.max(70, radius * 1.9);
    this.controls.minDistance = 25;
    this.controls.maxDistance = dist * 2.4;
    if (!this.focusTarget && this.trees.size <= 1) {
      this.controls.target.set(0, 6, 0);
      this.camera.position.set(dist * 0.55, dist * 0.5, dist * 0.55);
    }
    this.applyLighting();
  }

  setReducedMotion(reduce: boolean): void {
    this.reducedMotion = reduce;
    for (const t of this.trees.values()) t.mesh.setReducedMotion(reduce);
    this.configureFx();
  }

  setSeason(season: Season): void {
    this.season = season;
    for (const t of this.trees.values()) t.mesh.setSeason(season, t.entry.evergreen ?? false);
    if (this.ground) {
      this.scene.remove(this.ground);
      disposeMesh(this.ground);
      this.ground = createGround(this.groundRadius, 99, season);
      this.scene.add(this.ground);
    }
    this.configureFx();
  }

  private configureFx(): void {
    const r = this.groundRadius;
    this.fx.configure(this.season, { radius: r * 0.9, height: 40, count: Math.min(4, Math.max(1, r / 25)) }, !this.reducedMotion);
  }

  select(slug: string | null): void {
    if (!slug || !this.trees.has(slug)) {
      this.marker.visible = false;
      return;
    }
    const { entry, mesh } = this.trees.get(slug)!;
    let maxY = 1;
    let reach = 1;
    for (const v of entry.voxels) {
      maxY = Math.max(maxY, v.y);
      reach = Math.max(reach, Math.abs(v.x), Math.abs(v.z));
    }
    const box = new THREE.Box3(new THREE.Vector3(-reach - 1, -0.5, -reach - 1), new THREE.Vector3(reach + 1, maxY + 1.5, reach + 1));
    box.translate(mesh.group.position);
    this.marker.box.copy(box);
    this.marker.visible = true;
    this.focusTarget = new THREE.Vector3(entry.x, maxY * 0.4, entry.z);
  }

  playCompletion(slug: string): void {
    this.trees.get(slug)?.mesh.playCompletion(performance.now());
  }

  private readonly onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
    this.focusTarget = null;
  };

  private readonly onUp = (e: PointerEvent) => {
    if (!this.down) return;
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
    this.down = null;
    if (moved > 5) return; // that was a drag, not a click
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = [...this.trees.values()].map((t) => t.mesh.object);
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits[0];
    const slug = hit ? ((hit.object.parent?.userData.slug as string | undefined) ?? null) : null;
    this.onSelect(slug);
  };

  private applyLighting(): void {
    const l = lightingForDate(new Date());
    this.ambient.color.setHex(l.ambientColor);
    this.ambient.intensity = l.ambientIntensity;
    this.sun.color.setHex(l.sunColor);
    this.sun.intensity = l.sunIntensity;
    const r = this.lightRadius * 1.4;
    this.sun.position.set(
      this.lightCenter.x + Math.cos(l.sunAzimuth) * Math.cos(l.sunElevation) * r,
      this.lightCenter.y + Math.sin(l.sunElevation) * r,
      this.lightCenter.z + Math.sin(l.sunAzimuth) * Math.cos(l.sunElevation) * r,
    );
    this.sun.target.position.copy(this.lightCenter);
    const s = this.lightRadius * 1.15;
    const cam = this.sun.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 1;
    cam.far = r * 3;
    cam.updateProjectionMatrix();
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      for (const t of this.trees.values()) t.mesh.update(now);
      this.fx.update(now);
      if (this.focusTarget) {
        const d = this.focusTarget.clone().sub(this.controls.target);
        if (d.length() < 0.05) this.focusTarget = null;
        else {
          const step = this.reducedMotion ? d : d.multiplyScalar(0.08);
          this.controls.target.add(step);
          this.camera.position.add(step);
        }
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    clearInterval(this.lightTimer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onUp);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    for (const t of this.trees.values()) t.mesh.dispose();
    this.trees.clear();
    this.fx.dispose();
    if (this.ground) disposeMesh(this.ground);
    this.marker.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
