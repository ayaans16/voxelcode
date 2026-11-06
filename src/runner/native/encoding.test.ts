import { describe, expect, it } from "vitest";
import { decodeValue, encodeTests, encodeValue, hexOf, unhex } from "./encoding";
import { guardNativeRequest, hostnameOf } from "./guard";
import { defaultStarter } from "@/problems/starters";
import { cDriver, goDriver, javaDriver } from "./drivers";
import { precheck } from "./execute";
import type { ValueType } from "@/problems/languages";

const roundtrip = (type: ValueType, v: unknown) => {
  const tokens: string[] = [];
  encodeValue(type, v, tokens);
  return decodeValue(type, tokens);
};

describe("token encoding", () => {
  it("round-trips every value type", () => {
    expect(roundtrip("int", -42)).toBe(-42);
    expect(roundtrip("long", 2_000_000_000_000)).toBe(2_000_000_000_000);
    expect(roundtrip("bool", true)).toBe(true);
    expect(roundtrip("bool", false)).toBe(false);
    expect(roundtrip("string", "")).toBe("");
    expect(roundtrip("string", "héllo wörld {[a+b]}")).toBe("héllo wörld {[a+b]}");
    expect(roundtrip("int[]", [])).toEqual([]);
    expect(roundtrip("int[]", [3, -1, 2])).toEqual([3, -1, 2]);
    expect(roundtrip("int[][]", [[1, 2], [], [3]])).toEqual([[1, 2], [], [3]]);
    expect(roundtrip("int[][]", [])).toEqual([]);
    expect(roundtrip("string[]", ["a b", "", "c"])).toEqual(["a b", "", "c"]);
  });
  it("hex-encodes strings so spaces and newlines cannot break the token stream", () => {
    expect(hexOf("")).toBe("-");
    expect(hexOf("a b\n")).toBe("6120620a");
    expect(unhex("6120620a")).toBe("a b\n");
    expect(encodeTests(["string"], [{ args: ["x y"] }]).trim().split(/\s+/)).toEqual(["1", hexOf("x y")]);
  });
  it("encodes a multi-argument test document", () => {
    expect(encodeTests(["int[]", "int"], [{ args: [[1, 2], 9] }, { args: [[], 0] }])).toBe("2\n2 1 2 9\n0 0\n");
  });
  it("fails loudly on a truncated result", () => {
    expect(() => decodeValue("int[]", ["3", "1"])).toThrow();
  });
});

describe("compile server guard", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  const ok = { host: "localhost:3000", "content-type": "application/json" };
  it("accepts same-origin JSON requests to localhost", () => {
    expect(guardNativeRequest(h({ ...ok, origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }), { requireJson: true, env: {} }).ok).toBe(true);
    expect(guardNativeRequest(h({ host: "127.0.0.1:3100", "content-type": "application/json" }), { requireJson: true, env: {} }).ok).toBe(true);
    expect(guardNativeRequest(h({ host: "[::1]:3000", "content-type": "application/json" }), { requireJson: true, env: {} }).ok).toBe(true);
  });
  it("rejects other websites, LAN hosts, wrong content types and the off switch", () => {
    expect(guardNativeRequest(h({ ...ok, origin: "https://evil.example" }), { requireJson: true, env: {} }).status).toBe(403);
    expect(guardNativeRequest(h({ ...ok, "sec-fetch-site": "cross-site" }), { requireJson: true, env: {} }).status).toBe(403);
    expect(guardNativeRequest(h({ host: "192.168.1.5:3000", "content-type": "application/json" }), { requireJson: true, env: {} }).status).toBe(403);
    expect(guardNativeRequest(h({ host: "evil.example", "content-type": "application/json" }), { requireJson: true, env: {} }).status).toBe(403);
    expect(guardNativeRequest(h({ host: "localhost:3000", "content-type": "text/plain" }), { requireJson: true, env: {} }).status).toBe(415);
    expect(guardNativeRequest(h(ok), { requireJson: true, env: { VOXELCODE_NATIVE_RUNNER: "off" } }).status).toBe(403);
  });
  it("parses host headers", () => {
    expect(hostnameOf("LocalHost:3000")).toBe("localhost");
    expect(hostnameOf("[::1]:3000")).toBe("[::1]");
    expect(hostnameOf(null)).toBe("");
  });
});

describe("generated starters and drivers", () => {
  const sig = { name: { python: "best_pair", javascript: "bestPair" }, params: [{ name: "prices", type: "int[]" as const }, { name: "budget", type: "int" as const }], returns: "int" as const };
  it("produces idiomatic starters per language", () => {
    expect(defaultStarter(sig, "java")).toContain("public static int bestPair(int[] prices, int budget)");
    expect(defaultStarter(sig, "c")).toContain("int best_pair(const int *prices, int pricesLen, int budget)");
    expect(defaultStarter(sig, "go")).toContain("func bestPair(prices []int, budget int) int");
  });
  it("uses the pointer+length and out-parameter conventions for array returns in C", () => {
    const s = defaultStarter({ ...sig, returns: "int[][]", params: [{ name: "rows", type: "int[][]" }] }, "c");
    expect(s).toContain("int **rows, int rowsLen, const int *rowsCols, int *returnSize, int **returnColumnSizes");
  });
  it("drivers call the learner's function by name", () => {
    const d = { fn: "bestPair", params: sig.params, returns: sig.returns };
    expect(javaDriver(d)).toContain("Solution.bestPair(p0, p1)");
    expect(cDriver({ ...d, fn: "best_pair" })).toContain("best_pair((const int *)p0, p0Len, p1)");
    expect(goDriver(d)).toContain("res = bestPair(p0, p1)");
  });
  it("prechecks give friendly messages", () => {
    expect(precheck("java", "class Foo {}", "f")).toMatch(/class named Solution/);
    expect(precheck("go", "func f() int { return 1 }", "f")).toMatch(/package main/);
    expect(precheck("go", "package main\nfunc main() {}\nfunc f() int { return 1 }", "f")).toMatch(/Remove your main/);
    expect(precheck("c", "int g(void){return 1;}", "f")).toMatch(/Define a function named f/);
    expect(precheck("c", "int f(void){return 1;}", "f")).toBeNull();
  });
});
