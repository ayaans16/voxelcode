import { checkpoint, defineProblem, t } from "../define";

const CATALAN = [1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862, 16796, 58786, 208012, 742900];

export default defineProblem({
  schemaVersion: 1,
  slug: "bracket-weave",
  title: "Bracket Weave",
  difficulty: "medium",
  patterns: ["backtracking"],
  statement: `You have \`n\` pairs of round brackets. A **valid weave** is a string that uses all of them (each \`(\` has a matching \`)\` that comes later, and at no point are there more \`)\` than \`(\` so far).

For example, with \`n = 2\` the valid weaves are \`(())\` and \`()()\`; the string \`)(\` is not valid.

Return **how many** valid weaves exist for \`n\` pairs. (You do not need to list them.)`,
  constraints: ["0 <= n <= 13"],
  examples: [
    { input: "n = 3", output: "5", explanation: "((())), (()()), (())(), ()(()), ()()()." },
    { input: "n = 1", output: "1" },
    { input: "n = 0", output: "1", explanation: "The empty string is the one valid weave." },
  ],
  signature: { name: { python: "count_weaves", javascript: "countWeaves" }, params: [{ name: "n", type: "int" }], returns: "int" },
  timeLimitMs: 2000,
  pythonTimeFactor: 6,
  visibleTests: [t("basic", [3], 5), t("basic", [1], 1), t("basic", [0], 1)],
  hiddenTests: [
    t("basic", [2], 2),
    t("basic", [4], 14),
    t("basic", [5], 42),
    t("edge", [6], 132),
    t("edge", [9], 4862),
    t("large", [12], CATALAN[12]!),
    t("large", [13], CATALAN[13]!),
  ],
  hints: [
    "Building the string one character at a time, which characters are allowed at each step?",
    "You may add '(' if you still have openers left, and ')' only if there are more '(' than ')' so far.",
    "Recurse with counts of openers and closers used so far; count a complete string when both reach n. (There is also a closed formula, but practise the search.)",
  ],
  editorial: `## Idea

**Backtracking** that only ever extends a prefix legally: add \`(\` while \`open < n\`, add \`)\` while \`close < open\`. Every complete string reached is valid, and no invalid prefix is ever explored.

The answers are the Catalan numbers (1, 1, 2, 5, 14, 42, ...), so a DP also works.

## Cost

The search visits one node per valid prefix, on the order of the Catalan number itself. Generating **all** 2^(2n) strings and filtering is much slower.
`,
  approachCheckpoint: checkpoint({ pattern: "backtracking", others: ["dp", "stack", "greedy", "math"], time: "O(2^n)", space: "O(n)", why: "The number of valid prefixes grows exponentially with n (about 4^n / n^1.5), and recursion depth plus counters only need O(n) space." }),
  referenceSolution: {
    python: `def count_weaves(n):
    def go(opened, closed):
        if opened == n and closed == n:
            return 1
        total = 0
        if opened < n:
            total += go(opened + 1, closed)
        if closed < opened:
            total += go(opened, closed + 1)
        return total

    return go(0, 0)
`,
    javascript: `function countWeaves(n) {
  function go(opened, closed) {
    if (opened === n && closed === n) return 1;
    let total = 0;
    if (opened < n) total += go(opened + 1, closed);
    if (closed < opened) total += go(opened, closed + 1);
    return total;
  }
  return go(0, 0);
}
`,
  },
});
