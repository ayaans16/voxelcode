import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Palette, Voxel } from "@/engine/types";
import { createGround, disposeMesh } from "./ground";
import { TreeMesh } from "./TreeMesh";
import { lightingForDate } from "./daynight";
import { SeasonFx } from "./SeasonFx";
import type { Season } from "@/engine/seasons";

export interface VoxelSceneOptions {
  reducedMotion?: boolean;
  autoOrbit?: boolean;
}

/**
 * A single-tree view: isometric-style low-FOV camera, slow auto-orbit,
 * soft sun + ambient light, voxel ground. Rendering pauses when the tab is hidden.
 */
export class VoxelScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 0.1, 400);
  private controls: OrbitControls;
  private ambient = new THREE.AmbientLight(0xffffff, 0.8);
  private sun = new THREE.DirectionalLight(0xffffff, 1.5);
  private tree: TreeMesh | null = null;
  private season: Season = "summer";
  private evergreen = false;
  private groundRadius = 8;
  private groundSeed = 1;
  private fx = new SeasonFx();
  private ground: THREE.InstancedMesh | null = null;
  private raf = 0;
  private last = 0;
  private running = false;
  private resizeObserver: ResizeObserver;
  private resumeTimer: ReturnType<typeof setTimeout> | undefined;
  private reducedMotion: boolean;
  private lightTimer: ReturnType<typeof setInterval> | undefined;
  private center = new THREE.Vector3(0, 5, 0);
  private distance = 40;
  private frameRadius = 12;
  private readonly onVisibility = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  constructor(private readonly container: HTMLElement, opts: VoxelSceneOptions = {}) {
    this.reducedMotion = opts.reducedMotion ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.setAttribute("aria-hidden", "true");

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.ambient, this.sun, this.sun.target, this.fx.object);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0.5;
    this.controls.maxPolarAngle = 1.35;
    this.controls.autoRotate = (opts.autoOrbit ?? true) && !this.reducedMotion;
    this.controls.autoRotateSpeed = 0.7;
    this.controls.addEventListener("start", () => {
      this.controls.autoRotate = false;
      clearTimeout(this.resumeTimer);
    });
    this.controls.addEventListener("end", () => {
      if (this.reducedMotion || opts.autoOrbit === false) return;
      this.resumeTimer = setTimeout(() => (this.controls.autoRotate = true), 3000);
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.applyLighting();
    this.lightTimer = setInterval(() => this.applyLighting(), 60_000);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  /** Replace the tree (new problem or species). The camera reframes to the FINAL size so nothing jumps while growing. */
  setTree(voxels: readonly Voxel[], palette: Palette, groundRadius?: number, evergreen = false): TreeMesh {
    this.evergreen = evergreen;
    if (this.tree) {
      this.scene.remove(this.tree.group);
      this.tree.dispose();
    }
    if (this.ground) {
      this.scene.remove(this.ground);
      disposeMesh(this.ground);
    }
    this.tree = new TreeMesh(voxels, palette, { season: this.season, evergreen });
    this.tree.setReducedMotion(this.reducedMotion);
    this.scene.add(this.tree.group);

    let maxY = 1;
    let reach = 1;
    for (const v of voxels) {
      maxY = Math.max(maxY, v.y);
      reach = Math.max(reach, Math.hypot(v.x, v.z));
    }
    const radius = groundRadius ?? Math.max(5, Math.ceil(reach) + 2);
    this.groundRadius = radius;
    this.groundSeed = voxels.length;
    this.ground = createGround(radius, voxels.length, this.season);
    this.scene.add(this.ground);

    this.center.set(0, maxY * 0.4, 0);
    // Bounding radius of what we want in frame: the whole final tree plus a bit of ground.
    this.frameRadius = Math.max(maxY * 0.62 + 2, reach + 3) * 1.18;
    this.controls.target.copy(this.center);
    this.fit(true);
    this.applyLighting();
    this.configureFx();
    return this.tree;
  }

  /** Same-shaped tree with new colors (e.g. accents after a solve): no camera or growth reset. */
  updateVoxels(voxels: readonly Voxel[], palette: Palette): boolean {
    if (!this.tree || this.tree.total !== voxels.length) return false;
    this.tree.setVoxels(voxels, palette);
    return true;
  }

  get treeMesh(): TreeMesh | null {
    return this.tree;
  }

  setProgressCount(shown: number, animate = true): void {
    this.tree?.setShown(shown, performance.now(), animate);
  }

  /** Changes the seasonal look: leaf colors, ground, and falling particles. */
  setSeason(season: Season, evergreen = this.evergreen): void {
    this.season = season;
    this.evergreen = evergreen;
    this.tree?.setSeason(season, evergreen);
    if (this.ground) {
      this.scene.remove(this.ground);
      disposeMesh(this.ground);
      this.ground = createGround(this.groundRadius, this.groundSeed, season);
      this.scene.add(this.ground);
    }
    this.configureFx();
  }

  private configureFx(): void {
    this.fx.configure(this.season, { radius: Math.max(8, this.frameRadius * 0.85), height: Math.max(10, this.center.y * 2 + 6) }, !this.reducedMotion);
  }

  setAutumn(f: number): void {
    this.tree?.setAutumn(f);
  }

  playCompletion(): void {
    this.tree?.playCompletion(performance.now());
  }

  setReducedMotion(reduce: boolean): void {
    this.reducedMotion = reduce;
    this.tree?.setReducedMotion(reduce);
    this.controls.autoRotate = !reduce;
    this.configureFx();
  }

  private applyLighting(): void {
    const l = lightingForDate(new Date());
    this.ambient.color.setHex(l.ambientColor);
    this.ambient.intensity = l.ambientIntensity;
    this.sun.color.setHex(l.sunColor);
    this.sun.intensity = l.sunIntensity;
    const r = this.distance * 0.9;
    const el = l.sunElevation;
    this.sun.position.set(
      this.center.x + Math.cos(l.sunAzimuth) * Math.cos(el) * r,
      this.center.y + Math.sin(el) * r,
      this.center.z + Math.sin(l.sunAzimuth) * Math.cos(el) * r,
    );
    this.sun.target.position.copy(this.center);
    const s = this.distance * 0.55;
    const cam = this.sun.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 1;
    cam.far = r * 3;
    cam.updateProjectionMatrix();
  }

  /** Distance at which a sphere of `frameRadius` fits both vertically and horizontally. */
  private fit(resetDirection: boolean): void {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    this.distance = this.frameRadius / Math.sin(Math.min(vfov, hfov) / 2);
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    if (resetDirection || dir.lengthSq() < 1e-6) dir.set(1, 0.78, 1);
    dir.setLength(this.distance);
    this.camera.position.copy(this.controls.target).add(dir);
    this.controls.minDistance = this.distance * 0.5;
    this.controls.maxDistance = this.distance * 1.5;
    this.controls.update();
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.tree) {
      this.fit(false);
      this.applyLighting();
    }
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.last = now;
      this.tree?.update(now);
      this.fx.update(now);
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
    clearTimeout(this.resumeTimer);
    clearInterval(this.lightTimer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.tree?.dispose();
    this.fx.dispose();
    if (this.ground) disposeMesh(this.ground);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
