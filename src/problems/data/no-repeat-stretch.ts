import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(s: string): number {
  const last = new Map<string, number>();
  let left = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r]!;
    if (last.has(c) && last.get(c)! >= left) left = last.get(c)! + 1;
    last.set(c, r);
    best = Math.max(best, r - left + 1);
  }
  return best;
}
const rand = lcg(66);
const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const big = Array.from({ length: 200_000 }, () => chars[Math.floor(rand() * 62)]).join("");
const small = Array.from({ length: 200_000 }, () => "ab"[Math.floor(rand() * 2)]).join("");
const all = chars.repeat(3000).slice(0, 186_000);

export default defineProblem({
  schemaVersion: 1,
  slug: "no-repeat-stretch",
  title: "No Repeats Allowed",
  difficulty: "medium",
  patterns: ["sliding-window"],
  statement: `A text is made of letters, digits and symbols. A **fresh stretch** is a run of consecutive characters in which **no character appears twice**.

Return the length of the longest fresh stretch. An empty text has length \`0\`.`,
  constraints: ["0 <= text.length <= 200 000", "text contains letters, digits and spaces only"],
  examples: [
    { input: 'text = "abcabcbb"', output: "3", explanation: '"abc".' },
    { input: 'text = "bbbb"', output: "1" },
    { input: 'text = "pwwkew"', output: "3", explanation: '"wke" (not "pwke": the stretch must be contiguous).' },
  ],
  signature: { name: { python: "longest_fresh", javascript: "longestFresh" }, params: [{ name: "text", type: "string" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", ["abcabcbb"], 3), t("basic", ["bbbb"], 1), t("basic", ["pwwkew"], 3)],
  hiddenTests: [
    t("basic", ["dvdf"], 3),
    t("basic", ["abba"], 2),
    t("basic", ["a b c a"], 3),
    t("edge", [""], 0),
    t("edge", ["z"], 1),
    t("edge", ["abcdef"], 6),
    t("large", [big], ref(big)),
    t("large", [small], 2),
    t("large", [all], ref(all)),
  ],
  hints: [
    "Checking every substring is O(n^2) or worse. Can you reuse the work when you extend a stretch by one character?",
    "Keep a window [left, right] with no repeats. When the new character is already inside, the left edge must jump past its previous position.",
    "Store each character's last seen index. On a repeat inside the window, set left to last[c] + 1. Track the largest window length.",
  ],
  editorial: `## Idea

A sliding window that never contains a repeat. When the incoming character was last seen **inside** the window, move \`left\` to just after that earlier occurrence.

## Cost

Each character is processed once: **O(n) time**, and the map holds at most the alphabet: O(min(n, alphabet)) space.
`,
  approachCheckpoint: checkpoint({ pattern: "sliding-window", others: ["two-pointers", "hashing", "dp", "stack"], time: "O(n)", space: "O(1)", why: "The window's right edge advances once per character and the left edge only moves forward, so it is linear; the last-seen table is bounded by the alphabet size, which is constant." }),
  referenceSolution: {
    python: `def longest_fresh(text):
    last = {}
    left = best = 0
    for r, c in enumerate(text):
        if c in last and last[c] >= left:
            left = last[c] + 1
        last[c] = r
        best = max(best, r - left + 1)
    return best
`,
    javascript: `function longestFresh(text) {
  const last = new Map();
  let left = 0, best = 0;
  for (let r = 0; r < text.length; r++) {
    const c = text[r];
    if (last.has(c) && last.get(c) >= left) left = last.get(c) + 1;
    last.set(c, r);
    best = Math.max(best, r - left + 1);
  }
  return best;
}
`,
  },
});
