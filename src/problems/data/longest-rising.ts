import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(nums: number[]): number {
  const tails: number[] = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m]! < x) lo = m + 1; else hi = m; }
    tails[lo] = x;
  }
  return tails.length;
}
const rand = lcg(6);
const big = Array.from({ length: 100_000 }, () => Math.floor(rand() * 1_000_000));
const up = Array.from({ length: 100_000 }, (_, i) => i);
const down = Array.from({ length: 100_000 }, (_, i) => 100_000 - i);

export default defineProblem({
  schemaVersion: 1,
  slug: "longest-rising",
  title: "Longest Climb",
  difficulty: "medium",
  patterns: ["dp", "binary-search"],
  statement: `A hiker records the altitude at each checkpoint along a trail. A **climb** is a selection of checkpoints, kept in their original order but **not necessarily adjacent**, whose altitudes are **strictly increasing**.

Return the number of checkpoints in the **longest climb**.`,
  constraints: ["1 <= altitudes.length <= 100 000", "-1 000 000 000 <= altitudes[i] <= 1 000 000 000"],
  examples: [
    { input: "altitudes = [10, 9, 2, 5, 3, 7, 101, 18]", output: "4", explanation: "2, 3, 7, 18." },
    { input: "altitudes = [0, 1, 0, 3, 2, 3]", output: "4" },
    { input: "altitudes = [7, 7, 7]", output: "1", explanation: "Equal is not strictly increasing." },
  ],
  signature: { name: { python: "longest_climb", javascript: "longestClimb" }, params: [{ name: "altitudes", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[10, 9, 2, 5, 3, 7, 101, 18]], 4), t("basic", [[0, 1, 0, 3, 2, 3]], 4), t("basic", [[7, 7, 7]], 1)],
  hiddenTests: [
    t("basic", [[1, 3, 6, 7, 9, 4, 10, 5, 6]], 6),
    t("basic", [[5, 4, 3, 2, 1]], 1),
    t("edge", [[1]], 1),
    t("edge", [[-3, -2, -1]], 3),
    t("edge", [[2, 2, 3, 3]], 2),
    t("large", [big], ref(big)),
    t("large", [up], 100_000),
    t("large", [down], 1),
  ],
  hints: [
    "A classic table: best[i] = longest climb ending at checkpoint i. Computing it takes O(n^2), which is too slow here.",
    "Keep an array tails where tails[k] is the smallest possible final altitude of a climb of length k + 1.",
    "tails is always sorted, so for each altitude binary-search the first tail that is >= it and overwrite that slot (or append if none). The final length of tails is the answer.",
  ],
  editorial: `## Idea

The O(n^2) DP asks, for each element, the best earlier element it can extend. The faster idea keeps, for every length, the **smallest tail value** that ends a climb of that length. Because these tails are increasing, each new altitude can be placed with a **binary search**.

## Cost

**O(n log n) time, O(n) space.** (The pure DP is O(n^2) and times out on the large inputs.)
`,
  approachCheckpoint: checkpoint({ pattern: "dp", others: ["binary-search", "greedy", "two-pointers", "stack"], time: "O(n log n)", space: "O(n)", why: "Each element is placed in the sorted tails array by binary search (O(log n)), giving O(n log n) overall with O(n) storage. It is rooted in the length-by-length DP idea, optimised." }),
  referenceSolution: {
    python: `from bisect import bisect_left

def longest_climb(altitudes):
    tails = []
    for x in altitudes:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
`,
    javascript: `function longestClimb(altitudes) {
  const tails = [];
  for (const x of altitudes) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (tails[m] < x) lo = m + 1; else hi = m;
    }
    tails[lo] = x;
  }
  return tails.length;
}
`,
  },
});
