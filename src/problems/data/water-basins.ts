import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(h: number[]): number {
  let i = 0, j = h.length - 1, best = 0;
  while (i < j) {
    best = Math.max(best, Math.min(h[i]!, h[j]!) * (j - i));
    if (h[i]! < h[j]!) i++; else j--;
  }
  return best;
}
const rand = lcg(12);
const big = Array.from({ length: 100_000 }, () => 1 + Math.floor(rand() * 10_000));
const ramp = Array.from({ length: 100_000 }, (_, i) => i + 1);
const flat = new Array<number>(100_000).fill(10_000);

export default defineProblem({
  schemaVersion: 1,
  slug: "water-basins",
  title: "Biggest Basin",
  difficulty: "medium",
  patterns: ["two-pointers"],
  statement: `Vertical walls stand in a row, one unit apart. \`heights[i]\` is the height of wall \`i\`.

Pick **two different walls** and imagine a basin between them. It can hold water up to the height of the **shorter** wall, and its width is the distance between the walls (the difference of their positions). The basin's capacity is height times width.

Return the largest capacity you can get. Ignore any walls in between.`,
  constraints: ["2 <= heights.length <= 100 000", "1 <= heights[i] <= 10 000"],
  examples: [
    { input: "heights = [1, 8, 6, 2, 5, 4, 8, 3, 7]", output: "49", explanation: "Walls of height 8 (position 1) and 7 (position 8): 7 * 7 = 49." },
    { input: "heights = [1, 1]", output: "1" },
    { input: "heights = [4, 3, 2, 1, 4]", output: "16" },
  ],
  signature: { name: { python: "best_basin", javascript: "bestBasin" }, params: [{ name: "heights", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[1, 8, 6, 2, 5, 4, 8, 3, 7]], 49), t("basic", [[1, 1]], 1), t("basic", [[4, 3, 2, 1, 4]], 16)],
  hiddenTests: [
    t("basic", [[1, 2, 1]], 2),
    t("basic", [[2, 3, 4, 5, 18, 17, 6]], 17),
    t("edge", [[10000, 10000]], 10000),
    t("edge", [[1, 10000]], 1),
    t("edge", [[5, 5, 5, 5]], 15),
    t("large", [big], ref(big)),
    t("large", [ramp], ref(ramp)),
    t("large", [flat], 10_000 * 99_999),
  ],
  hints: [
    "Trying every pair of walls is O(n^2): too slow for 100 000 walls. Start with the two outermost walls instead.",
    "From the widest pair, which wall could possibly lead to a better basin if you moved it inward: the taller one or the shorter one?",
    "Move the pointer at the shorter wall inward. Moving the taller one can only make the width smaller without raising the limiting height. Track the best capacity as you go.",
  ],
  editorial: `## Idea

Start with the widest basin (walls at both ends). The shorter wall limits the height, so moving the **taller** wall inward can never help (width shrinks, limit stays the same or drops). The only move that might improve things is to advance the **shorter** wall.

## Walkthrough

\`i = 0\`, \`j = n - 1\`. Record \`min(h[i], h[j]) * (j - i)\`, then move whichever pointer is at the shorter wall. Stop when they meet.

## Cost

**O(n) time, O(1) space.**
`,
  approachCheckpoint: checkpoint({ pattern: "two-pointers", others: ["sliding-window", "dp", "stack", "binary-search"], time: "O(n)", space: "O(1)", why: "Each step discards one wall that can no longer be part of a better basin, so the two pointers cross after at most n moves, using only a few variables." }),
  referenceSolution: {
    python: `def best_basin(heights):
    i, j, best = 0, len(heights) - 1, 0
    while i < j:
        best = max(best, min(heights[i], heights[j]) * (j - i))
        if heights[i] < heights[j]:
            i += 1
        else:
            j -= 1
    return best
`,
    javascript: `function bestBasin(heights) {
  let i = 0, j = heights.length - 1, best = 0;
  while (i < j) {
    best = Math.max(best, Math.min(heights[i], heights[j]) * (j - i));
    if (heights[i] < heights[j]) i++; else j--;
  }
  return best;
}
`,
  },
});
