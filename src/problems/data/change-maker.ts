import { defineProblem, t } from "../define";

function ref(coins: number[], amount: number): number {
  const INF = Number.POSITIVE_INFINITY;
  const dp = new Array<number>(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a && dp[a - c]! + 1 < dp[a]!) dp[a] = dp[a - c]! + 1;
  return dp[amount] === INF ? -1 : dp[amount]!;
}

const manyCoins = [1, 7, 13, 29, 101, 311];
const awkward = [97, 89, 83, 79];

export default defineProblem({
  schemaVersion: 1,
  slug: "change-maker",
  title: "Change Maker",
  difficulty: "medium",
  patterns: ["dp"],
  statement: `A vending machine has an unlimited supply of coins of several different values.

Given the coin values and a target \`amount\`, return the **fewest coins** that add up to exactly that amount. If it cannot be made, return \`-1\`. An amount of \`0\` needs \`0\` coins.

Note: picking the biggest coin first does not always give the fewest coins.`,
  constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 10 000, all distinct", "0 <= amount <= 50 000"],
  examples: [
    { input: "coins = [1, 5, 10], amount = 27", output: "5", explanation: "10 + 10 + 5 + 1 + 1." },
    { input: "coins = [4, 7], amount = 5", output: "-1" },
    { input: "coins = [1, 6, 7], amount = 12", output: "2", explanation: "6 + 6. Greedy (7 + 1*5) would use six coins." },
  ],
  signature: { name: { python: "fewest_coins", javascript: "fewestCoins" }, params: [{ name: "coins", type: "int[]" }, { name: "amount", type: "int" }], returns: "int" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [[1, 5, 10], 27], 5), t("basic", [[4, 7], 5], -1), t("basic", [[1, 6, 7], 12], 2)],
  hiddenTests: [
    t("basic", [[2], 3], -1),
    t("basic", [[1, 3, 4], 6], 2),
    t("basic", [[5, 10, 25], 30], 2),
    t("edge", [[3], 0], 0),
    t("edge", [[7], 7], 1),
    t("edge", [[10000], 50000], 5),
    t("edge", [[2, 4], 9], -1),
    t("large", [manyCoins, 50_000], ref(manyCoins, 50_000)),
    t("large", [awkward, 49_999], ref(awkward, 49_999)),
    t("large", [[1, 2, 5], 50_000], 10_000),
  ],
  hints: [
    "Try small amounts by hand: what is the fewest coins for 1, 2, 3, ...? Notice how a bigger answer is built from smaller ones.",
    "To make amount `a`, the last coin you add can be any coin `c`. Then you needed the best way to make `a - c`.",
    "Fill a table `best[0..amount]` with `best[0] = 0` and `best[a] = 1 + min(best[a - c])` over coins `c <= a` (ignoring unreachable entries). The answer is `best[amount]`.",
  ],
  editorial: `## Idea

The best way to make \`a\` is some coin \`c\` plus the best way to make \`a - c\`. Those subproblems overlap heavily, so store each result once: **dynamic programming**.

## Walkthrough

\`best[0] = 0\`; every other entry starts as "impossible". For \`a = 1..amount\`, for each coin \`c <= a\` where \`best[a - c]\` is reachable, set \`best[a] = min(best[a], best[a - c] + 1)\`. Return \`best[amount]\` or \`-1\` if it never became reachable.

## Cost

**O(amount * coins) time, O(amount) space.** Plain recursion without remembering results is exponential and times out on the large cases.
`,
  approachCheckpoint: {
    patternOptions: ["dp", "greedy", "binary-search", "graphs", "two-pointers"],
    correctPattern: "dp",
    complexity: { time: ["O(amount)", "O(amount * coins)", "O(coins^amount)", "O(amount^2)"], space: ["O(1)", "O(coins)", "O(amount)", "O(amount * coins)"], correctTime: "O(amount * coins)", correctSpace: "O(amount)" },
    explanation: "Optimal substructure with overlapping subproblems: best[a] depends on best[a - c]. A table over all amounts with a loop over coins is O(amount * coins) time and O(amount) space; greedy fails on inputs like [1, 6, 7].",
  },
  referenceSolution: {
    python: `def fewest_coins(coins, amount):
    INF = float('inf')
    dp = [INF] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return -1 if dp[amount] == INF else dp[amount]
`,
    javascript: `function fewestCoins(coins, amount) {
  const INF = Infinity;
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
    }
  }
  return dp[amount] === INF ? -1 : dp[amount];
}
`,
  },
});
