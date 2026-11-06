// Bundles the runner workers into /public/workers as real ES-module workers.
// Why not let Next bundle them? Pyodide refuses to run inside a "classic" worker, and the
// bundler emits classic ones. Serving our own module workers also keeps the sandbox simple:
// a same-origin static file the CSP can reason about.
import { build, context } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");
const prod = process.env.NODE_ENV === "production" || process.argv.includes("--prod");

const options = {
  entryPoints: [join(root, "src/runner/js.worker.ts"), join(root, "src/runner/py.worker.ts")],
  outdir: join(root, "public/workers"),
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  tsconfig: join(root, "tsconfig.json"),
  sourcemap: prod ? false : "inline",
  minify: prod,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("[build-workers] watching src/runner ...");
} else {
  await build(options);
}
