import { checkpoint, defineProblem, t } from "../define";

export default defineProblem({
  schemaVersion: 1,
  slug: "queens-count",
  title: "Peaceful Queens",
  difficulty: "hard",
  patterns: ["backtracking"],
  statement: `On an \`n x n\` chessboard you want to place \`n\` queens so that **no two queens attack each other**: no two share a row, a column, or a diagonal.

Return the **number of different arrangements** that work. Two arrangements are different if some queen stands on a different square (rotations and mirror images count separately).`,
  constraints: ["1 <= n <= 11"],
  examples: [
    { input: "n = 4", output: "2" },
    { input: "n = 1", output: "1" },
    { input: "n = 6", output: "4" },
  ],
  signature: { name: { python: "count_peaceful", javascript: "countPeaceful" }, params: [{ name: "n", type: "int" }], returns: "int" },
  timeLimitMs: 2000,
  pythonTimeFactor: 6,
  visibleTests: [t("basic", [4], 2), t("basic", [1], 1), t("basic", [6], 4)],
  hiddenTests: [
    t("basic", [5], 10),
    t("basic", [8], 92),
    t("edge", [2], 0),
    t("edge", [3], 0),
    t("edge", [7], 40),
    t("large", [10], 724),
    t("large", [11], 2680),
  ],
  hints: [
    "Place queens one row at a time. Each row needs exactly one queen, so you only decide which column.",
    "After placing queens in the first r rows, a column is allowed only if no earlier queen shares its column or a diagonal.",
    "Track used columns and both diagonal directions (row + col and row - col) in sets or bitmasks, and backtrack: place, recurse into the next row, then undo.",
  ],
  editorial: `## Idea

**Backtracking**: build a solution row by row and abandon (prune) a partial placement as soon as it conflicts. Conflicts are checked in O(1) with three lookups: column, "/" diagonal (\`row + col\`) and "\\\\" diagonal (\`row - col\`).

## Cost

Exponential in the worst case, but pruning keeps n = 11 fast (a few hundred thousand nodes). Trying all n^n placements, or all n! permutations without pruning, is far too slow.
`,
  approachCheckpoint: checkpoint({ pattern: "backtracking", others: ["dp", "greedy", "graphs", "two-pointers"], time: "O(2^n)", space: "O(n)", why: "The search tree is exponential in n (pruning makes it much smaller in practice), and the recursion plus conflict sets only need O(n) memory." }),
  referenceSolution: {
    python: `def count_peaceful(n):
    cols, d1, d2 = set(), set(), set()

    def place(r):
        if r == n:
            return 1
        total = 0
        for c in range(n):
            if c in cols or (r + c) in d1 or (r - c) in d2:
                continue
            cols.add(c); d1.add(r + c); d2.add(r - c)
            total += place(r + 1)
            cols.remove(c); d1.remove(r + c); d2.remove(r - c)
        return total

    return place(0)
`,
    javascript: `function countPeaceful(n) {
  const cols = new Set(), d1 = new Set(), d2 = new Set();
  function place(r) {
    if (r === n) return 1;
    let total = 0;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r + c) || d2.has(r - c)) continue;
      cols.add(c); d1.add(r + c); d2.add(r - c);
      total += place(r + 1);
      cols.delete(c); d1.delete(r + c); d2.delete(r - c);
    }
    return total;
  }
  return place(0);
}
`,
  },
});
