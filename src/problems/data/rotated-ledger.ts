import { defineProblem, t } from "../define";

const ascending = (n: number, start = 1, step = 3) => Array.from({ length: n }, (_, i) => start + i * step);
const rotate = (a: number[], by: number) => [...a.slice(by), ...a.slice(0, by)];

const big = ascending(200_000);

export default defineProblem({
  schemaVersion: 1,
  slug: "rotated-ledger",
  title: "Rotated Ledger",
  difficulty: "medium",
  patterns: ["binary-search"],
  statement: `A ledger lists balances in **strictly increasing** order. One night the ledger was cut at some position and its two halves were swapped, so the list now starts partway through the original order and wraps around. (The cut might have been at the very start, in which case nothing changed.)

All balances are different. Return the **smallest** balance in the rotated ledger.

Aim for a solution that does not look at every entry.`,
  constraints: [
    "1 <= ledger.length <= 200 000",
    "-1 000 000 000 <= ledger[i] <= 1 000 000 000",
    "All values are distinct",
  ],
  examples: [
    { input: "ledger = [6, 8, 9, 1, 3]", output: "1", explanation: "Originally [1, 3, 6, 8, 9]; the cut was after the 3." },
    { input: "ledger = [1, 2, 3]", output: "1", explanation: "The cut was at the very start." },
    { input: "ledger = [40, 10]", output: "10" },
  ],
  signature: {
    name: { python: "smallest_balance", javascript: "smallestBalance" },
    params: [{ name: "ledger", type: "int[]" }],
    returns: "int",
  },
  timeLimitMs: 1500,
  visibleTests: [
    t("basic", [[6, 8, 9, 1, 3]], 1),
    t("basic", [[1, 2, 3]], 1),
    t("basic", [[40, 10]], 10),
  ],
  hiddenTests: [
    t("basic", [[4, 5, 6, 7, 0, 1, 2]], 0),
    t("basic", [[11, 13, 15, 17]], 11),
    t("basic", [[3, 4, 5, 1, 2]], 1),
    t("edge", [[7]], 7),
    t("edge", [[2, 1]], 1),
    t("edge", [[-5, -4, -3, -9, -8]], -9),
    t("edge", [[5, 6, 7, 8, 9, 1]], 1),
    t("edge", [[9, 1, 2, 3, 4, 5, 6, 7, 8]], 1),
    t("large", [big], 1),
    t("large", [rotate(big, 77_000)], 1),
    t("large", [rotate(big, 199_999)], 1),
  ],
  hints: [
    "Scanning every entry works, but the list has a lot of structure. At least one half of any slice is still perfectly sorted.",
    "Compare the middle entry with the last entry. Which half must contain the smallest value?",
    "If ledger[mid] > ledger[right], the drop happens to the right of mid, so move left = mid + 1. Otherwise the minimum is at mid or to its left, so move right = mid.",
  ],
  editorial: `## Idea

Think of the list as two sorted runs glued together. The smallest value is the **start of the second run** (the point where the order "drops"). Binary search can find that drop.

## Walkthrough

Keep a range \`[left, right]\` known to contain the minimum.

- Look at \`mid\`. If \`ledger[mid] > ledger[right]\`, then the drop lies strictly after \`mid\`, so \`left = mid + 1\`.
- Otherwise \`ledger[mid] < ledger[right]\` (values are distinct), so the right part is sorted and the minimum is at \`mid\` or earlier: \`right = mid\`.

When \`left == right\`, that entry is the answer.

## Cost

The range halves every step: **O(log n) time, O(1) space**.
`,
  approachCheckpoint: {
    patternOptions: ["binary-search", "two-pointers", "sliding-window", "greedy", "arrays"],
    correctPattern: "binary-search",
    complexity: {
      time: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      space: ["O(1)", "O(log n)", "O(n)"],
      correctTime: "O(log n)",
      correctSpace: "O(1)",
    },
    explanation:
      "Comparing the middle with an end tells you which half holds the drop, so every step throws away half of the range. That is binary search: O(log n) steps and only a few variables (O(1) space).",
  },
  referenceSolution: {
    python: `def smallest_balance(ledger):
    left, right = 0, len(ledger) - 1
    while left < right:
        mid = (left + right) // 2
        if ledger[mid] > ledger[right]:
            left = mid + 1
        else:
            right = mid
    return ledger[left]
`,
    javascript: `function smallestBalance(ledger) {
  let left = 0, right = ledger.length - 1;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (ledger[mid] > ledger[right]) left = mid + 1;
    else right = mid;
  }
  return ledger[left];
}
`,
  },
});
