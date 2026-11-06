/**
 * Python side of the runner: a small helper script executed inside Pyodide, and
 * a bridge that turns it into the same `Invoker` the JavaScript harness uses.
 * Everything crosses the boundary as JSON strings, which keeps conversion
 * predictable (tuples become lists, None becomes null, sets become sorted lists).
 */
import type { Invoker } from "./harness";

export const PY_HELPER = `
import json, sys, io, time, traceback

_vc_ns = {}

def _vc_default(o):
    if isinstance(o, (set, frozenset)):
        try:
            return sorted(o)
        except TypeError:
            return list(o)
    raise TypeError("Return value of type " + type(o).__name__ + " cannot be compared. Return lists, numbers, strings, booleans, None or dicts.")

def _vc_line(tb):
    line = None
    for frame in traceback.extract_tb(tb):
        if frame.filename == "<solution>":
            line = frame.lineno
    return line

def __vc_load(code, name):
    global _vc_ns
    _vc_ns = {"__name__": "__vc_solution__"}
    try:
        exec(compile(code, "<solution>", "exec"), _vc_ns)
    except SyntaxError as e:
        return json.dumps({"ok": False, "kind": "syntax", "message": "SyntaxError: " + str(e.msg), "line": e.lineno})
    except BaseException as e:
        return json.dumps({"ok": False, "kind": "syntax", "message": type(e).__name__ + ": " + str(e), "line": _vc_line(e.__traceback__)})
    if not callable(_vc_ns.get(name)):
        return json.dumps({"ok": False, "kind": "missing_function", "message": "Define a function named " + name + "."})
    return json.dumps({"ok": True})

def __vc_call(name, args_json):
    fn = _vc_ns[name]
    args = json.loads(args_json)
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    t0 = time.perf_counter()
    try:
        res = fn(*args)
        ms = (time.perf_counter() - t0) * 1000.0
        try:
            out = json.dumps(res, default=_vc_default)
        except TypeError as e:
            return json.dumps({"ok": False, "name": "TypeError", "message": str(e), "line": None, "ms": ms, "stdout": buf.getvalue()})
        return json.dumps({"ok": True, "resultJson": out, "ms": ms, "stdout": buf.getvalue()})
    except BaseException as e:
        ms = (time.perf_counter() - t0) * 1000.0
        return json.dumps({"ok": False, "name": type(e).__name__, "message": str(e), "line": _vc_line(e.__traceback__), "ms": ms, "stdout": buf.getvalue()})
    finally:
        sys.stdout = old
`;

/** The slice of Pyodide we use (kept structural so tests can pass the real thing). */
export interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): (...args: unknown[]) => unknown };
}

export type PyLoadOutcome =
  | { ok: true; invoke: Invoker }
  | { ok: false; kind: "syntax" | "missing_function"; message: string; line?: number };

export function installPyHelper(py: PyodideLike): void {
  py.runPython(PY_HELPER);
}

export function loadPythonSolution(py: PyodideLike, code: string, functionName: string): PyLoadOutcome {
  const load = py.globals.get("__vc_load");
  const call = py.globals.get("__vc_call");
  const res = JSON.parse(String(load(code, functionName))) as { ok: boolean; kind?: "syntax" | "missing_function"; message?: string; line?: number | null };
  if (!res.ok) return { ok: false, kind: res.kind ?? "syntax", message: res.message ?? "Could not load your code.", line: res.line ?? undefined };

  const invoke: Invoker = async (args) => {
    let raw: string;
    try {
      raw = String(call(functionName, JSON.stringify(args)));
    } catch (e) {
      // A Python exception escaping our helper (should not happen) or a Pyodide-level failure.
      return { kind: "error", name: "InternalError", message: String((e as Error).message ?? e), runtimeMs: 0, stdout: "" };
    }
    const r = JSON.parse(raw) as { ok: boolean; resultJson?: string; ms: number; stdout: string; name?: string; message?: string; line?: number | null };
    if (!r.ok) return { kind: "error", name: r.name ?? "Error", message: r.message ?? "", line: r.line ?? undefined, runtimeMs: r.ms, stdout: r.stdout };
    return { kind: "value", value: JSON.parse(r.resultJson as string), runtimeMs: r.ms, stdout: r.stdout };
  };
  return { ok: true, invoke };
}
