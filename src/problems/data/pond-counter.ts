import { defineProblem, lcg, t } from "../define";

function ref(grid: string[]): number {
  const h = grid.length;
  const w = grid[0]!.length;
  const seen = Array.from({ length: h }, () => new Uint8Array(w));
  let count = 0;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r]![c] !== "1" || seen[r]![c]) continue;
      count++;
      const stack: [number, number][] = [[r, c]];
      seen[r]![c] = 1;
      while (stack.length) {
        const [y, x] = stack.pop()!;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny]![nx] === "1" && !seen[ny]![nx]) {
            seen[ny]![nx] = 1;
            stack.push([ny, nx]);
          }
        }
      }
    }
  }
  return count;
}

const rand = lcg(404);
const makeGrid = (h: number, w: number, p: number) => Array.from({ length: h }, () => Array.from({ length: w }, () => (rand() < p ? "1" : "0")).join(""));
const randomBig = makeGrid(400, 400, 0.45);
const sparseBig = makeGrid(500, 500, 0.2);
const allWater = Array.from({ length: 500 }, () => "1".repeat(500));
const snake = Array.from({ length: 300 }, (_, r) => (r % 2 === 0 ? "1".repeat(300) : r % 4 === 1 ? "0".repeat(299) + "1" : "1" + "0".repeat(299)));

export default defineProblem({
  schemaVersion: 1,
  slug: "pond-counter",
  title: "Pond Counter",
  difficulty: "medium",
  patterns: ["graphs"],
  statement: `A satellite photo of a field is given as rows of text. A \`"1"\` is a patch of water and a \`"0"\` is dry land.

Water patches that touch **up, down, left or right** belong to the same pond (diagonal contact does not count). 

Return how many separate ponds there are. Photos can be big and ponds can snake across the whole map, so be careful with very deep recursion.`,
  constraints: ["1 <= grid.length <= 500", "All rows have the same length, 1 to 500", "Each character is \"0\" or \"1\""],
  examples: [
    { input: 'grid = ["110", "010", "001"]', output: "2", explanation: "The top-left three patches form one pond; the bottom-right patch touches them only diagonally." },
    { input: 'grid = ["000", "000"]', output: "0" },
    { input: 'grid = ["101", "010", "101"]', output: "5", explanation: "Every water patch is isolated from the others." },
  ],
  signature: { name: { python: "count_ponds", javascript: "countPonds" }, params: [{ name: "grid", type: "string[]" }], returns: "int" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [["110", "010", "001"]], 2), t("basic", [["000", "000"]], 0), t("basic", [["101", "010", "101"]], 5)],
  hiddenTests: [
    t("basic", [["11000", "11000", "00100", "00011"]], 3),
    t("basic", [["1111", "1001", "1111"]], 1),
    t("edge", [["1"]], 1),
    t("edge", [["0"]], 0),
    t("edge", [["1", "0", "1"]], 2),
    t("edge", [["10101"]], 3),
    t("large", [randomBig], ref(randomBig)),
    t("large", [sparseBig], ref(sparseBig)),
    t("large", [allWater], 1),
    t("large", [snake], ref(snake)),
  ],
  hints: [
    "Scan the grid cell by cell. When you find water you have not visited, you have found a new pond. What should you do with the rest of that pond?",
    "Explore the whole pond from that cell (flood fill) and mark every cell as visited so it is never counted again.",
    "Use an explicit stack or queue for the flood fill instead of recursion: a snake-shaped pond can have hundreds of thousands of cells in a row.",
  ],
  editorial: `## Idea

Each pond is a **connected component** of water cells in a grid graph (cells are nodes, side-by-side neighbours are edges). Counting ponds is counting components.

## Walkthrough

1. Keep a \`visited\` grid.
2. For every cell: if it is water and unvisited, increment the count and flood-fill from it, visiting all 4-neighbour water cells.
3. Flood fill with a stack or queue so a huge pond cannot overflow the call stack.

## Cost

Each cell is visited a constant number of times: **O(rows * cols) time and space**.
`,
  approachCheckpoint: {
    patternOptions: ["graphs", "dp", "trees", "greedy", "two-pointers"],
    correctPattern: "graphs",
    complexity: { time: ["O(rows + cols)", "O(rows * cols)", "O((rows * cols)^2)", "O(2^(rows * cols))"], space: ["O(1)", "O(rows + cols)", "O(rows * cols)", "O((rows * cols)^2)"], correctTime: "O(rows * cols)", correctSpace: "O(rows * cols)" },
    explanation: "A grid is an implicit graph and a pond is a connected component. Flood fill touches each cell a constant number of times, and the visited marks plus the stack can reach O(rows * cols).",
  },
  referenceSolution: {
    python: `def count_ponds(grid):
    h, w = len(grid), len(grid[0])
    seen = [[False] * w for _ in range(h)]
    count = 0
    for r in range(h):
        for c in range(w):
            if grid[r][c] != '1' or seen[r][c]:
                continue
            count += 1
            seen[r][c] = True
            stack = [(r, c)]
            while stack:
                y, x = stack.pop()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and grid[ny][nx] == '1' and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((ny, nx))
    return count
`,
    javascript: `function countPonds(grid) {
  const h = grid.length, w = grid[0].length;
  const seen = Array.from({ length: h }, () => new Uint8Array(w));
  let count = 0;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c] !== '1' || seen[r][c]) continue;
      count++;
      seen[r][c] = 1;
      const stack = [[r, c]];
      while (stack.length) {
        const [y, x] = stack.pop();
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx] === '1' && !seen[ny][nx]) {
            seen[ny][nx] = 1;
            stack.push([ny, nx]);
          }
        }
      }
    }
  }
  return count;
}
`,
    java: `class Solution {
    public static int countPonds(String[] grid) {
        int h = grid.length, w = grid[0].length();
        boolean[] seen = new boolean[h * w];
        int[] stack = new int[h * w];
        int count = 0;
        int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };
        for (int r = 0; r < h; r++) {
            for (int c = 0; c < w; c++) {
                if (grid[r].charAt(c) != '1' || seen[r * w + c]) continue;
                count++;
                int sp = 0;
                stack[sp++] = r * w + c;
                seen[r * w + c] = true;
                while (sp > 0) {
                    int cur = stack[--sp];
                    int y = cur / w, x = cur % w;
                    for (int d = 0; d < 4; d++) {
                        int ny = y + dr[d], nx = x + dc[d];
                        if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny].charAt(nx) == '1' && !seen[ny * w + nx]) {
                            seen[ny * w + nx] = true;
                            stack[sp++] = ny * w + nx;
                        }
                    }
                }
            }
        }
        return count;
    }
}
`,
    c: `int count_ponds(const char **grid, int gridLen) {
    int h = gridLen, w = (int)strlen(grid[0]);
    char *seen = calloc((size_t)h * w, 1);
    int *stack = malloc(sizeof(int) * (size_t)h * w);
    int count = 0;
    int dr[4] = { 1, -1, 0, 0 }, dc[4] = { 0, 0, 1, -1 };
    for (int r = 0; r < h; r++) {
        for (int c = 0; c < w; c++) {
            if (grid[r][c] != '1' || seen[r * w + c]) continue;
            count++;
            int sp = 0;
            stack[sp++] = r * w + c;
            seen[r * w + c] = 1;
            while (sp > 0) {
                int cur = stack[--sp];
                int y = cur / w, x = cur % w;
                for (int d = 0; d < 4; d++) {
                    int ny = y + dr[d], nx = x + dc[d];
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx] == '1' && !seen[ny * w + nx]) {
                        seen[ny * w + nx] = 1;
                        stack[sp++] = ny * w + nx;
                    }
                }
            }
        }
    }
    free(seen);
    free(stack);
    return count;
}
`,
    go: `package main

func countPonds(grid []string) int {
	h, w := len(grid), len(grid[0])
	seen := make([]bool, h*w)
	stack := make([]int, 0, 1024)
	count := 0
	dr := [4]int{1, -1, 0, 0}
	dc := [4]int{0, 0, 1, -1}
	for r := 0; r < h; r++ {
		for c := 0; c < w; c++ {
			if grid[r][c] != '1' || seen[r*w+c] {
				continue
			}
			count++
			stack = append(stack[:0], r*w+c)
			seen[r*w+c] = true
			for len(stack) > 0 {
				cur := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				y, x := cur/w, cur%w
				for d := 0; d < 4; d++ {
					ny, nx := y+dr[d], x+dc[d]
					if ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx] == '1' && !seen[ny*w+nx] {
						seen[ny*w+nx] = true
						stack = append(stack, ny*w+nx)
					}
				}
			}
		}
	}
	return count
}
`,
  },
});
