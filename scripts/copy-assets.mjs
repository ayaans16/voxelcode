// Copies Monaco and Pyodide into /public so the app has NO runtime CDN dependency
// (local-first, works offline, and lets the CSP forbid third-party connections).
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");

function copy(from, to, filter) {
  if (!existsSync(from)) {
    console.warn(`[copy-assets] skipped, missing: ${from}`);
    return;
  }
  rmSync(to, { recursive: true, force: true });
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, filter });
}

copy(join(nm, "monaco-editor", "min", "vs"), join(root, "public", "monaco", "vs"));

const pyFiles = new Set(["pyodide.asm.mjs", "pyodide.js", "pyodide.asm.wasm", "pyodide.mjs", "python_stdlib.zip", "pyodide-lock.json"]);
mkdirSync(join(root, "public", "pyodide"), { recursive: true });
for (const f of pyFiles) {
  const src = join(nm, "pyodide", f);
  if (existsSync(src)) cpSync(src, join(root, "public", "pyodide", f));
}
console.log("[copy-assets] done");
