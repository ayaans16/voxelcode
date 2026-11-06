import { defineProblem, lcg, t } from "../define";

function ref(weights: number[], limit: number): number {
  const w = [...weights].sort((a, b) => a - b);
  let i = 0;
  let j = w.length - 1;
  let count = 0;
  while (i <= j) {
    if (i < j && w[i]! + w[j]! <= limit) i++;
    j--;
    count++;
  }
  return count;
}

const rand = lcg(19);
const big = Array.from({ length: 200_000 }, () => 1 + Math.floor(rand() * 100));
const allHeavy = new Array<number>(200_000).fill(60);
const allLight = new Array<number>(200_000).fill(10);

export default defineProblem({
  schemaVersion: 1,
  slug: "gondola-pairing",
  title: "Gondola Pairing",
  difficulty: "easy",
  patterns: ["greedy", "two-pointers"],
  statement: `At a ski resort, visitors queue for a gondola. Each gondola holds **at most two** people, and the two riders' combined weight must not exceed \`limit\`. Every single visitor weighs at most \`limit\`.

Given the visitors' weights (in any order), return the **fewest gondolas** needed to carry everyone.`,
  constraints: ["1 <= weights.length <= 200 000", "1 <= weights[i] <= limit <= 1000"],
  examples: [
    { input: "weights = [3, 2, 2, 1], limit = 3", output: "3", explanation: "(1 and 2), (2), (3)." },
    { input: "weights = [3, 5, 3, 4], limit = 5", output: "4", explanation: "No two people fit together." },
    { input: "weights = [4, 1, 3, 2], limit = 5", output: "2", explanation: "(4 and 1), (3 and 2)." },
  ],
  signature: { name: { python: "fewest_gondolas", javascript: "fewestGondolas" }, params: [{ name: "weights", type: "int[]" }, { name: "limit", type: "int" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[3, 2, 2, 1], 3], 3), t("basic", [[3, 5, 3, 4], 5], 4), t("basic", [[4, 1, 3, 2], 5], 2)],
  hiddenTests: [
    t("basic", [[1, 2], 3], 1),
    t("basic", [[5, 1, 4, 2], 6], 2),
    t("basic", [[2, 2, 2, 2, 2], 4], 3),
    t("edge", [[7], 7], 1),
    t("edge", [[1, 1], 1], 2),
    t("edge", [[10, 10, 10], 20], 2),
    t("large", [big, 100], ref(big, 100)),
    t("large", [allHeavy, 100], 200_000),
    t("large", [allLight, 20], 100_000),
  ],
  hints: [
    "The heaviest rider is the hardest to place. Who is the best partner for them?",
    "Sort the weights. Try to pair the heaviest remaining person with the lightest remaining person.",
    "Two pointers from both ends: if lightest + heaviest fits, they share a gondola (move both); otherwise the heaviest rides alone. Count gondolas as you go.",
  ],
  editorial: `## Idea

If the heaviest person cannot share with the **lightest** person, they cannot share with anyone, so they ride alone. If they can share with the lightest, pairing them is never worse than any other pairing. That greedy choice is safe.

## Walkthrough

Sort ascending. \`i = 0\`, \`j = n - 1\`. While \`i <= j\`: if \`i < j\` and \`w[i] + w[j] <= limit\`, advance \`i\`. Always decrement \`j\`. Each loop uses one gondola.

## Cost

Sorting: **O(n log n)**; the sweep is O(n). Space O(1) beyond the sort.
`,
  approachCheckpoint: {
    patternOptions: ["greedy", "two-pointers", "dp", "binary-search", "hashing"],
    correctPattern: "greedy",
    complexity: { time: ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n log n)", correctSpace: "O(1)" },
    explanation: "Always trying to pair the heaviest with the lightest is a safe greedy choice, implemented with two pointers after sorting. Sorting costs O(n log n) and the sweep uses O(1) extra space (ignoring the sort's own workspace).",
  },
  referenceSolution: {
    python: `def fewest_gondolas(weights, limit):
    w = sorted(weights)
    i, j, count = 0, len(w) - 1, 0
    while i <= j:
        if i < j and w[i] + w[j] <= limit:
            i += 1
        j -= 1
        count += 1
    return count
`,
    javascript: `function fewestGondolas(weights, limit) {
  const w = [...weights].sort((a, b) => a - b);
  let i = 0, j = w.length - 1, count = 0;
  while (i <= j) {
    if (i < j && w[i] + w[j] <= limit) i++;
    j--;
    count++;
  }
  return count;
}
`,
  },
});
