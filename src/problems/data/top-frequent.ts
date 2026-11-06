import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(nums: number[], k: number): number[] {
  const c = new Map<number, number>();
  for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((e) => e[0]);
}
const rand = lcg(101);
const big = Array.from({ length: 200_000 }, () => Math.floor(rand() ** 2 * 50_000));
const flat = Array.from({ length: 100_000 }, (_, i) => i);

export default defineProblem({
  schemaVersion: 1,
  slug: "top-frequent",
  title: "Crowd Favourites",
  difficulty: "medium",
  patterns: ["hashing", "heap"],
  statement: `A song-request line collects the ID of the song each listener asked for.

Return the \`k\` **most requested** song IDs. List them from most to least requested; if two songs were requested the same number of times, the **smaller ID comes first**. You may assume \`k\` is never larger than the number of distinct IDs.`,
  constraints: ["1 <= requests.length <= 200 000", "-1 000 000 <= requests[i] <= 1 000 000", "1 <= k <= number of distinct IDs"],
  examples: [
    { input: "requests = [1, 1, 1, 2, 2, 3], k = 2", output: "[1, 2]" },
    { input: "requests = [5, 3, 5, 3, 1], k = 1", output: "[3]", explanation: "5 and 3 tie with two requests each; the smaller ID wins." },
    { input: "requests = [9], k = 1", output: "[9]" },
  ],
  signature: { name: { python: "top_requests", javascript: "topRequests" }, params: [{ name: "requests", type: "int[]" }, { name: "k", type: "int" }], returns: "int[]" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[1, 1, 1, 2, 2, 3], 2], [1, 2]), t("basic", [[5, 3, 5, 3, 1], 1], [3]), t("basic", [[9], 1], [9])],
  hiddenTests: [
    t("basic", [[4, 4, 5, 5, 6], 2], [4, 5]),
    t("basic", [[2, 2, 2, 1, 1, 3], 3], [2, 1, 3]),
    t("edge", [[-1, -1, 2], 1], [-1]),
    t("edge", [[1, 2, 3], 3], [1, 2, 3]),
    t("edge", [[0, 0, 0, 0], 1], [0]),
    t("large", [big, 10], ref(big, 10)),
    t("large", [big, 500], ref(big, 500)),
    t("large", [flat, 100], flat.slice(0, 100)),
  ],
  hints: [
    "Counting how often each ID appears is the first step. What structure gives you a fast count per ID?",
    "Once you have (ID, count) pairs, the question is ordering them by count (descending) then ID (ascending).",
    "Build a map of counts, sort the entries with that two-part rule, and take the first k. A heap of size k also works if sorting everything feels wasteful.",
  ],
  editorial: `## Idea

Two steps: **count**, then **rank**. A hash map gives counts in one pass. Ranking by (count descending, ID ascending) is a sort, or a size-\`k\` heap when \`k\` is much smaller than the number of distinct IDs.

## Cost

Counting is O(n). Sorting the distinct IDs is O(d log d) where d <= n; a heap is O(d log k). Space is O(d).
`,
  approachCheckpoint: checkpoint({ pattern: "hashing", others: ["heap", "sliding-window", "binary-search", "dp"], time: "O(n log n)", space: "O(n)", why: "Counting with a hash map is linear; ordering the distinct IDs costs O(d log d), which is O(n log n) in the worst case. The map holds up to n entries." }),
  referenceSolution: {
    python: `def top_requests(requests, k):
    cnt = {}
    for x in requests:
        cnt[x] = cnt.get(x, 0) + 1
    ranked = sorted(cnt.items(), key=lambda kv: (-kv[1], kv[0]))
    return [v for v, _ in ranked[:k]]
`,
    javascript: `function topRequests(requests, k) {
  const cnt = new Map();
  for (const x of requests) cnt.set(x, (cnt.get(x) || 0) + 1);
  const ranked = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return ranked.slice(0, k).map((e) => e[0]);
}
`,
  },
});
