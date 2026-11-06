import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(h: number[]): number {
  let a = 0, b = 0;
  for (const x of h) { const c = Math.max(b, a + x); a = b; b = c; }
  return b;
}
const rand = lcg(4);
const big = Array.from({ length: 100_000 }, () => Math.floor(rand() * 1001));
const ones = new Array<number>(100_000).fill(1);

export default defineProblem({
  schemaVersion: 1,
  slug: "rob-street",
  title: "Street of Treasures",
  difficulty: "easy",
  patterns: ["dp"],
  statement: `A street has a row of stalls and stall \`i\` holds \`stalls[i]\` coins of treasure. An alarm system links **neighbouring stalls**: if you take treasure from two stalls that stand next to each other, the alarm rings and you lose everything.

You may skip any stalls. Return the **largest total** you can collect without ever taking from two adjacent stalls.`,
  constraints: ["1 <= stalls.length <= 100 000", "0 <= stalls[i] <= 1 000"],
  examples: [
    { input: "stalls = [1, 2, 3, 1]", output: "4", explanation: "Take stalls 0 and 2: 1 + 3." },
    { input: "stalls = [2, 7, 9, 3, 1]", output: "12", explanation: "2 + 9 + 1." },
    { input: "stalls = [5]", output: "5" },
  ],
  signature: { name: { python: "max_loot", javascript: "maxLoot" }, params: [{ name: "stalls", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[1, 2, 3, 1]], 4), t("basic", [[2, 7, 9, 3, 1]], 12), t("basic", [[5]], 5)],
  hiddenTests: [
    t("basic", [[2, 1, 1, 2]], 4),
    t("basic", [[10, 1, 1, 10, 1]], 20),
    t("edge", [[0]], 0),
    t("edge", [[3, 8]], 8),
    t("edge", [[0, 0, 0]], 0),
    t("large", [big], ref(big)),
    t("large", [ones], 50_000),
  ],
  hints: [
    "Look at the last stall. Either you take it, or you do not. What does each choice leave for the stalls before it?",
    "If you take stall i, you add its coins to the best total for stalls up to i - 2. If you skip it, you keep the best for stalls up to i - 1.",
    "best[i] = max(best[i-1], best[i-2] + stalls[i]). You only ever need the previous two values.",
  ],
  editorial: `## Idea

Dynamic programming over a prefix: \`best[i] = max(best[i - 1], best[i - 2] + stalls[i])\`. Skipping stall \`i\` keeps the previous best; taking it forces you back to \`i - 2\`.

## Cost

**O(n) time, O(1) space** (just two rolling values).
`,
  approachCheckpoint: checkpoint({ pattern: "dp", others: ["greedy", "two-pointers", "stack", "binary-search"], time: "O(n)", space: "O(1)", why: "Each answer depends only on the previous two, so a single pass with two rolling variables is enough." }),
  referenceSolution: {
    python: `def max_loot(stalls):
    a = b = 0
    for x in stalls:
        a, b = b, max(b, a + x)
    return b
`,
    javascript: `function maxLoot(stalls) {
  let a = 0, b = 0;
  for (const x of stalls) { const c = Math.max(b, a + x); a = b; b = c; }
  return b;
}
`,
  },
});
