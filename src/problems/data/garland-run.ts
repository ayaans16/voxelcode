import { defineProblem, lcg, t } from "../define";

function ref(s: string, k: number): number {
  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right]!;
    counts.set(c, (counts.get(c) ?? 0) + 1);
    while (counts.size > k) {
      const l = s[left]!;
      const n = counts.get(l)! - 1;
      if (n === 0) counts.delete(l);
      else counts.set(l, n);
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}

const rand = lcg(5);
const letters = "abcdefghijklmnopqrstuvwxyz";
let big = "";
for (let i = 0; i < 120_000; i++) big += letters[Math.floor(rand() * 8)];
let bigMany = "";
for (let i = 0; i < 120_000; i++) bigMany += letters[Math.floor(rand() * 26)];

export default defineProblem({
  schemaVersion: 1,
  slug: "garland-run",
  title: "Garland Run",
  difficulty: "medium",
  patterns: ["sliding-window"],
  statement: `A garland is a string of bulbs. Each bulb is one lowercase letter standing for its colour.

You may cut out **one continuous stretch** of the garland, but your display box can only show **at most \`k\` different colours**.

Return the length of the longest stretch you can cut out.`,
  constraints: [
    "1 <= lights.length <= 120 000",
    "lights contains only lowercase letters a-z",
    "1 <= k <= 26",
  ],
  examples: [
    {
      input: 'lights = "aabacbebebe", k = 3',
      output: "7",
      explanation: 'The stretch "cbebebe" uses only c, b and e.',
    },
    { input: 'lights = "abc", k = 2', output: "2", explanation: 'Either "ab" or "bc".' },
    { input: 'lights = "zzzz", k = 1', output: "4" },
  ],
  signature: {
    name: { python: "longest_run", javascript: "longestRun" },
    params: [
      { name: "lights", type: "string" },
      { name: "k", type: "int" },
    ],
    returns: "int",
  },
  timeLimitMs: 1500,
  visibleTests: [
    t("basic", ["aabacbebebe", 3], 7),
    t("basic", ["abc", 2], 2),
    t("basic", ["zzzz", 1], 4),
  ],
  hiddenTests: [
    t("basic", ["abaccc", 2], 4),
    t("basic", ["eceba", 2], 3),
    t("basic", ["aaabbbccc", 2], 6),
    t("edge", ["a", 1], 1),
    t("edge", ["abcdef", 26], 6),
    t("edge", ["abcdef", 1], 1),
    t("edge", ["aabbcc", 2], 4),
    t("large", [big, 3], ref(big, 3)),
    t("large", [big, 8], ref(big, 8)),
    t("large", [bigMany, 5], ref(bigMany, 5)),
    t("large", ["a".repeat(120_000), 1], 120_000),
  ],
  hints: [
    "Checking every possible stretch is too slow for 120 000 bulbs. Think about reusing work when you extend a stretch by one bulb.",
    "Keep a window [left, right] and a tally of colours inside it. Grow the window on the right every step.",
    "When the window holds more than k colours, shrink it from the left until it is legal again, updating the tally as bulbs leave. Track the largest legal size you ever saw.",
  ],
  editorial: `## Idea

A legal stretch stays legal if you shorten it. That means once the window becomes illegal, you only ever need to move its **left edge forward**; you never have to restart. This is a classic *sliding window*.

## Walkthrough

1. Maintain a map from colour to how many times it appears in the window.
2. For each \`right\`, add \`lights[right]\` to the map.
3. While the map has more than \`k\` colours, remove \`lights[left]\` (delete the colour when its count hits 0) and advance \`left\`.
4. The window is now legal: update the answer with \`right - left + 1\`.

## Cost

\`left\` and \`right\` each move at most n times, so it is **O(n) time**. The map holds at most k+1 colours, so **O(k) space** (at most 27 here, so effectively constant).
`,
  approachCheckpoint: {
    patternOptions: ["sliding-window", "two-pointers", "dp", "hashing", "greedy"],
    correctPattern: "sliding-window",
    complexity: {
      time: ["O(n)", "O(n log n)", "O(n * k)", "O(n^2)"],
      space: ["O(1)", "O(k)", "O(n)", "O(n^2)"],
      correctTime: "O(n)",
      correctSpace: "O(k)",
    },
    explanation:
      "You want the longest contiguous stretch satisfying a property that survives shrinking, so a window whose edges only move forward fits. Both edges advance at most n times (O(n)), and the colour tally needs at most k+1 entries (O(k)).",
  },
  referenceSolution: {
    python: `def longest_run(lights, k):
    counts = {}
    left = 0
    best = 0
    for right, c in enumerate(lights):
        counts[c] = counts.get(c, 0) + 1
        while len(counts) > k:
            l = lights[left]
            counts[l] -= 1
            if counts[l] == 0:
                del counts[l]
            left += 1
        best = max(best, right - left + 1)
    return best
`,
    javascript: `function longestRun(lights, k) {
  const counts = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < lights.length; right++) {
    const c = lights[right];
    counts.set(c, (counts.get(c) || 0) + 1);
    while (counts.size > k) {
      const l = lights[left];
      const n = counts.get(l) - 1;
      if (n === 0) counts.delete(l); else counts.set(l, n);
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
  },
});
