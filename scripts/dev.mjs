// Runs the worker bundler in watch mode next to `next dev`.
import { spawn } from "node:child_process";

const procs = [
  spawn("node", ["scripts/build-workers.mjs", "--watch"], { stdio: "inherit" }),
  spawn("npx", ["next", "dev", ...process.argv.slice(2)], { stdio: "inherit" }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", () => stop()));
