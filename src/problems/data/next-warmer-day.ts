import { defineProblem, lcg, t } from "../define";

function ref(temps: number[]): number[] {
  const out = new Array<number>(temps.length).fill(0);
  const stack: number[] = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]!]! < temps[i]!) {
      const j = stack.pop()!;
      out[j] = i - j;
    }
    stack.push(i);
  }
  return out;
}

const rand = lcg(8);
const falling = Array.from({ length: 100_000 }, (_, i) => 100_000 - i);
const fallingThenPeak = [...falling, 200_000];
const random = Array.from({ length: 100_000 }, () => Math.floor(rand() * 1000));
const flat = new Array<number>(100_000).fill(42);

export default defineProblem({
  schemaVersion: 1,
  slug: "next-warmer-day",
  title: "Next Warmer Day",
  difficulty: "medium",
  patterns: ["stack"],
  statement: `You are given the temperature forecast for each day of a trip, in order.

For every day, work out **how many days you must wait until a strictly warmer day arrives**. If no later day is warmer, the answer for that day is \`0\`.

Return the list of waiting times, one per day.`,
  constraints: ["1 <= temps.length <= 100 000", "-100 000 <= temps[i] <= 300 000"],
  examples: [
    { input: "temps = [30, 40, 35, 50]", output: "[1, 2, 1, 0]", explanation: "Day 1 (40) waits two days for the 50." },
    { input: "temps = [60, 55, 50]", output: "[0, 0, 0]", explanation: "It only gets colder." },
    { input: "temps = [20, 20, 25]", output: "[2, 1, 0]", explanation: "Equal is not warmer, so the first 20 waits for the 25." },
  ],
  signature: { name: { python: "days_until_warmer", javascript: "daysUntilWarmer" }, params: [{ name: "temps", type: "int[]" }], returns: "int[]" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[30, 40, 35, 50]], [1, 2, 1, 0]), t("basic", [[60, 55, 50]], [0, 0, 0]), t("basic", [[20, 20, 25]], [2, 1, 0])],
  hiddenTests: [
    t("basic", [[73, 74, 75, 71, 69, 72, 76, 73]], [1, 1, 4, 2, 1, 1, 0, 0]),
    t("basic", [[1, 2, 3, 4]], [1, 1, 1, 0]),
    t("edge", [[5]], [0]),
    t("edge", [[7, 7, 7, 7]], [0, 0, 0, 0]),
    t("edge", [[-5, -10, 0]], [2, 1, 0]),
    t("large", [falling], new Array(100_000).fill(0)),
    t("large", [fallingThenPeak], ref(fallingThenPeak)),
    t("large", [random], ref(random)),
    t("large", [flat], new Array(100_000).fill(0)),
  ],
  hints: [
    "For each day, scanning forward until you find a warmer one is O(n^2) in the worst case (a long cold stretch). Look for work you can share between days.",
    "While you walk through the days, keep the days that are still waiting for a warmer day. When a warm day arrives, which waiting days does it satisfy?",
    "Keep a stack of waiting day indices whose temperatures are non-increasing from bottom to top. A new day pops every colder waiting day and tells it how long it waited.",
  ],
  editorial: `## Idea

A day is "waiting" until something warmer shows up. The waiting days form a **monotonic stack**: temperatures never increase from bottom to top, because a warmer arrival would already have popped the colder ones.

## Walkthrough

For each day \`i\`: while the stack is not empty and \`temps[top] < temps[i]\`, pop \`j\` and set \`answer[j] = i - j\`. Then push \`i\`. Anything left on the stack never found a warmer day and stays \`0\`.

## Cost

Each index is pushed once and popped at most once: **O(n) time, O(n) space**.
`,
  approachCheckpoint: {
    patternOptions: ["stack", "sliding-window", "two-pointers", "binary-search", "greedy"],
    correctPattern: "stack",
    complexity: { time: ["O(n)", "O(n log n)", "O(n^2)", "O(n * k)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n)", correctSpace: "O(n)" },
    explanation: "A monotonic stack holds the days still waiting. Every day is pushed once and popped at most once, so the whole sweep is O(n) with O(n) extra space.",
  },
  referenceSolution: {
    python: `def days_until_warmer(temps):
    out = [0] * len(temps)
    stack = []
    for i, x in enumerate(temps):
        while stack and temps[stack[-1]] < x:
            j = stack.pop()
            out[j] = i - j
        stack.append(i)
    return out
`,
    javascript: `function daysUntilWarmer(temps) {
  const out = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();
      out[j] = i - j;
    }
    stack.push(i);
  }
  return out;
}
`,
    java: `class Solution {
    public static int[] daysUntilWarmer(int[] temps) {
        int n = temps.length;
        int[] out = new int[n];
        int[] stack = new int[n];
        int sp = 0;
        for (int i = 0; i < n; i++) {
            while (sp > 0 && temps[stack[sp - 1]] < temps[i]) {
                int j = stack[--sp];
                out[j] = i - j;
            }
            stack[sp++] = i;
        }
        return out;
    }
}
`,
    c: `int *days_until_warmer(const int *temps, int tempsLen, int *returnSize) {
    int *out = calloc(tempsLen > 0 ? tempsLen : 1, sizeof(int));
    int *stack = malloc(sizeof(int) * (tempsLen > 0 ? tempsLen : 1));
    int sp = 0;
    for (int i = 0; i < tempsLen; i++) {
        while (sp > 0 && temps[stack[sp - 1]] < temps[i]) {
            int j = stack[--sp];
            out[j] = i - j;
        }
        stack[sp++] = i;
    }
    free(stack);
    *returnSize = tempsLen;
    return out;
}
`,
    go: `package main

func daysUntilWarmer(temps []int) []int {
	out := make([]int, len(temps))
	stack := []int{}
	for i, x := range temps {
		for len(stack) > 0 && temps[stack[len(stack)-1]] < x {
			j := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			out[j] = i - j
		}
		stack = append(stack, i)
	}
	return out
}
`,
  },
});
