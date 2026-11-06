import { defineProblem, lcg, t } from "../define";

function ref(nums: number[]): number {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;
    let len = 1;
    while (set.has(n + len)) len++;
    best = Math.max(best, len);
  }
  return best;
}

const rand = lcg(33);
const noise: number[] = [];
for (let i = 0; i < 150_000; i++) noise.push(Math.floor(rand() * 2_000_000_000) - 1_000_000_000);
const chain: number[] = [];
for (let i = 0; i < 50_000; i++) chain.push(777_000 + i);
const mixed = [...noise, ...chain].sort(() => rand() - 0.5);
const sparse = noise.slice(0, 100_000);

export default defineProblem({
  schemaVersion: 1,
  slug: "consecutive-chain",
  title: "Consecutive Chain",
  difficulty: "medium",
  patterns: ["hashing"],
  statement: `You are given a jumbled list of whole numbers (repeats allowed).

A **chain** is a group of values that count up by exactly 1 each step, like \`7, 8, 9, 10\`. The chain's values do not need to sit next to each other in the list, and their order in the list does not matter.

Return the length of the **longest chain** you can build from the values in the list.`,
  constraints: ["1 <= nums.length <= 200 000", "-1 000 000 000 <= nums[i] <= 1 000 000 000"],
  examples: [
    { input: "nums = [100, 4, 200, 1, 3, 2]", output: "4", explanation: "1, 2, 3, 4." },
    { input: "nums = [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]", output: "9", explanation: "0 through 8, even though 0 appears twice." },
    { input: "nums = [9]", output: "1" },
  ],
  signature: { name: { python: "longest_chain", javascript: "longestChain" }, params: [{ name: "nums", type: "int[]" }], returns: "int" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [[100, 4, 200, 1, 3, 2]], 4), t("basic", [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], 9), t("basic", [[9]], 1)],
  hiddenTests: [
    t("basic", [[1, 2, 0, 1]], 3),
    t("basic", [[10, 5, 12, 3, 55, 30, 4, 11, 2]], 4),
    t("edge", [[-3, -2, -1, 0, 1]], 5),
    t("edge", [[5, 5, 5]], 1),
    t("edge", [[-1000000000, 1000000000]], 1),
    t("large", [noise.slice(0, 100)], ref(noise.slice(0, 100))),
    t("large", [mixed], ref(mixed)),
    t("large", [sparse], ref(sparse)),
    t("large", [chain.slice().reverse()], 50_000),
  ],
  hints: [
    "Sorting works, but there is a way to avoid it. What if membership checks were instant?",
    "Put every number in a set. A number only starts a chain if the number just below it is NOT in the set.",
    "For each chain start, count upward (n+1, n+2, ...) while the set contains the next number. Each value is counted once overall, so the total work stays linear.",
  ],
  editorial: `## Idea

Treat the numbers as a set. A chain is a run of consecutive values; its **start** is the only element whose predecessor (\`n - 1\`) is missing.

## Walkthrough

1. Build a set of all values.
2. For each value \`n\` in the set, skip it if \`n - 1\` is in the set (it is in the middle of some chain).
3. Otherwise \`n\` starts a chain: walk \`n, n+1, n+2, ...\` while the set contains the next value, and track the longest length.

## Cost

Every value is visited as a start at most once and walked over at most once: **O(n) time, O(n) space**. (Sorting first gives O(n log n), which also passes.)
`,
  approachCheckpoint: {
    patternOptions: ["hashing", "sliding-window", "two-pointers", "greedy", "dp"],
    correctPattern: "hashing",
    complexity: { time: ["O(n)", "O(n log n)", "O(n^2)", "O(n^3)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n)", correctSpace: "O(n)" },
    explanation: "A set answers 'is the next value present?' instantly. Starting walks only at chain starts means each value is touched a constant number of times, so the total is O(n) with O(n) space.",
  },
  referenceSolution: {
    python: `def longest_chain(nums):
    s = set(nums)
    best = 0
    for n in s:
        if n - 1 in s:
            continue
        length = 1
        while n + length in s:
            length += 1
        best = max(best, length)
    return best
`,
    javascript: `function longestChain(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;
    let len = 1;
    while (set.has(n + len)) len++;
    best = Math.max(best, len);
  }
  return best;
}
`,
  },
});
