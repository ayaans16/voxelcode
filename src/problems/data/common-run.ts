import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(a: string, b: string): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = [0];
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    prev = cur;
  }
  return prev[b.length]!;
}
const rand = lcg(10);
const rs = (n: number, k: number) => Array.from({ length: n }, () => "abcd"[Math.floor(rand() * k)]).join("");
const A = rs(1500, 4), B = rs(1500, 4);
const S = rs(1200, 26 > 4 ? 4 : 4);

export default defineProblem({
  schemaVersion: 1,
  slug: "common-run",
  title: "Shared Melody",
  difficulty: "medium",
  patterns: ["dp"],
  statement: `Two songs are written as strings of notes. A **shared melody** is a sequence of notes that appears in **both** songs in the same order, though the notes need not be next to each other in either song.

Return the **length of the longest shared melody**. If the songs share no notes, return \`0\`.`,
  constraints: ["0 <= songA.length, songB.length <= 1 500", "Lowercase letters only"],
  examples: [
    { input: 'songA = "abcde", songB = "ace"', output: "3", explanation: '"ace".' },
    { input: 'songA = "abc", songB = "abc"', output: "3" },
    { input: 'songA = "abc", songB = "def"', output: "0" },
  ],
  signature: { name: { python: "shared_length", javascript: "sharedLength" }, params: [{ name: "songA", type: "string" }, { name: "songB", type: "string" }], returns: "int" },
  timeLimitMs: 2000,
  pythonTimeFactor: 6,
  visibleTests: [t("basic", ["abcde", "ace"], 3), t("basic", ["abc", "abc"], 3), t("basic", ["abc", "def"], 0)],
  hiddenTests: [
    t("basic", ["bl", "yby"], 1),
    t("basic", ["abcbdab", "bdcaba"], 4),
    t("edge", ["", "abc"], 0),
    t("edge", ["", ""], 0),
    t("edge", ["aaaa", "aa"], 2),
    t("large", [A, B], ref(A, B)),
    t("large", [S, S], 1200),
    t("large", [A, "z".repeat(1500)], 0),
  ],
  hints: [
    "Compare the last note of each song. If they match, they can both be the end of a shared melody.",
    "Let best(i, j) be the answer for the first i notes of A and first j of B. Matching ends: best(i-1, j-1) + 1. Otherwise: the larger of best(i-1, j) and best(i, j-1).",
    "Fill a grid row by row. You only ever look at the previous row and the current row, so two rows of memory are enough.",
  ],
  editorial: `## Idea

A classic two-string DP. Let \`best[i][j]\` be the longest shared melody of the first \`i\` and \`j\` notes. If the last notes match, extend \`best[i-1][j-1]\`; otherwise drop one note from either song and take the better result.

## Cost

**O(n * m) time**, O(min(n, m)) space with rolling rows. Recursion without memoisation is exponential.
`,
  approachCheckpoint: checkpoint({ pattern: "dp", others: ["greedy", "two-pointers", "hashing", "sliding-window"], time: "O(n^2)", space: "O(n)", why: "A table over all prefix pairs has n*m cells, each filled in O(1); keeping only the previous row reduces memory to O(min(n, m))." }),
  referenceSolution: {
    python: `def shared_length(songA, songB):
    prev = [0] * (len(songB) + 1)
    for i in range(1, len(songA) + 1):
        cur = [0] * (len(songB) + 1)
        for j in range(1, len(songB) + 1):
            if songA[i - 1] == songB[j - 1]:
                cur[j] = prev[j - 1] + 1
            else:
                cur[j] = max(prev[j], cur[j - 1])
        prev = cur
    return prev[len(songB)]
`,
    javascript: `function sharedLength(songA, songB) {
  let prev = new Array(songB.length + 1).fill(0);
  for (let i = 1; i <= songA.length; i++) {
    const cur = [0];
    for (let j = 1; j <= songB.length; j++) {
      cur[j] = songA[i - 1] === songB[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[songB.length];
}
`,
  },
});
