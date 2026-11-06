import { describe, expect, it } from "vitest";
import template from "./data/_template";
import { PROBLEMS } from "./index";
import { runJsHarness } from "@/runner/harness";
import { toRunTests } from "@/runner/problemRun";

describe("authoring template", () => {
  it("is a valid problem that its own reference solution passes (so the template cannot rot)", async () => {
    for (const which of ["visible", "hidden"] as const) {
      const { results, fatal } = await runJsHarness({
        code: template.referenceSolution.javascript,
        functionName: template.signature.name.javascript,
        tests: toRunTests(template, which),
        comparison: template.comparison,
        timeLimitMs: 5000,
      });
      expect(fatal).toBeUndefined();
      expect(results.every((r) => r.status === "pass")).toBe(true);
    }
  });
  it("is NOT registered in the app", () => {
    expect(PROBLEMS.some((p) => p.slug === template.slug)).toBe(false);
  });
});
