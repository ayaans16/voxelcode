import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(p: number[]): number {
  let lo = Infinity, best = 0;
  for (const x of p) { lo = Math.min(lo, x); best = Math.max(best, x - lo); }
  return best;
}
const rand = lcg(55);
const big = Array.from({ length: 300_000 }, () => 1 + Math.floor(rand() * 100_000));
const down = Array.from({ length: 300_000 }, (_, i) => 300_000 - i);
const up = Array.from({ length: 300_000 }, (_, i) => i + 1);

export default defineProblem({
  schemaVersion: 1,
  slug: "best-stock-day",
  title: "Buy Low, Sell Later",
  difficulty: "easy",
  patterns: ["sliding-window"],
  statement: `You know the price of a collectible on each upcoming day. You may **buy once** on one day and **sell once** on a **later** day (or do nothing).

Return the largest profit you can make. If no trade makes money, return \`0\`.`,
  constraints: ["1 <= prices.length <= 300 000", "1 <= prices[i] <= 1 000 000"],
  examples: [
    { input: "prices = [7, 1, 5, 3, 6, 4]", output: "5", explanation: "Buy at 1, sell at 6." },
    { input: "prices = [7, 6, 4, 3, 1]", output: "0" },
    { input: "prices = [2, 4, 1]", output: "2" },
  ],
  signature: { name: { python: "best_profit", javascript: "bestProfit" }, params: [{ name: "prices", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[7, 1, 5, 3, 6, 4]], 5), t("basic", [[7, 6, 4, 3, 1]], 0), t("basic", [[2, 4, 1]], 2)],
  hiddenTests: [
    t("basic", [[1, 2, 3, 4, 5]], 4),
    t("basic", [[3, 3, 5, 0, 0, 3, 1, 4]], 4),
    t("edge", [[5]], 0),
    t("edge", [[2, 2, 2]], 0),
    t("edge", [[1, 1000000]], 999999),
    t("large", [big], ref(big)),
    t("large", [down], 0),
    t("large", [up], 299_999),
  ],
  hints: [
    "Trying every buy/sell pair is O(n^2). For a fixed selling day, which buying day would you want?",
    "The best day to have bought is the cheapest day seen so far.",
    "Sweep once, tracking the lowest price so far and the best profit `price - lowest` seen at each day.",
  ],
  editorial: `## Idea

For each possible selling day, the best buy is the **cheapest earlier day**. Keep that minimum as you sweep.

## Cost

**O(n) time, O(1) space.**
`,
  approachCheckpoint: checkpoint({ pattern: "sliding-window", others: ["dp", "binary-search", "stack", "hashing"], time: "O(n)", space: "O(1)", why: "A single left-to-right sweep with a running minimum answers every selling day in O(1), so the total is linear with two variables." }),
  referenceSolution: {
    python: `def best_profit(prices):
    lo, best = float('inf'), 0
    for x in prices:
        lo = min(lo, x)
        best = max(best, x - lo)
    return best
`,
    javascript: `function bestProfit(prices) {
  let lo = Infinity, best = 0;
  for (const x of prices) { lo = Math.min(lo, x); best = Math.max(best, x - lo); }
  return best;
}
`,
  },
});
