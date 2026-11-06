import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(iv: number[][]): number {
  const s = iv.map((x) => [...x]).sort((a, b) => a[1]! - b[1]!);
  let end = -Infinity, keep = 0;
  for (const [a, b] of s) if (a! >= end) { keep++; end = b!; }
  return iv.length - keep;
}
const rand = lcg(30);
const big = Array.from({ length: 100_000 }, () => { const a = Math.floor(rand() * 1_000_000); return [a, a + 1 + Math.floor(rand() * 50)]; });
const nested = Array.from({ length: 100_000 }, (_, i) => [i, 200_000 - i]);
const chain = Array.from({ length: 100_000 }, (_, i) => [i, i + 1]);

export default defineProblem({
  schemaVersion: 1,
  slug: "fewest-removals",
  title: "Clear the Calendar",
  difficulty: "medium",
  patterns: ["intervals", "greedy"],
  statement: `A meeting room calendar holds events as \`[start, end]\` pairs. Two events **clash** if they overlap for any length of time; an event that ends exactly when another begins does **not** clash.

You want a calendar with no clashes, so you must cancel some events. Return the **smallest number of events** you need to cancel.`,
  constraints: ["1 <= events.length <= 100 000", "0 <= start < end <= 1 000 000"],
  examples: [
    { input: "events = [[1,2],[2,3],[3,4],[1,3]]", output: "1", explanation: "Cancel [1,3]." },
    { input: "events = [[1,2],[1,2],[1,2]]", output: "2" },
    { input: "events = [[1,2],[2,3]]", output: "0" },
  ],
  signature: { name: { python: "min_cancellations", javascript: "minCancellations" }, params: [{ name: "events", type: "int[][]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[[1, 2], [2, 3], [3, 4], [1, 3]]], 1), t("basic", [[[1, 2], [1, 2], [1, 2]]], 2), t("basic", [[[1, 2], [2, 3]]], 0)],
  hiddenTests: [
    t("basic", [[[1, 10], [2, 3], [3, 4], [5, 6]]], 1),
    t("basic", [[[0, 5], [1, 2], [3, 4], [4, 8]]], 1),
    t("edge", [[[1, 2]]], 0),
    t("edge", [[[1, 100], [2, 3], [4, 5], [6, 7]]], 1),
    t("edge", [[[1, 3], [2, 4], [3, 5]]], 1),
    t("large", [big], ref(big)),
    t("large", [nested], 99_999),
    t("large", [chain], 0),
  ],
  hints: [
    "Equivalently, keep as many events as possible. Which event is the safest one to keep first?",
    "Greedy: among the remaining choices, the event that ENDS earliest leaves the most room for later events.",
    "Sort by end time. Keep an event if it starts at or after the end of the last kept event; otherwise cancel it. Answer = total - kept.",
  ],
  editorial: `## Idea

Maximising the number of non-clashing events is the classic **activity selection** problem. Always keep the event that finishes earliest among those that still fit; an exchange argument shows this never hurts.

## Cost

Sorting dominates: **O(n log n) time**, O(1) extra space beyond the sort.
`,
  approachCheckpoint: checkpoint({ pattern: "greedy", others: ["intervals", "dp", "two-pointers", "stack"], time: "O(n log n)", space: "O(1)", why: "After sorting by end time (O(n log n)), a single sweep keeps each event that fits, tracking only the last end time." }),
  referenceSolution: {
    python: `def min_cancellations(events):
    end = float('-inf')
    keep = 0
    for a, b in sorted(events, key=lambda e: e[1]):
        if a >= end:
            keep += 1
            end = b
    return len(events) - keep
`,
    javascript: `function minCancellations(events) {
  const s = events.map((e) => [e[0], e[1]]).sort((a, b) => a[1] - b[1]);
  let end = -Infinity, keep = 0;
  for (const [a, b] of s) if (a >= end) { keep++; end = b; }
  return events.length - keep;
}
`,
  },
});
