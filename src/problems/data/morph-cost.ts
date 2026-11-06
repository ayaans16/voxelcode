import { defineProblem, lcg, t } from "../define";

function ref(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! : 1 + Math.min(prev[j - 1]!, prev[j]!, cur[j - 1]!);
    }
    prev = cur;
  }
  return prev[m]!;
}

const rand = lcg(61);
const rs = (n: number, k: number) => Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(rand() * k))).join("");
const longA = rs(1200, 4);
const longB = rs(1200, 4);
const same = rs(1500, 6);
const base = rs(1000, 26);
const mutated = base.replace(/a/g, "z");

export default defineProblem({
  schemaVersion: 1,
  slug: "morph-cost",
  title: "Morph Cost",
  difficulty: "hard",
  patterns: ["dp"],
  statement: `A sign painter wants to turn the word \`source\` into the word \`target\` one letter at a time. In a single step they may do exactly one of:

- **insert** a letter anywhere,
- **delete** a letter, or
- **replace** one letter with another.

Return the **fewest steps** needed. Both words use lowercase letters and may be empty.`,
  constraints: ["0 <= source.length, target.length <= 1 500", "Only lowercase letters a-z"],
  examples: [
    { input: 'source = "kitten", target = "sitting"', output: "3", explanation: "kitten -> sitten (replace k) -> sittin (replace e) -> sitting (insert g)." },
    { input: 'source = "", target = "abc"', output: "3" },
    { input: 'source = "flaw", target = "lawn"', output: "2", explanation: "Delete f, then insert n." },
  ],
  signature: { name: { python: "morph_cost", javascript: "morphCost" }, params: [{ name: "source", type: "string" }, { name: "target", type: "string" }], returns: "int" },
  timeLimitMs: 2000,
  pythonTimeFactor: 6,
  visibleTests: [t("basic", ["kitten", "sitting"], 3), t("basic", ["", "abc"], 3), t("basic", ["flaw", "lawn"], 2)],
  hiddenTests: [
    t("basic", ["horse", "ros"], 3),
    t("basic", ["intention", "execution"], 5),
    t("basic", ["abc", "abc"], 0),
    t("edge", ["", ""], 0),
    t("edge", ["a", ""], 1),
    t("edge", ["abc", "xyz"], 3),
    t("edge", ["aaaa", "aa"], 2),
    t("large", [longA, longB], ref(longA, longB)),
    t("large", [same, same], 0),
    t("large", [base, mutated], ref(base, mutated)),
  ],
  hints: [
    "Compare the last letters of the two words. What are your options at that point?",
    "Let `cost(i, j)` be the answer for the first `i` letters of `source` and the first `j` of `target`. If the letters match it is `cost(i-1, j-1)`; otherwise it is 1 plus the best of three smaller subproblems.",
    "Fill a table row by row. Row 0 is 0..m (insert everything); column 0 is 0..n (delete everything). You only need the previous row to compute the current one.",
  ],
  editorial: `## Idea

Look at the last letters. If they match, nothing is needed for them. If not, the final step is one of three operations, each leading to a smaller subproblem:

- replace -> \`cost(i-1, j-1)\`
- delete a letter of \`source\` -> \`cost(i-1, j)\`
- insert a letter of \`target\` -> \`cost(i, j-1)\`

## Walkthrough

\`cost(i, 0) = i\` and \`cost(0, j) = j\`. Otherwise \`cost(i, j) = cost(i-1, j-1)\` when the letters match, else \`1 + min\` of the three above. Compute row by row; keeping only the previous row reduces memory.

## Cost

**O(n * m) time**, O(min(n, m)) space with row reuse. Plain recursion without memoization is exponential.
`,
  approachCheckpoint: {
    patternOptions: ["dp", "greedy", "two-pointers", "graphs", "sliding-window"],
    correctPattern: "dp",
    complexity: { time: ["O(n + m)", "O(n * m)", "O(n * m * min(n, m))", "O(3^(n + m))"], space: ["O(1)", "O(min(n, m))", "O(n * m)", "O(n * m * min(n, m))"], correctTime: "O(n * m)", correctSpace: "O(min(n, m))" },
    explanation: "The answer for two prefixes depends on three smaller prefix pairs, so a table of n*m cells fills in O(n * m) time. Each row only needs the previous row, so O(min(n, m)) space is enough if you orient the table so rows are the shorter word.",
  },
  referenceSolution: {
    python: `def morph_cost(source, target):
    n, m = len(source), len(target)
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            if source[i - 1] == target[j - 1]:
                cur[j] = prev[j - 1]
            else:
                cur[j] = 1 + min(prev[j - 1], prev[j], cur[j - 1])
        prev = cur
    return prev[m]
`,
    javascript: `function morphCost(source, target) {
  const n = source.length, m = target.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = source[i - 1] === target[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[m];
}
`,
    java: `class Solution {
    public static int morphCost(String source, String target) {
        int n = source.length(), m = target.length();
        int[] prev = new int[m + 1], cur = new int[m + 1];
        for (int j = 0; j <= m; j++) prev[j] = j;
        for (int i = 1; i <= n; i++) {
            cur[0] = i;
            for (int j = 1; j <= m; j++) {
                if (source.charAt(i - 1) == target.charAt(j - 1)) cur[j] = prev[j - 1];
                else cur[j] = 1 + Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1]));
            }
            int[] t = prev; prev = cur; cur = t;
        }
        return prev[m];
    }
}
`,
    c: `static int vc_min3(int a, int b, int c) { int m = a < b ? a : b; return m < c ? m : c; }

int morph_cost(const char *source, const char *target) {
    int n = (int)strlen(source), m = (int)strlen(target);
    int *prev = malloc(sizeof(int) * (m + 1)), *cur = malloc(sizeof(int) * (m + 1));
    for (int j = 0; j <= m; j++) prev[j] = j;
    for (int i = 1; i <= n; i++) {
        cur[0] = i;
        for (int j = 1; j <= m; j++) {
            if (source[i - 1] == target[j - 1]) cur[j] = prev[j - 1];
            else cur[j] = 1 + vc_min3(prev[j - 1], prev[j], cur[j - 1]);
        }
        int *t = prev; prev = cur; cur = t;
    }
    int r = prev[m];
    free(prev);
    free(cur);
    return r;
}
`,
    go: `package main

func morphCost(source string, target string) int {
	n, m := len(source), len(target)
	prev := make([]int, m+1)
	cur := make([]int, m+1)
	for j := 0; j <= m; j++ {
		prev[j] = j
	}
	for i := 1; i <= n; i++ {
		cur[0] = i
		for j := 1; j <= m; j++ {
			if source[i-1] == target[j-1] {
				cur[j] = prev[j-1]
			} else {
				best := prev[j-1]
				if prev[j] < best {
					best = prev[j]
				}
				if cur[j-1] < best {
					best = cur[j-1]
				}
				cur[j] = 1 + best
			}
		}
		prev, cur = cur, prev
	}
	return prev[m]
}
`,
  },
});
