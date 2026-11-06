import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(h: number[]): number {
  const st: number[] = [];
  let best = 0;
  for (let i = 0; i <= h.length; i++) {
    const cur = i === h.length ? 0 : h[i]!;
    while (st.length && h[st[st.length - 1]!]! >= cur) {
      const height = h[st.pop()!]!;
      const left = st.length ? st[st.length - 1]! + 1 : 0;
      best = Math.max(best, height * (i - left));
    }
    st.push(i);
  }
  return best;
}
const rand = lcg(91);
const big = Array.from({ length: 100_000 }, () => 1 + Math.floor(rand() * 10_000));
const up = Array.from({ length: 100_000 }, (_, i) => Math.floor(i / 10) + 1);
const same = new Array<number>(100_000).fill(10_000);

export default defineProblem({
  schemaVersion: 1,
  slug: "histogram-rect",
  title: "Widest Block",
  difficulty: "hard",
  patterns: ["stack"],
  statement: `A bar chart has bars of width 1 standing side by side; \`heights[i]\` is the height of bar \`i\`.

Find the **largest rectangle** that fits inside the chart without going above any bar it covers. The rectangle spans consecutive bars, its height is limited by the **shortest** bar it covers, and its area is height times the number of bars covered.

Return the largest area.`,
  constraints: ["1 <= heights.length <= 100 000", "0 <= heights[i] <= 10 000"],
  examples: [
    { input: "heights = [2, 1, 5, 6, 2, 3]", output: "10", explanation: "The bars of height 5 and 6 give a 5 x 2 rectangle." },
    { input: "heights = [2, 4]", output: "4" },
    { input: "heights = [5]", output: "5" },
  ],
  signature: { name: { python: "largest_block", javascript: "largestBlock" }, params: [{ name: "heights", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[2, 1, 5, 6, 2, 3]], 10), t("basic", [[2, 4]], 4), t("basic", [[5]], 5)],
  hiddenTests: [
    t("basic", [[6, 2, 5, 4, 5, 1, 6]], 12),
    t("basic", [[1, 1, 1, 1]], 4),
    t("edge", [[0]], 0),
    t("edge", [[0, 0, 3, 0]], 3),
    t("edge", [[10000, 1, 10000]], 10000),
    t("large", [big], ref(big)),
    t("large", [up], ref(up)),
    t("large", [same], 1_000_000_000),
  ],
  hints: [
    "For each bar, imagine it is the shortest bar in the rectangle. How far can the rectangle stretch left and right?",
    "It stretches until a strictly shorter bar appears on each side. Finding those boundaries for every bar naively is O(n^2).",
    "Keep a stack of bars with increasing heights. When a shorter bar arrives, pop taller bars: each popped bar's rectangle ends here and starts after the new top of the stack.",
  ],
  editorial: `## Idea

A **monotonic stack** of bar indices with non-decreasing heights. When bar \`i\` is shorter than the top, the top bar can extend no further right, so settle its rectangle: width runs from just after the new top to \`i - 1\`.

## Cost

Each bar is pushed and popped once: **O(n) time, O(n) space.** A sentinel height of 0 at the end flushes the stack.
`,
  approachCheckpoint: checkpoint({ pattern: "stack", others: ["two-pointers", "dp", "binary-search", "greedy"], time: "O(n)", space: "O(n)", why: "A monotonic stack finds each bar's nearest shorter neighbours in amortised constant time, and can hold up to n bars (an increasing chart)." }),
  referenceSolution: {
    python: `def largest_block(heights):
    st = []
    best = 0
    n = len(heights)
    for i in range(n + 1):
        cur = 0 if i == n else heights[i]
        while st and heights[st[-1]] >= cur:
            h = heights[st.pop()]
            left = st[-1] + 1 if st else 0
            best = max(best, h * (i - left))
        st.append(i)
    return best
`,
    javascript: `function largestBlock(heights) {
  const st = [];
  let best = 0;
  const n = heights.length;
  for (let i = 0; i <= n; i++) {
    const cur = i === n ? 0 : heights[i];
    while (st.length && heights[st[st.length - 1]] >= cur) {
      const h = heights[st.pop()];
      const left = st.length ? st[st.length - 1] + 1 : 0;
      best = Math.max(best, h * (i - left));
    }
    st.push(i);
  }
  return best;
}
`,
  },
});
