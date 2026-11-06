import type { TestResult } from "./protocol";

export interface CategoryTally {
  passed: number;
  total: number;
}

export interface RunSummary {
  passed: number;
  total: number;
  /** passed / total, 0 if there are no tests. */
  fraction: number;
  byCategory: Record<string, CategoryTally>;
  /** Categories with at least one failure, in first-seen order. */
  failedCategories: string[];
  anyTimeout: boolean;
  anyError: boolean;
  allPassed: boolean;
}

export function summarizeResults(results: readonly TestResult[]): RunSummary {
  const byCategory: Record<string, CategoryTally> = {};
  const failed: string[] = [];
  let passed = 0;
  let anyTimeout = false;
  let anyError = false;
  for (const r of results) {
    const tally = (byCategory[r.category] ??= { passed: 0, total: 0 });
    tally.total++;
    if (r.status === "pass") {
      tally.passed++;
      passed++;
    } else {
      if (!failed.includes(r.category)) failed.push(r.category);
      if (r.status === "timeout") anyTimeout = true;
      if (r.status === "error") anyError = true;
    }
  }
  return {
    passed,
    total: results.length,
    fraction: results.length === 0 ? 0 : passed / results.length,
    byCategory,
    failedCategories: failed,
    anyTimeout,
    anyError,
    allPassed: results.length > 0 && passed === results.length,
  };
}

const LABELS: Record<string, string> = {
  basic: "basic cases",
  edge: "edge cases",
  large: "large inputs",
  random: "random cases",
  stress: "stress cases",
};

export function categoryLabel(category: string): string {
  return LABELS[category] ?? `${category} cases`;
}

/** One calm sentence for a failed hidden run. Never punishing, always specific. */
export function describeHiddenFailure(summary: RunSummary): string {
  if (summary.allPassed) return "All hidden tests passed.";
  const labels = summary.failedCategories.map(categoryLabel).join(", ");
  const tle = summary.anyTimeout ? " Some runs hit the time limit." : "";
  return `${summary.passed} of ${summary.total} hidden tests passed. Still to fix: ${labels}.${tle}`;
}
