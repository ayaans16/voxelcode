import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(nums: number[], k: number): number {
  return [...nums].sort((a, b) => b - a)[k - 1]!;
}
const rand = lcg(77);
const big = Array.from({ length: 200_000 }, () => Math.floor(rand() * 2_000_000_000) - 1_000_000_000);
const dup = Array.from({ length: 200_000 }, () => Math.floor(rand() * 20));

export default defineProblem({
  schemaVersion: 1,
  slug: "kth-largest",
  title: "Podium Position",
  difficulty: "medium",
  patterns: ["heap"],
  statement: `A race records finishing **scores** (higher is better) in no particular order. Scores can repeat, and a repeated score counts separately for each racer.

Return the score of the racer in position \`k\` when everyone is ranked from highest to lowest (position 1 is the highest score).`,
  constraints: ["1 <= scores.length <= 200 000", "1 <= k <= scores.length", "-1 000 000 000 <= scores[i] <= 1 000 000 000"],
  examples: [
    { input: "scores = [3, 2, 1, 5, 6, 4], k = 2", output: "5" },
    { input: "scores = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4", output: "4", explanation: "Ranked: 6, 5, 5, 4, ..." },
    { input: "scores = [1], k = 1", output: "1" },
  ],
  signature: { name: { python: "kth_score", javascript: "kthScore" }, params: [{ name: "scores", type: "int[]" }, { name: "k", type: "int" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[3, 2, 1, 5, 6, 4], 2], 5), t("basic", [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4), t("basic", [[1], 1], 1)],
  hiddenTests: [
    t("basic", [[7, 6, 5, 4, 3], 5], 3),
    t("basic", [[2, 2, 2], 2], 2),
    t("edge", [[-1, -2, -3], 3], -3),
    t("edge", [[5, 5], 1], 5),
    t("edge", [[1000000000, -1000000000], 2], -1000000000),
    t("large", [big, 1], ref(big, 1)),
    t("large", [big, 1000], ref(big, 1000)),
    t("large", [dup, 100_000], ref(dup, 100_000)),
  ],
  hints: [
    "Sorting everything and indexing works. But you only care about the top k: do you need the full order?",
    "Keep a collection of the k best scores seen so far. The smallest of those is your current candidate answer.",
    "A min-heap of size k: push each score and pop the smallest when the heap grows beyond k. After processing all scores, the heap's top is the k-th largest.",
  ],
  editorial: `## Idea

A **min-heap of size k** always holds the k largest scores seen so far, and its root is the k-th largest. Each new score either beats the root (replace it) or is ignored.

## Cost

**O(n log k) time, O(k) space.** Sorting is O(n log n) and also passes here; quickselect is O(n) on average.
`,
  approachCheckpoint: checkpoint({ pattern: "heap", others: ["binary-search", "greedy", "two-pointers", "stack"], time: "O(n log n)", space: "O(n)", why: "A size-k heap costs O(n log k), which is O(n log n) in the worst case (k close to n); the heap can hold up to k <= n scores." }),
  referenceSolution: {
    python: `import heapq

def kth_score(scores, k):
    heap = []
    for x in scores:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
    return heap[0]
`,
    javascript: `function kthScore(scores, k) {
  // Sorting is the simple correct route in JavaScript (no built-in heap).
  return [...scores].sort((a, b) => b - a)[k - 1];
}
`,
  },
});
