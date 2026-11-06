import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(h: number[]): number {
  let l = 0, r = h.length - 1, lm = 0, rm = 0, total = 0;
  while (l < r) {
    if (h[l]! < h[r]!) {
      lm = Math.max(lm, h[l]!);
      total += lm - h[l]!;
      l++;
    } else {
      rm = Math.max(rm, h[r]!);
      total += rm - h[r]!;
      r--;
    }
  }
  return total;
}
const rand = lcg(31);
const big = Array.from({ length: 200_000 }, () => Math.floor(rand() * 1001));
const valley = Array.from({ length: 200_000 }, (_, i) => Math.abs(i - 100_000) / 100);
const vInts = valley.map((x) => Math.floor(x));
const spikes = Array.from({ length: 200_000 }, (_, i) => (i % 2 === 0 ? 1000 : 0));

export default defineProblem({
  schemaVersion: 1,
  slug: "rain-trap",
  title: "After the Storm",
  difficulty: "hard",
  patterns: ["two-pointers"],
  statement: `A row of stone pillars stands in a field; \`heights[i]\` is the height of pillar \`i\` and each pillar is one unit wide. After a storm, rain water collects in the gaps **between** pillars.

Water above a position is limited by the **tallest pillar to its left** and the **tallest pillar to its right**: it rises to the lower of those two and cannot rise above it. Water that would flow off either end is lost.

Return the total units of water held after the storm.`,
  constraints: ["1 <= heights.length <= 200 000", "0 <= heights[i] <= 1 000"],
  examples: [
    { input: "heights = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]", output: "6" },
    { input: "heights = [4, 2, 0, 3, 2, 5]", output: "9" },
    { input: "heights = [3]", output: "0" },
  ],
  signature: { name: { python: "water_held", javascript: "waterHeld" }, params: [{ name: "heights", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], 6), t("basic", [[4, 2, 0, 3, 2, 5]], 9), t("basic", [[3]], 0)],
  hiddenTests: [
    t("basic", [[3, 0, 2, 0, 4]], 7),
    t("basic", [[1, 2, 3, 4]], 0),
    t("edge", [[5, 0, 5]], 5),
    t("edge", [[0, 0, 0]], 0),
    t("edge", [[2, 0]], 0),
    t("large", [big], ref(big)),
    t("large", [vInts], ref(vInts)),
    t("large", [spikes], ref(spikes)),
  ],
  hints: [
    "For one position, the water above it is min(tallest left, tallest right) minus its own height (never below zero). How could you get those two maxima quickly for every position?",
    "You can precompute prefix and suffix maxima, giving O(n) time and O(n) space. A cleverer way uses O(1) space.",
    "Two pointers from the ends: always process the side with the lower pillar, because its water level is decided by its own side's running maximum.",
  ],
  editorial: `## Idea

Water above pillar \`i\` is \`min(maxLeft, maxRight) - h[i]\`. With two pointers, the side whose current pillar is **lower** has its level fixed by its own running maximum (the other side is at least as tall), so that side can be settled immediately.

## Walkthrough

Keep \`l\`, \`r\`, \`lm\`, \`rm\`. If \`h[l] < h[r]\`: update \`lm\`, add \`lm - h[l]\`, move \`l\`. Otherwise do the same for the right side.

## Cost

**O(n) time, O(1) space** (the prefix/suffix-array version is O(n) space).
`,
  approachCheckpoint: checkpoint({ pattern: "two-pointers", others: ["stack", "dp", "binary-search", "greedy"], time: "O(n)", space: "O(1)", why: "Processing the lower side first settles one pillar per step using only running maxima, so a single sweep with two pointers is linear and needs constant memory." }),
  referenceSolution: {
    python: `def water_held(heights):
    l, r = 0, len(heights) - 1
    lm = rm = total = 0
    while l < r:
        if heights[l] < heights[r]:
            lm = max(lm, heights[l])
            total += lm - heights[l]
            l += 1
        else:
            rm = max(rm, heights[r])
            total += rm - heights[r]
            r -= 1
    return total
`,
    javascript: `function waterHeld(heights) {
  let l = 0, r = heights.length - 1, lm = 0, rm = 0, total = 0;
  while (l < r) {
    if (heights[l] < heights[r]) {
      lm = Math.max(lm, heights[l]);
      total += lm - heights[l];
      l++;
    } else {
      rm = Math.max(rm, heights[r]);
      total += rm - heights[r];
      r--;
    }
  }
  return total;
}
`,
  },
});
