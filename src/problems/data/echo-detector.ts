import { defineProblem, lcg, t } from "../define";

function ref(ids: number[]): number {
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return -1;
}

const rand = lcg(21);
const distinct: number[] = [];
for (let i = 0; i < 300_000; i++) distinct.push(i * 3 + 1 + Math.floor(rand() * 3));
const lateEcho = [...distinct, distinct[1234]!];
const earlyEcho = [...distinct.slice(0, 10), distinct[2]!, ...distinct.slice(10)];

export default defineProblem({
  schemaVersion: 1,
  slug: "echo-detector",
  title: "Echo Detector",
  difficulty: "easy",
  patterns: ["hashing"],
  statement: `A radio station logs the ID of every caller, in the order they phoned in.

An **echo** happens when an ID shows up that has already been logged before. Find the ID whose **echo arrives first** (the earliest position where a repeated ID appears).

Return that ID, or \`-1\` if every caller was different.`,
  constraints: ["1 <= ids.length <= 300 000", "1 <= ids[i] <= 1 000 000 000"],
  examples: [
    { input: "ids = [4, 7, 1, 7, 4]", output: "7", explanation: "The second 7 (position 3) arrives before the second 4 (position 4)." },
    { input: "ids = [1, 2, 3]", output: "-1" },
    { input: "ids = [5, 5]", output: "5" },
  ],
  signature: { name: { python: "first_echo", javascript: "firstEcho" }, params: [{ name: "ids", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[4, 7, 1, 7, 4]], 7), t("basic", [[1, 2, 3]], -1), t("basic", [[5, 5]], 5)],
  hiddenTests: [
    t("basic", [[9, 8, 7, 8, 9, 7]], 8),
    t("basic", [[2, 1, 2, 1]], 2),
    t("edge", [[1]], -1),
    t("edge", [[6, 6, 6, 6]], 6),
    t("edge", [[1, 2, 3, 4, 5, 1]], 1),
    t("large", [distinct], -1),
    t("large", [lateEcho], ref(lateEcho)),
    t("large", [earlyEcho], ref(earlyEcho)),
  ],
  hints: [
    "Comparing every ID with every earlier ID is far too slow for 300 000 calls. What could you remember as you scan?",
    "Keep a collection of IDs you have already logged. Checking whether an ID is in it should be nearly instant.",
    "Walk the list once. If the current ID is already in your collection, that is the first echo; otherwise add it.",
  ],
  editorial: `## Idea

You need a fast answer to "have I seen this before?". A **hash set** gives you that in constant time on average.

## Walkthrough

Scan left to right with an empty set. For each ID: if it is already in the set, return it immediately (it is the earliest echo, because you are scanning in order). Otherwise insert it. If the scan ends, return \`-1\`.

## Cost

One pass: **O(n) time**, and the set can grow to n entries: **O(n) space**. The pair-by-pair approach is O(n^2).
`,
  approachCheckpoint: {
    patternOptions: ["hashing", "two-pointers", "binary-search", "dp", "stack"],
    correctPattern: "hashing",
    complexity: { time: ["O(1)", "O(n)", "O(n log n)", "O(n^2)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n)", correctSpace: "O(n)" },
    explanation: "Remembering what you have seen is exactly what a hash set is for: each lookup and insert is O(1) on average, so one pass is O(n), at the price of O(n) memory.",
  },
  referenceSolution: {
    python: `def first_echo(ids):
    seen = set()
    for x in ids:
        if x in seen:
            return x
        seen.add(x)
    return -1
`,
    javascript: `function firstEcho(ids) {
  const seen = new Set();
  for (const x of ids) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return -1;
}
`,
  },
});
