import { defineProblem, t } from "../define";

const MOD = 1_000_000_007;
function ref(n: number): number {
  const ways = new Array<number>(n + 1).fill(0);
  ways[0] = 1;
  for (let i = 1; i <= n; i++) {
    let v = ways[i - 1]!;
    if (i >= 2) v += ways[i - 2]!;
    if (i >= 4) v += ways[i - 4]!;
    ways[i] = v % MOD;
  }
  return ways[n]!;
}

export default defineProblem({
  schemaVersion: 1,
  slug: "hop-count",
  title: "Hop Count",
  difficulty: "easy",
  patterns: ["dp"],
  statement: `A frog wants to reach lily pad number \`n\`, starting from pad \`0\`. In one hop it can move **1, 2 or 4** pads forward. Different orders of hops count as different routes (1 then 2 is not the same as 2 then 1).

Return the number of different routes to land exactly on pad \`n\`, **modulo 1 000 000 007** (the answer grows very quickly).`,
  constraints: ["0 <= n <= 1 000 000"],
  examples: [
    { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, 2+1." },
    { input: "n = 4", output: "6", explanation: "1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2, 4." },
    { input: "n = 0", output: "1", explanation: "The frog is already there: one (empty) route." },
  ],
  signature: { name: { python: "count_routes", javascript: "countRoutes" }, params: [{ name: "n", type: "int" }], returns: "long" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [3], 3), t("basic", [4], 6), t("basic", [0], 1)],
  hiddenTests: [
    t("basic", [1], 1),
    t("basic", [2], 2),
    t("basic", [5], 10),
    t("basic", [10], 169),
    t("edge", [6], 18),
    t("large", [50], ref(50)),
    t("large", [100_000], ref(100_000)),
    t("large", [1_000_000], ref(1_000_000)),
  ],
  hints: [
    "List the answers for n = 0, 1, 2, 3, 4 by hand. How does each relate to the earlier ones?",
    "The last hop was 1, 2 or 4 pads. So the routes to `n` are the routes to `n-1`, plus those to `n-2`, plus those to `n-4`.",
    "Fill `ways[0..n]` from the bottom up with `ways[0] = 1`, adding the allowed earlier entries and taking the remainder modulo 1 000 000 007 at each step.",
  ],
  editorial: `## Idea

Condition on the **last hop**. If it was length \`h\`, the frog came from pad \`n - h\`, so \`ways[n] = ways[n-1] + ways[n-2] + ways[n-4]\` (ignoring negative indices).

## Walkthrough

Iterate \`i\` from 1 to \`n\`, summing the allowed earlier entries and reducing modulo 1 000 000 007 each step so numbers stay small. A naive recursion repeats the same subproblems exponentially many times.

## Cost

**O(n) time**. Space is O(n), or O(1) if you only keep the last four values.
`,
  approachCheckpoint: {
    patternOptions: ["dp", "greedy", "math", "binary-search", "stack"],
    correctPattern: "dp",
    complexity: { time: ["O(log n)", "O(n)", "O(n^2)", "O(2^n)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n)", correctSpace: "O(n)" },
    explanation: "Each count depends on three earlier counts, so a bottom-up table fills in O(n) time. A table of n+1 entries is O(n) space (you could trim it to O(1) by keeping only the last four).",
  },
  referenceSolution: {
    python: `def count_routes(n):
    MOD = 1_000_000_007
    ways = [0] * (n + 1)
    ways[0] = 1
    for i in range(1, n + 1):
        v = ways[i - 1]
        if i >= 2:
            v += ways[i - 2]
        if i >= 4:
            v += ways[i - 4]
        ways[i] = v % MOD
    return ways[n]
`,
    javascript: `function countRoutes(n) {
  const MOD = 1000000007;
  const ways = new Array(n + 1).fill(0);
  ways[0] = 1;
  for (let i = 1; i <= n; i++) {
    let v = ways[i - 1];
    if (i >= 2) v += ways[i - 2];
    if (i >= 4) v += ways[i - 4];
    ways[i] = v % MOD;
  }
  return ways[n];
}
`,
    java: `class Solution {
    public static long countRoutes(int n) {
        final long MOD = 1_000_000_007L;
        long[] ways = new long[n + 1];
        ways[0] = 1;
        for (int i = 1; i <= n; i++) {
            long v = ways[i - 1];
            if (i >= 2) v += ways[i - 2];
            if (i >= 4) v += ways[i - 4];
            ways[i] = v % MOD;
        }
        return ways[n];
    }
}
`,
    c: `long long count_routes(int n) {
    const long long MOD = 1000000007LL;
    long long *ways = malloc(sizeof(long long) * (n + 1));
    ways[0] = 1;
    for (int i = 1; i <= n; i++) {
        long long v = ways[i - 1];
        if (i >= 2) v += ways[i - 2];
        if (i >= 4) v += ways[i - 4];
        ways[i] = v % MOD;
    }
    long long r = ways[n];
    free(ways);
    return r;
}
`,
    go: `package main

func countRoutes(n int) int64 {
	const mod = 1000000007
	ways := make([]int64, n+1)
	ways[0] = 1
	for i := 1; i <= n; i++ {
		v := ways[i-1]
		if i >= 2 {
			v += ways[i-2]
		}
		if i >= 4 {
			v += ways[i-4]
		}
		ways[i] = v % mod
	}
	return ways[n]
}
`,
  },
});
