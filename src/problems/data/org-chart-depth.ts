import { defineProblem, lcg, t } from "../define";

function ref(managers: number[]): number {
  const n = managers.length;
  const children: number[][] = Array.from({ length: n }, () => []);
  let root = -1;
  managers.forEach((m, i) => (m === -1 ? (root = i) : children[m]!.push(i)));
  let depth = 0;
  let level = [root];
  while (level.length) {
    depth++;
    const next: number[] = [];
    for (const u of level) next.push(...children[u]!);
    level = next;
  }
  return depth;
}

const chain = Array.from({ length: 50_000 }, (_, i) => i - 1); // 0 is root, i's manager is i-1
const rand = lcg(77);
const randomTree = Array.from({ length: 100_000 }, (_, i) => (i === 0 ? -1 : Math.floor(rand() * i)));
const reversedChain = Array.from({ length: 30_000 }, (_, i) => (i === 29_999 ? -1 : i + 1)); // root is the LAST index
const star = Array.from({ length: 100_000 }, (_, i) => (i === 0 ? -1 : 0));

export default defineProblem({
  schemaVersion: 1,
  slug: "org-chart-depth",
  title: "Org Chart Depth",
  difficulty: "medium",
  patterns: ["trees"],
  statement: `A company's reporting structure is stored as a list: \`managers[i]\` is the index of employee \`i\`'s direct manager, or \`-1\` for the one employee (the CEO) who reports to nobody.

The chart has **levels**: the CEO alone is level 1, the CEO's direct reports are level 2, their reports are level 3, and so on.

Return the **number of levels** in the chart. Note that a manager's index can be larger than their report's index, and the chart can be very deep, so think about whether deep recursion is safe.`,
  constraints: ["1 <= managers.length <= 100 000", "Exactly one entry is -1; every other entry is a valid employee index", "The chart has no cycles"],
  examples: [
    { input: "managers = [-1, 0, 0, 1, 1, 3]", output: "4", explanation: "0 -> 1 -> 3 -> 5 is the longest chain of command: four people." },
    { input: "managers = [2, 2, -1, 0]", output: "3", explanation: "2 is the CEO; 0 and 1 report to 2; 3 reports to 0." },
    { input: "managers = [-1]", output: "1" },
  ],
  signature: { name: { python: "org_levels", javascript: "orgLevels" }, params: [{ name: "managers", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[-1, 0, 0, 1, 1, 3]], 4), t("basic", [[2, 2, -1, 0]], 3), t("basic", [[-1]], 1)],
  hiddenTests: [
    t("basic", [[-1, 0, 1, 2, 3]], 5),
    t("basic", [[1, -1, 1, 2, 2]], 3),
    t("edge", [[-1, 0]], 2),
    t("edge", [[1, -1]], 2),
    t("edge", [[3, 3, 3, -1]], 2),
    t("large", [chain], 50_000),
    t("large", [randomTree], ref(randomTree)),
    t("large", [reversedChain], 30_000),
    t("large", [star], 2),
  ],
  hints: [
    "The list says who each person's manager is, but you need the opposite direction to walk down the chart. Build it.",
    "Make a list of direct reports for every employee, then start from the CEO and go level by level.",
    "A breadth-first walk (a queue, one level at a time) counts the levels and never recurses, so very deep charts are safe.",
  ],
  editorial: `## Idea

Parent pointers are awkward to traverse downward. Convert them into **children lists**, then do a **level-order (BFS) traversal** from the root and count how many levels you visit.

## Walkthrough

1. Scan \`managers\`. If \`managers[i] == -1\`, \`i\` is the root; otherwise append \`i\` to \`children[managers[i]]\`.
2. Start with a level containing just the root. While the level is non-empty, increment the depth and replace the level with all children of its members.

## Why not recursion?

A chart that is a single chain of 50 000 people would need 50 000 nested calls, overflowing the stack in most languages. BFS uses a loop instead.

## Cost

Each employee is handled once: **O(n) time, O(n) space**.
`,
  approachCheckpoint: {
    patternOptions: ["trees", "graphs", "dp", "stack", "hashing"],
    correctPattern: "trees",
    complexity: { time: ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n)", correctSpace: "O(n)" },
    explanation: "This is a rooted tree given as parent pointers. Building child lists and walking it once level by level visits each node a single time (O(n)); the child lists and queue need O(n) memory.",
  },
  referenceSolution: {
    python: `def org_levels(managers):
    n = len(managers)
    children = [[] for _ in range(n)]
    root = -1
    for i, m in enumerate(managers):
        if m == -1:
            root = i
        else:
            children[m].append(i)
    depth = 0
    level = [root]
    while level:
        depth += 1
        nxt = []
        for u in level:
            nxt.extend(children[u])
        level = nxt
    return depth
`,
    javascript: `function orgLevels(managers) {
  const n = managers.length;
  const children = Array.from({ length: n }, () => []);
  let root = -1;
  for (let i = 0; i < n; i++) {
    if (managers[i] === -1) root = i;
    else children[managers[i]].push(i);
  }
  let depth = 0;
  let level = [root];
  while (level.length) {
    depth++;
    const next = [];
    for (const u of level) for (const c of children[u]) next.push(c);
    level = next;
  }
  return depth;
}
`,
  },
});
