import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(nums: number[]): number {
  const a = [...nums].sort((x, y) => x - y);
  let count = 0;
  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    let l = i + 1, r = a.length - 1;
    while (l < r) {
      const s = a[i]! + a[l]! + a[r]!;
      if (s < 0) l++;
      else if (s > 0) r--;
      else {
        count++;
        l++; r--;
        while (l < r && a[l] === a[l - 1]) l++;
        while (l < r && a[r] === a[r + 1]) r--;
      }
    }
  }
  return count;
}
const rand = lcg(23);
const big = Array.from({ length: 3000 }, () => Math.floor(rand() * 2001) - 1000);
const wide = Array.from({ length: 3000 }, () => Math.floor(rand() * 2_000_000) - 1_000_000);
const zeros = new Array<number>(3000).fill(0);

export default defineProblem({
  schemaVersion: 1,
  slug: "triplet-zero",
  title: "Balanced Trio",
  difficulty: "medium",
  patterns: ["two-pointers"],
  statement: `A scoreboard shows points for several players, some positive and some negative (penalties). A **balanced trio** is three different positions whose scores add up to exactly \`0\`.

Two trios are the **same** if they use the same three values (ignore which positions they came from; \`[-1, 0, 1]\` found twice counts once). Return how many **different** balanced trios exist.`,
  constraints: ["3 <= scores.length <= 3 000", "-1 000 000 <= scores[i] <= 1 000 000"],
  examples: [
    { input: "scores = [-1, 0, 1, 2, -1, -4]", output: "2", explanation: "[-1, -1, 2] and [-1, 0, 1]." },
    { input: "scores = [0, 0, 0, 0]", output: "1", explanation: "Only the value-trio [0, 0, 0] exists." },
    { input: "scores = [1, 2, 3]", output: "0" },
  ],
  signature: { name: { python: "count_trios", javascript: "countTrios" }, params: [{ name: "scores", type: "int[]" }], returns: "int" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [[-1, 0, 1, 2, -1, -4]], 2), t("basic", [[0, 0, 0, 0]], 1), t("basic", [[1, 2, 3]], 0)],
  hiddenTests: [
    t("basic", [[-2, 0, 1, 1, 2]], 2),
    t("basic", [[-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]], 6),
    t("edge", [[0, 0, 0]], 1),
    t("edge", [[1, -1, 0]], 1),
    t("edge", [[5, 5, 5]], 0),
    t("large", [big], ref(big)),
    t("large", [wide], ref(wide)),
    t("large", [zeros], 1),
  ],
  hints: [
    "Checking every triple is O(n^3). Fix one number and look at what remains.",
    "Sort the scores. For a fixed first value, you need two others that sum to its negative: that is a two-pointer sweep.",
    "To avoid counting duplicates, skip repeated first values and, after finding a match, skip repeated left/right values too.",
  ],
  editorial: `## Idea

Sort, then for each distinct first value \`a[i]\` find pairs in the rest of the list summing to \`-a[i]\` with two pointers (\`l\` from the left, \`r\` from the right).

## Walkthrough

- Sum too small: move \`l\` right. Sum too big: move \`r\` left.
- Match: count it, move both pointers, and skip over equal neighbours so each value-trio is counted once.
- Skip \`i\` when it equals the previous first value.

## Cost

Sorting O(n log n) plus O(n) per first value: **O(n^2) time**, O(1) extra space.
`,
  approachCheckpoint: checkpoint({ pattern: "two-pointers", others: ["hashing", "dp", "binary-search", "stack"], time: "O(n^2)", space: "O(1)", why: "Sorting lets a two-pointer sweep find all pairs for one first value in linear time; doing that for each first value is quadratic, with no extra storage beyond the sort." }),
  referenceSolution: {
    python: `def count_trios(scores):
    a = sorted(scores)
    count = 0
    n = len(a)
    for i in range(n - 2):
        if i > 0 and a[i] == a[i - 1]:
            continue
        l, r = i + 1, n - 1
        while l < r:
            s = a[i] + a[l] + a[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                count += 1
                l += 1
                r -= 1
                while l < r and a[l] == a[l - 1]:
                    l += 1
                while l < r and a[r] == a[r + 1]:
                    r -= 1
    return count
`,
    javascript: `function countTrios(scores) {
  const a = [...scores].sort((x, y) => x - y);
  let count = 0;
  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    let l = i + 1, r = a.length - 1;
    while (l < r) {
      const s = a[i] + a[l] + a[r];
      if (s < 0) l++;
      else if (s > 0) r--;
      else {
        count++;
        l++; r--;
        while (l < r && a[l] === a[l - 1]) l++;
        while (l < r && a[r] === a[r + 1]) r--;
      }
    }
  }
  return count;
}
`,
  },
});
