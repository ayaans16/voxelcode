import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(j: number[]): boolean {
  let far = 0;
  for (let i = 0; i < j.length; i++) { if (i > far) return false; far = Math.max(far, i + j[i]!); }
  return true;
}
const rand = lcg(14);
const big = Array.from({ length: 300_000 }, () => Math.floor(rand() * 3));
const ok = Array.from({ length: 300_000 }, (_, i) => (i === 299_999 ? 0 : 1));
const stuck = [...ok.slice(0, 150_000), 0, ...ok.slice(150_001)];

export default defineProblem({
  schemaVersion: 1,
  slug: "can-reach-end",
  title: "Stepping Stones",
  difficulty: "medium",
  patterns: ["greedy"],
  statement: `A row of stepping stones crosses a river. You start on the **first** stone. Standing on stone \`i\`, you may jump forward **any distance from 0 up to \`jumps[i]\`** stones.

Return \`true\` if you can reach the **last** stone, or \`false\` if you will get stuck on the way.`,
  constraints: ["1 <= jumps.length <= 300 000", "0 <= jumps[i] <= 100 000"],
  examples: [
    { input: "jumps = [2, 3, 1, 1, 4]", output: "true", explanation: "Jump 1 to the second stone, then 3 to the end." },
    { input: "jumps = [3, 2, 1, 0, 4]", output: "false", explanation: "Every route ends on the stone with 0." },
    { input: "jumps = [0]", output: "true", explanation: "You are already on the last stone." },
  ],
  signature: { name: { python: "can_cross", javascript: "canCross" }, params: [{ name: "jumps", type: "int[]" }], returns: "bool" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[2, 3, 1, 1, 4]], true), t("basic", [[3, 2, 1, 0, 4]], false), t("basic", [[0]], true)],
  hiddenTests: [
    t("basic", [[1, 1, 1, 1]], true),
    t("basic", [[2, 0, 0]], true),
    t("basic", [[1, 0, 1]], false),
    t("edge", [[0, 1]], false),
    t("edge", [[5]], true),
    t("edge", [[1, 2, 0, 0, 1]], false),
    t("large", [big], ref(big)),
    t("large", [ok], true),
    t("large", [stuck], false),
  ],
  hints: [
    "Trying every possible jump from every stone could explode. Think about the furthest stone you can possibly reach.",
    "Track `far`, the furthest index reachable so far. If you ever stand on an index greater than `far`, you are stuck.",
    "Sweep left to right: update far = max(far, i + jumps[i]) for each reachable stone i. If the sweep finishes, the end is reachable.",
  ],
  editorial: `## Idea

You never need to know *how* you get to a stone, only the **furthest reachable index**. If the current index is beyond it, you are stuck.

## Cost

**O(n) time, O(1) space.**
`,
  approachCheckpoint: checkpoint({ pattern: "greedy", others: ["dp", "graphs", "two-pointers", "binary-search"], time: "O(n)", space: "O(1)", why: "A running maximum reach decides each stone in constant time, so one pass with one variable is enough." }),
  referenceSolution: {
    python: `def can_cross(jumps):
    far = 0
    for i, j in enumerate(jumps):
        if i > far:
            return False
        far = max(far, i + j)
    return True
`,
    javascript: `function canCross(jumps) {
  let far = 0;
  for (let i = 0; i < jumps.length; i++) {
    if (i > far) return false;
    far = Math.max(far, i + jumps[i]);
  }
  return true;
}
`,
  },
});
