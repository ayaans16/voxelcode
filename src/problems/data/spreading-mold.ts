import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(grid: string[]): number {
  const h = grid.length, w = grid[0]!.length;
  const cell = grid.map((r) => Array.from(r));
  const q: [number, number][] = [];
  let fresh = 0;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { if (cell[r]![c] === "2") q.push([r, c]); else if (cell[r]![c] === "1") fresh++; }
  let minutes = 0;
  for (let head = 0; head < q.length && fresh > 0; ) {
    const end = q.length;
    for (; head < end; head++) {
      const [y, x] = q[head]!;
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < h && nx >= 0 && nx < w && cell[ny]![nx] === "1") { cell[ny]![nx] = "2"; fresh--; q.push([ny, nx]); }
      }
    }
    minutes++;
  }
  return fresh > 0 ? -1 : minutes;
}
const rand = lcg(2);
const mk = (h: number, w: number, pm: number, pf: number) => Array.from({ length: h }, () => Array.from({ length: w }, () => { const r = rand(); return r < pm ? "2" : r < pm + pf ? "1" : "0"; }).join(""));
const randomBig = mk(500, 500, 0.001, 0.9);
const dense = mk(400, 400, 0.02, 0.95);
const line = ["2" + "1".repeat(499)];
const snake = Array.from({ length: 200 }, (_, r) => (r % 2 === 0 ? (r === 0 ? "2" + "1".repeat(199) : "1".repeat(200)) : r % 4 === 1 ? "0".repeat(199) + "1" : "1" + "0".repeat(199)));

export default defineProblem({
  schemaVersion: 1,
  slug: "spreading-mold",
  title: "Spreading Mold",
  difficulty: "medium",
  patterns: ["graphs"],
  statement: `A bakery tray is a grid of text rows. \`"0"\` is an empty slot, \`"1"\` is a fresh loaf and \`"2"\` is a loaf that already has mold.

Every minute, each moldy loaf spreads mold to every fresh loaf directly **above, below, left or right** of it (not diagonally). Empty slots stop the spread.

Return the number of **minutes** until no fresh loaf remains. If some fresh loaf can never be reached, return \`-1\`. If there are no fresh loaves to begin with, the answer is \`0\`.`,
  constraints: ["1 <= tray.length <= 500", "All rows have the same length, 1 to 500", "Each character is \"0\", \"1\" or \"2\""],
  examples: [
    { input: 'tray = ["211", "110", "011"]', output: "4" },
    { input: 'tray = ["211", "011", "101"]', output: "-1", explanation: "The loaf in the bottom-left corner is cut off." },
    { input: 'tray = ["02"]', output: "0" },
  ],
  signature: { name: { python: "minutes_to_spread", javascript: "minutesToSpread" }, params: [{ name: "tray", type: "string[]" }], returns: "int" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [["211", "110", "011"]], 4), t("basic", [["211", "011", "101"]], -1), t("basic", [["02"]], 0)],
  hiddenTests: [
    t("basic", [["2111"]], 3),
    t("basic", [["2", "1", "1"]], 2),
    t("basic", [["212", "111", "212"]], 2),
    t("edge", [["0"]], 0),
    t("edge", [["1"]], -1),
    t("edge", [["2"]], 0),
    t("large", [randomBig], ref(randomBig)),
    t("large", [dense], ref(dense)),
    t("large", [line], 499),
    t("large", [snake], ref(snake)),
  ],
  hints: [
    "Every moldy loaf spreads at the same time, minute by minute. That sounds like a search that advances in rings.",
    "Start a breadth-first search from ALL moldy loaves at once (a multi-source BFS). Each BFS layer is one minute.",
    "Count the fresh loaves up front; every time one gets moldy, decrement. After the BFS, any fresh loaf left means -1.",
  ],
  editorial: `## Idea

Mold spreads in lock-step, so a **multi-source breadth-first search** starting from every moldy loaf models it: layer k of the BFS is minute k.

## Walkthrough

Queue all moldy cells; count fresh ones. Process the queue layer by layer, turning neighbouring fresh cells moldy and queueing them, and increment minutes after each non-empty layer. If fresh loaves remain, return -1.

## Cost

**O(rows * cols) time and space.**
`,
  approachCheckpoint: checkpoint({ pattern: "graphs", others: ["dp", "trees", "greedy", "two-pointers"], time: "O(n)", space: "O(n)", why: "A multi-source BFS visits each cell at most once, so the work is proportional to the number of cells, and the queue can hold a large share of them." }),
  referenceSolution: {
    python: `from collections import deque

def minutes_to_spread(tray):
    h, w = len(tray), len(tray[0])
    cell = [list(r) for r in tray]
    q = deque()
    fresh = 0
    for r in range(h):
        for c in range(w):
            if cell[r][c] == '2':
                q.append((r, c))
            elif cell[r][c] == '1':
                fresh += 1
    minutes = 0
    while q and fresh > 0:
        for _ in range(len(q)):
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and cell[ny][nx] == '1':
                    cell[ny][nx] = '2'
                    fresh -= 1
                    q.append((ny, nx))
        minutes += 1
    return -1 if fresh > 0 else minutes
`,
    javascript: `function minutesToSpread(tray) {
  const h = tray.length, w = tray[0].length;
  const cell = tray.map((r) => Array.from(r));
  let q = [];
  let fresh = 0;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    if (cell[r][c] === '2') q.push([r, c]);
    else if (cell[r][c] === '1') fresh++;
  }
  let minutes = 0;
  while (q.length && fresh > 0) {
    const next = [];
    for (const [y, x] of q) {
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < h && nx >= 0 && nx < w && cell[ny][nx] === '1') {
          cell[ny][nx] = '2';
          fresh--;
          next.push([ny, nx]);
        }
      }
    }
    q = next;
    minutes++;
  }
  return fresh > 0 ? -1 : minutes;
}
`,
  },
});
