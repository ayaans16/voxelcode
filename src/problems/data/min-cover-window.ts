import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(text: string, need: string): string {
  const want = new Map<string, number>();
  for (const c of need) want.set(c, (want.get(c) ?? 0) + 1);
  let missing = need.length, left = 0, bestL = -1, bestLen = Infinity;
  for (let r = 0; r < text.length; r++) {
    const c = text[r]!;
    if (want.has(c)) {
      if (want.get(c)! > 0) missing--;
      want.set(c, want.get(c)! - 1);
    }
    while (missing === 0) {
      if (r - left + 1 < bestLen) { bestLen = r - left + 1; bestL = left; }
      const lc = text[left]!;
      if (want.has(lc)) {
        want.set(lc, want.get(lc)! + 1);
        if (want.get(lc)! > 0) missing++;
      }
      left++;
    }
  }
  return bestL < 0 ? "" : text.slice(bestL, bestL + bestLen);
}
const rand = lcg(88);
const mk = (n: number, k: number) => Array.from({ length: n }, () => "abcdefghij"[Math.floor(rand() * k)]).join("");
const big = mk(200_000, 6);
const big2 = mk(200_000, 10);

export default defineProblem({
  schemaVersion: 1,
  slug: "min-cover-window",
  title: "Smallest Cover",
  difficulty: "hard",
  patterns: ["sliding-window"],
  statement: `You have a long banner \`banner\` and a shorter list of required letters \`needed\` (letters may repeat: \`"aab"\` needs two a's and one b).

Find the **shortest continuous piece** of the banner that contains **at least** every needed letter (counting repeats). Return that piece. If no piece works, return the empty string \`""\`. If several shortest pieces exist, return the one that starts **earliest**.`,
  constraints: ["1 <= banner.length <= 200 000", "1 <= needed.length <= 1 000", "Both use lowercase letters a-z"],
  examples: [
    { input: 'banner = "adobecodebanc", needed = "abc"', output: '"banc"', explanation: "The shortest piece holding an a, a b and a c." },
    { input: 'banner = "a", needed = "a"', output: '"a"' },
    { input: 'banner = "a", needed = "aa"', output: '""', explanation: "Only one a is available." },
  ],
  signature: { name: { python: "smallest_cover", javascript: "smallestCover" }, params: [{ name: "banner", type: "string" }, { name: "needed", type: "string" }], returns: "string" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", ["adobecodebanc", "abc"], "banc"), t("basic", ["a", "a"], "a"), t("basic", ["a", "aa"], "")],
  hiddenTests: [
    t("basic", ["abcabdebac", "cea"], "ebac"),
    t("basic", ["aabbcc", "abc"], "abbc"),
    t("basic", ["xyz", "yx"], "xy"),
    t("edge", ["abc", "abcd"], ""),
    t("edge", ["bbaa", "aba"], "baa"),
    t("edge", ["zzzz", "zz"], "zz"),
    t("large", [big, "abcdef"], ref(big, "abcdef")),
    t("large", [big2, "aabbccddeeffgghhii"], ref(big2, "aabbccddeeffgghhii")),
    t("large", [big, "a".repeat(900)], ref(big, "a".repeat(900))),
  ],
  hints: [
    "Checking every piece is far too slow. Think about a window that grows until it covers everything, then shrinks while it still does.",
    "Track how many of each needed letter the window is still missing (a counter map plus a single 'missing' total).",
    "Extend right until nothing is missing, then move left as far as you can while staying a cover, recording the shortest window each time.",
  ],
  editorial: `## Idea

A **sliding window** with a "still missing" counter. Grow the right edge until the window covers all needed letters, then shrink from the left to find the tightest cover ending at that point.

## Cost

Both edges move forward at most n times: **O(n + m) time**, O(1) space for the 26-letter alphabet.
`,
  approachCheckpoint: checkpoint({ pattern: "sliding-window", others: ["two-pointers", "hashing", "dp", "binary-search"], time: "O(n)", space: "O(1)", why: "Each edge advances monotonically, so there are O(n) steps in total; the counters are bounded by the 26-letter alphabet." }),
  referenceSolution: {
    python: `def smallest_cover(banner, needed):
    want = {}
    for c in needed:
        want[c] = want.get(c, 0) + 1
    missing = len(needed)
    left = 0
    best_l, best_len = -1, float('inf')
    for r, c in enumerate(banner):
        if c in want:
            if want[c] > 0:
                missing -= 1
            want[c] -= 1
        while missing == 0:
            if r - left + 1 < best_len:
                best_len = r - left + 1
                best_l = left
            lc = banner[left]
            if lc in want:
                want[lc] += 1
                if want[lc] > 0:
                    missing += 1
            left += 1
    return "" if best_l < 0 else banner[best_l:best_l + best_len]
`,
    javascript: `function smallestCover(banner, needed) {
  const want = new Map();
  for (const c of needed) want.set(c, (want.get(c) || 0) + 1);
  let missing = needed.length, left = 0, bestL = -1, bestLen = Infinity;
  for (let r = 0; r < banner.length; r++) {
    const c = banner[r];
    if (want.has(c)) {
      if (want.get(c) > 0) missing--;
      want.set(c, want.get(c) - 1);
    }
    while (missing === 0) {
      if (r - left + 1 < bestLen) { bestLen = r - left + 1; bestL = left; }
      const lc = banner[left];
      if (want.has(lc)) {
        want.set(lc, want.get(lc) + 1);
        if (want.get(lc) > 0) missing++;
      }
      left++;
    }
  }
  return bestL < 0 ? "" : banner.slice(bestL, bestL + bestLen);
}
`,
  },
});
