import { checkpoint, defineProblem, t } from "../define";

const R = 1000, C = 1000;
const grid = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => (r * C + c) * 3));
const tall = Array.from({ length: 100_000 }, (_, i) => [i * 2]);

export default defineProblem({
  schemaVersion: 1,
  slug: "sorted-grid-find",
  title: "Find in the Grid",
  difficulty: "medium",
  patterns: ["binary-search"],
  statement: `A warehouse shelf grid stores part numbers. Every **row** is sorted from small to large, and the **first number of each row is larger than the last number of the row above it**. So reading the grid row by row gives one long increasing list.

Return \`true\` if \`target\` is in the grid, otherwise \`false\`. A solution that does not scan every cell is expected.`,
  constraints: ["1 <= grid.length <= 100 000", "1 <= grid[i].length <= 1 000, all rows the same length", "-1 000 000 000 <= grid[i][j], target <= 1 000 000 000"],
  examples: [
    { input: "grid = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3", output: "true" },
    { input: "grid = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13", output: "false" },
    { input: "grid = [[5]], target = 5", output: "true" },
  ],
  signature: { name: { python: "grid_contains", javascript: "gridContains" }, params: [{ name: "grid", type: "int[][]" }, { name: "target", type: "int" }], returns: "bool" },
  timeLimitMs: 1500,
  visibleTests: [
    t("basic", [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], true),
    t("basic", [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], false),
    t("basic", [[[5]], 5], true),
  ],
  hiddenTests: [
    t("basic", [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 60], true),
    t("basic", [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 0], false),
    t("edge", [[[1], [3], [5]], 3], true),
    t("edge", [[[1, 2, 3]], 4], false),
    t("edge", [[[-5, -3]], -5], true),
    t("large", [grid, 2_997_000 - 3], true),
    t("large", [grid, 1], false),
    t("large", [tall, 99_998 * 2], true),
  ],
  hints: [
    "The rows are sorted and chained together, so the whole grid is secretly one sorted list.",
    "Pretend the grid is flattened: cell number k lives at row k / width and column k % width.",
    "Binary search over k from 0 to rows*cols - 1, converting each midpoint to a row and column to read its value.",
  ],
  editorial: `## Idea

Because each row continues where the previous one ended, the grid is a single sorted array in disguise. Binary search the **virtual** index \`k\`, mapping it to \`(k / cols, k % cols)\` without building the flat list.

## Cost

**O(log(rows * cols)) time, O(1) space.**
`,
  approachCheckpoint: checkpoint({ pattern: "binary-search", others: ["two-pointers", "dp", "hashing", "arrays"], time: "O(log n)", space: "O(1)", why: "The grid behaves like one sorted list of rows*cols values, so halving the virtual index range each step takes logarithmic time with no extra memory." }),
  referenceSolution: {
    python: `def grid_contains(grid, target):
    rows, cols = len(grid), len(grid[0])
    lo, hi = 0, rows * cols - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        v = grid[mid // cols][mid % cols]
        if v == target:
            return True
        if v < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
`,
    javascript: `function gridContains(grid, target) {
  const rows = grid.length, cols = grid[0].length;
  let lo = 0, hi = rows * cols - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = grid[Math.floor(mid / cols)][mid % cols];
    if (v === target) return true;
    if (v < target) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}
`,
  },
});
