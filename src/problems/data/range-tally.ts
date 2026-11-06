import { defineProblem, lcg, t } from "../define";

function ref(nums: number[], queries: number[][]): number[] {
  const prefix = [0];
  for (const x of nums) prefix.push(prefix[prefix.length - 1]! + x);
  return queries.map(([l, r]) => prefix[r! + 1]! - prefix[l!]!);
}

const rand = lcg(3);
const nums = Array.from({ length: 200_000 }, () => Math.floor(rand() * 2000) - 1000);
const queries = Array.from({ length: 100_000 }, () => {
  const a = Math.floor(rand() * nums.length);
  const b = Math.floor(rand() * nums.length);
  return [Math.min(a, b), Math.max(a, b)];
});
const wide = Array.from({ length: 100_000 }, () => [0, nums.length - 1]);

export default defineProblem({
  schemaVersion: 1,
  slug: "range-tally",
  title: "Range Tally",
  difficulty: "easy",
  patterns: ["arrays"],
  statement: `A shop records its profit (or loss) for each day in a list. Managers keep asking: "How much did we make from day \`l\` to day \`r\`, inclusive?"

Given the daily figures and a list of questions \`[l, r]\` (0-based, \`l <= r\`), return the answer to every question, in order.

There can be a lot of questions, so recomputing each sum from scratch will be too slow.`,
  constraints: ["1 <= nums.length <= 200 000", "-1000 <= nums[i] <= 1000", "1 <= queries.length <= 100 000", "0 <= l <= r < nums.length"],
  examples: [
    { input: "nums = [3, 1, 4, 1, 5, 9], queries = [[0, 2], [3, 5], [1, 1]]", output: "[8, 15, 1]" },
    { input: "nums = [-2, 5], queries = [[0, 1]]", output: "[3]" },
    { input: "nums = [7], queries = [[0, 0], [0, 0]]", output: "[7, 7]" },
  ],
  signature: { name: { python: "range_sums", javascript: "rangeSums" }, params: [{ name: "nums", type: "int[]" }, { name: "queries", type: "int[][]" }], returns: "int[]" },
  timeLimitMs: 1500,
  visibleTests: [
    t("basic", [[3, 1, 4, 1, 5, 9], [[0, 2], [3, 5], [1, 1]]], [8, 15, 1]),
    t("basic", [[-2, 5], [[0, 1]]], [3]),
    t("basic", [[7], [[0, 0], [0, 0]]], [7, 7]),
  ],
  hiddenTests: [
    t("basic", [[1, 2, 3, 4, 5], [[0, 4], [1, 3], [2, 2]]], [15, 9, 3]),
    t("basic", [[10, -10, 10, -10], [[0, 3], [0, 0], [1, 2]]], [0, 10, 0]),
    t("edge", [[0, 0, 0], [[0, 2]]], [0]),
    t("edge", [[-1000, -1000], [[0, 1], [1, 1]]], [-2000, -1000]),
    t("large", [nums, queries], ref(nums, queries)),
    t("large", [nums, wide], ref(nums, wide)),
  ],
  hints: [
    "Adding up the slice for each question costs up to n per question. With many questions that is too slow.",
    "Precompute something once so each question becomes a couple of lookups.",
    "Build prefix sums: `prefix[i]` is the sum of the first `i` numbers. Then the sum from `l` to `r` is `prefix[r + 1] - prefix[l]`.",
  ],
  editorial: `## Idea

Do the heavy work **once**: a prefix-sum array lets any range sum be computed as a difference of two entries.

## Walkthrough

\`prefix[0] = 0\` and \`prefix[i + 1] = prefix[i] + nums[i]\`. For a question \`[l, r]\`, the answer is \`prefix[r + 1] - prefix[l]\`.

## Cost

Building: **O(n)**. Each question: **O(1)**. Total **O(n + q) time, O(n) space**, versus O(n * q) for rescanning.
`,
  approachCheckpoint: {
    patternOptions: ["arrays", "sliding-window", "binary-search", "dp", "hashing"],
    correctPattern: "arrays",
    complexity: { time: ["O(n + q)", "O(n * q)", "O(q log n)", "O(n^2)"], space: ["O(1)", "O(n)", "O(n + q)", "O(n * q)"], correctTime: "O(n + q)", correctSpace: "O(n)" },
    explanation: "Precomputing prefix sums is one O(n) pass, after which every question is O(1). The prefix array is O(n) extra space (the answer list is output, not counted).",
  },
  referenceSolution: {
    python: `def range_sums(nums, queries):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    return [prefix[r + 1] - prefix[l] for l, r in queries]
`,
    javascript: `function rangeSums(nums, queries) {
  const prefix = [0];
  for (const x of nums) prefix.push(prefix[prefix.length - 1] + x);
  return queries.map(([l, r]) => prefix[r + 1] - prefix[l]);
}
`,
    java: `class Solution {
    public static int[] rangeSums(int[] nums, int[][] queries) {
        long[] prefix = new long[nums.length + 1];
        for (int i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
        int[] out = new int[queries.length];
        for (int q = 0; q < queries.length; q++) out[q] = (int) (prefix[queries[q][1] + 1] - prefix[queries[q][0]]);
        return out;
    }
}
`,
    c: `int *range_sums(const int *nums, int numsLen, int **queries, int queriesLen, const int *queriesCols, int *returnSize) {
    long long *prefix = malloc(sizeof(long long) * (numsLen + 1));
    prefix[0] = 0;
    for (int i = 0; i < numsLen; i++) prefix[i + 1] = prefix[i] + nums[i];
    int *out = malloc(sizeof(int) * (queriesLen > 0 ? queriesLen : 1));
    for (int q = 0; q < queriesLen; q++) out[q] = (int)(prefix[queries[q][1] + 1] - prefix[queries[q][0]]);
    free(prefix);
    *returnSize = queriesLen;
    return out;
}
`,
    go: `package main

func rangeSums(nums []int, queries [][]int) []int {
	prefix := make([]int, len(nums)+1)
	for i, x := range nums {
		prefix[i+1] = prefix[i] + x
	}
	out := make([]int, len(queries))
	for q, r := range queries {
		out[q] = prefix[r[1]+1] - prefix[r[0]]
	}
	return out
}
`,
  },
});
