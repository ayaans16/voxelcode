/**
 * PROBLEM TEMPLATE. Copy this file to `src/problems/data/<your-slug>.ts`,
 * edit it, then add ONE import + ONE entry in `src/problems/index.ts`.
 * (Files starting with "_" are never loaded; this one is only checked by
 * the test suite so the template can never rot.)
 *
 * RULES
 *  - Write everything yourself: statement, examples, hints, editorial.
 *    Do not copy or closely paraphrase any other site. Ideas are free,
 *    wording and examples must be yours.
 *  - Run `npm test` after adding it. The suite runs your referenceSolution
 *    (JavaScript AND Python) against every test, so a wrong expected value
 *    fails right away.
 *  - You need at least one hidden test in each of "basic", "edge" and "large".
 *    "large" is what makes a brute-force solution time out.
 *
 * TIPS
 *  - Tests are plain data: `t(category, [arg1, arg2, ...], expected)`.
 *  - Build big inputs with ordinary code at the top of the file (see `lcg`),
 *    and compute their expected value with a small reference function
 *    written in TypeScript right here.
 *  - `comparison` can be "exact" (default), "unordered" (top-level list order
 *    ignored) or { float: { abs: 1e-6 } }.
 *  - Leave out `starter` and the code stubs are generated from `signature`.
 */
import { defineProblem, t } from "../define";

export default defineProblem({
  schemaVersion: 1,

  // ---- identity -----------------------------------------------------------
  slug: "template-double-it", // kebab-case, unique, also seeds the tree
  title: "Double It",
  difficulty: "easy", // "easy" = sapling, "medium" = full tree, "hard" = large tree + blossom crown
  patterns: ["arrays"], // FIRST pattern picks the species (see src/engine/species.ts)

  // ---- what the learner reads ----------------------------------------------
  statement: `Write your own story here, in **markdown**.

Given a list of whole numbers \`nums\`, return a new list where every number is doubled.`,
  constraints: ["1 <= nums.length <= 100 000", "-1 000 000 <= nums[i] <= 1 000 000"],
  examples: [
    // 2 or 3 worked examples
    { input: "nums = [1, 2, 3]", output: "[2, 4, 6]", explanation: "Each value is multiplied by two." },
    { input: "nums = [-5]", output: "[-10]" },
  ],

  // ---- function signature (drives starter code + the test harness) ---------
  signature: {
    name: { python: "double_all", javascript: "doubleAll" },
    params: [{ name: "nums", type: "int[]" }],
    returns: "int[]",
  },
  // starter: { python: "...", javascript: "..." },   // optional override
  comparison: "exact",
  timeLimitMs: 1500, // per test, JavaScript. Python gets this x pythonTimeFactor (default 4).

  // ---- tests ---------------------------------------------------------------
  visibleTests: [
    // shown in the editor results, used by "Run". Usually mirror the examples.
    t("basic", [[1, 2, 3]], [2, 4, 6]),
    t("basic", [[-5]], [-10]),
  ],
  hiddenTests: [
    // used by "Submit". Failures only reveal the CATEGORY, never the input.
    t("basic", [[0, 0]], [0, 0]),
    t("edge", [[1_000_000, -1_000_000]], [2_000_000, -2_000_000]),
    t("large", [Array.from({ length: 100_000 }, (_, i) => i)], Array.from({ length: 100_000 }, (_, i) => i * 2)),
  ],

  // ---- help ----------------------------------------------------------------
  hints: [
    // progressive: each hint reveals a bit more than the last (1 to 5)
    "Think about what has to happen to every element.",
    "You need one output value per input value.",
    "Walk the list once and push `2 * x` for each `x`.",
  ],
  editorial: `## Idea

Explain the key insight in your own words. Unlocked after a solve, or after all hints.

## Walkthrough

Step by step.

## Cost

State the time and space complexity.
`,

  // ---- approach checkpoint (multiple choice) --------------------------------
  approachCheckpoint: {
    patternOptions: ["arrays", "hashing", "two-pointers", "dp"], // 3 to 6, must include the correct one
    correctPattern: "arrays",
    complexity: {
      time: ["O(1)", "O(n)", "O(n log n)", "O(n^2)"],
      space: ["O(1)", "O(n)", "O(n^2)"],
      correctTime: "O(n)",
      correctSpace: "O(n)",
    },
    explanation: "Shown after answering, right or wrong. Explain why the pattern and the complexities are what they are.",
  },

  // ---- only used by the test suite ------------------------------------------
  referenceSolution: {
    python: `def double_all(nums):
    return [2 * x for x in nums]
`,
    javascript: `function doubleAll(nums) {
  return nums.map((x) => 2 * x);
}
`,
  },
});
