import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(parents: number[]): number {
  const n = parents.length;
  const b1 = new Int32Array(n), b2 = new Int32Array(n);
  let best = 0;
  for (let i = n - 1; i >= 1; i--) {
    best = Math.max(best, b1[i]! + b2[i]!);
    const up = b1[i]! + 1, p = parents[i]!;
    if (up > b1[p]!) { b2[p] = b1[p]!; b1[p] = up; } else if (up > b2[p]!) b2[p] = up;
  }
  return Math.max(best, b1[0]! + b2[0]!);
}
const rand = lcg(15);
const chain = Array.from({ length: 200_000 }, (_, i) => i - 1);
const star = Array.from({ length: 200_000 }, (_, i) => (i === 0 ? -1 : 0));
const randomTree = Array.from({ length: 200_000 }, (_, i) => (i === 0 ? -1 : Math.floor(rand() * i)));
const caterpillar = Array.from({ length: 100_000 }, (_, i) => (i === 0 ? -1 : i % 2 === 1 ? Math.max(0, i - 2) : i - 1));

export default defineProblem({
  schemaVersion: 1,
  slug: "tree-diameter",
  title: "Longest Trail",
  difficulty: "medium",
  patterns: ["trees"],
  statement: `A forest ranger maps a trail network that forms a **tree**: junction \`0\` is the entrance, and every other junction \`i\` has exactly one trail to a junction \`parents[i]\` closer to the entrance. It is guaranteed that \`parents[i] < i\` for every \`i > 0\`, and \`parents[0] = -1\`.

A **walk** follows trails without visiting any junction twice, and its length is the number of trails it uses. Return the length of the **longest possible walk** between any two junctions.`,
  constraints: ["1 <= parents.length <= 200 000", "parents[0] = -1 and 0 <= parents[i] < i for i > 0"],
  examples: [
    { input: "parents = [-1, 0, 0, 1, 1]", output: "3", explanation: "From junction 3 up to 1, then 0, then down to 2: three trails." },
    { input: "parents = [-1]", output: "0" },
    { input: "parents = [-1, 0, 1, 2]", output: "3", explanation: "A straight line of four junctions." },
  ],
  signature: { name: { python: "longest_trail", javascript: "longestTrail" }, params: [{ name: "parents", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[-1, 0, 0, 1, 1]], 3), t("basic", [[-1]], 0), t("basic", [[-1, 0, 1, 2]], 3)],
  hiddenTests: [
    t("basic", [[-1, 0, 0, 0]], 2),
    t("basic", [[-1, 0, 0, 1, 2, 3, 4]], 6),
    t("edge", [[-1, 0]], 1),
    t("edge", [[-1, 0, 0]], 2),
    t("edge", [[-1, 0, 1, 1, 3, 3]], 3),
    t("large", [chain], 199_999),
    t("large", [star], 2),
    t("large", [randomTree], ref(randomTree)),
    t("large", [caterpillar], ref(caterpillar)),
  ],
  hints: [
    "The longest walk has a highest junction, where it turns around. What do you need to know about each junction's subtrees?",
    "For every junction, the best walk that turns there is its deepest branch plus its second-deepest branch.",
    "Because parents[i] < i, you can process junctions from the last to the first (children before parents) with no recursion, tracking each junction's top two branch depths.",
  ],
  editorial: `## Idea

The longest walk turns at some junction, going down its **two deepest branches**. For every junction keep the best and second-best branch depth; the answer is the maximum of their sum.

## Walkthrough

Iterate \`i\` from \`n - 1\` down to 1. Junction \`i\` is complete (all its children have already been processed because children have larger indices): candidate \`best1[i] + best2[i]\`, then offer \`best1[i] + 1\` to its parent's two slots.

## Cost

**O(n) time, O(n) space**, and no recursion, so very deep trails are safe.
`,
  approachCheckpoint: checkpoint({ pattern: "trees", others: ["graphs", "dp", "stack", "hashing"], time: "O(n)", space: "O(n)", why: "Each junction is handled once, combining its two deepest child branches; per-junction best depths take O(n) memory." }),
  referenceSolution: {
    python: `def longest_trail(parents):
    n = len(parents)
    b1 = [0] * n
    b2 = [0] * n
    best = 0
    for i in range(n - 1, 0, -1):
        best = max(best, b1[i] + b2[i])
        up = b1[i] + 1
        p = parents[i]
        if up > b1[p]:
            b2[p] = b1[p]
            b1[p] = up
        elif up > b2[p]:
            b2[p] = up
    return max(best, b1[0] + b2[0])
`,
    javascript: `function longestTrail(parents) {
  const n = parents.length;
  const b1 = new Array(n).fill(0), b2 = new Array(n).fill(0);
  let best = 0;
  for (let i = n - 1; i >= 1; i--) {
    best = Math.max(best, b1[i] + b2[i]);
    const up = b1[i] + 1, p = parents[i];
    if (up > b1[p]) { b2[p] = b1[p]; b1[p] = up; }
    else if (up > b2[p]) b2[p] = up;
  }
  return Math.max(best, b1[0] + b2[0]);
}
`,
  },
});
