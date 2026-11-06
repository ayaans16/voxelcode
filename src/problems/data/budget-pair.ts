import { defineProblem, lcg, t } from "../define";

/** Reference, used to compute expected values of the generated large tests. */
function ref(prices: number[], budget: number): number {
  let i = 0;
  let j = prices.length - 1;
  let best = -1;
  while (i < j) {
    const s = prices[i]! + prices[j]!;
    if (s <= budget) {
      if (s > best) best = s;
      i++;
    } else j--;
  }
  return best;
}

const rand = lcg(11);
const bigPrices: number[] = [];
let p = 1;
for (let i = 0; i < 200_000; i++) {
  p += 1 + Math.floor(rand() * 4);
  bigPrices.push(p);
}
const bigBudget = bigPrices[bigPrices.length - 1]! + bigPrices[1000]!;

export default defineProblem({
  schemaVersion: 1,
  slug: "budget-pair",
  title: "Budget Pair",
  difficulty: "easy",
  patterns: ["two-pointers"],
  statement: `A market stall lists the price of each item, **from cheapest to dearest**.

You want to buy **exactly two different items** and spend as much as you can without going over your \`budget\`.

Return the largest total you can spend. If no pair of items fits inside the budget, return \`-1\`.`,
  constraints: [
    "2 <= prices.length <= 200 000",
    "1 <= prices[i] <= 1 000 000 000, listed in non-decreasing order",
    "1 <= budget <= 2 000 000 000",
  ],
  examples: [
    {
      input: "prices = [2, 5, 8, 12, 15], budget = 20",
      output: "20",
      explanation: "5 + 15 uses the whole budget.",
    },
    {
      input: "prices = [4, 9, 10], budget = 12",
      output: "-1",
      explanation: "The cheapest pair already costs 13.",
    },
    {
      input: "prices = [1, 1, 3, 7], budget = 8",
      output: "8",
      explanation: "1 + 7. The two ones are different items, but they only add up to 2.",
    },
  ],
  signature: {
    name: { python: "best_pair_total", javascript: "bestPairTotal" },
    params: [
      { name: "prices", type: "int[]" },
      { name: "budget", type: "int" },
    ],
    returns: "int",
  },
  starter: {
    python: `def best_pair_total(prices, budget):
    # prices is sorted from cheapest to dearest
    pass
`,
    javascript: `function bestPairTotal(prices, budget) {
  // prices is sorted from cheapest to dearest
}
`,
  },
  timeLimitMs: 1500,
  visibleTests: [
    t("basic", [[2, 5, 8, 12, 15], 20], 20),
    t("basic", [[4, 9, 10], 12], -1),
    t("basic", [[1, 1, 3, 7], 8], 8),
  ],
  hiddenTests: [
    t("basic", [[1, 2, 3, 4, 5, 6], 9], 9),
    t("basic", [[3, 3, 3, 3], 6], 6),
    t("basic", [[1, 4, 6, 10, 11], 14], 14),
    t("edge", [[5, 6], 11], 11),
    t("edge", [[5, 6], 10], -1),
    t("edge", [[1, 1], 1], -1),
    t("edge", [[7, 7, 7], 13], -1),
    t("edge", [[1, 2, 100, 200], 150], 102),
    t("edge", [[1000000000, 1000000000], 2000000000], 2000000000),
    t("large", [bigPrices, bigBudget], ref(bigPrices, bigBudget)),
    t("large", [bigPrices, 3], -1),
    t("large", [bigPrices, bigPrices[10]! + bigPrices[11]! + 1], ref(bigPrices, bigPrices[10]! + bigPrices[11]! + 1)),
  ],
  hints: [
    "Trying every pair works, but with 200 000 items that is far too many pairs. Look for what the sorted order gives you for free.",
    "Put one finger on the cheapest item and another on the dearest. What does their total tell you about which finger should move?",
    "If the total is over budget, the dearest item can never work with anything cheaper-or-equal to your left finger's item... so drop it. If it fits, remember it and try a pricier partner.",
  ],
  editorial: `## Idea

Because the prices are sorted, the pair's total moves predictably when you swap one item for a neighbour. That lets two fingers sweep the list once.

## Walkthrough

Keep \`left = 0\` and \`right = n - 1\`. Look at \`prices[left] + prices[right]\`:

- **Over budget** — \`prices[right]\` is too expensive even with the cheapest remaining partner (\`left\`), so it can never be part of a valid pair. Move \`right\` left.
- **Within budget** — this is a candidate; record the best total so far. A pricier partner for \`prices[left]\` might still fit, so move \`left\` right.

Stop when the fingers meet.

## Cost

Each step discards one item, so the loop runs at most \`n\` times: **O(n) time, O(1) extra space**. The brute-force alternative checks about n²/2 pairs.
`,
  approachCheckpoint: {
    patternOptions: ["two-pointers", "hashing", "binary-search", "dp", "stack"],
    correctPattern: "two-pointers",
    complexity: {
      time: ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)"],
      space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      correctTime: "O(n)",
      correctSpace: "O(1)",
    },
    explanation:
      "The list is already sorted, so two pointers closing in from both ends can discard one item per step. That is a single pass (O(n)) with only a few variables (O(1) space). A hash table would also work but wastes the sorted order and costs O(n) space.",
  },
  referenceSolution: {
    python: `def best_pair_total(prices, budget):
    i, j, best = 0, len(prices) - 1, -1
    while i < j:
        s = prices[i] + prices[j]
        if s <= budget:
            if s > best:
                best = s
            i += 1
        else:
            j -= 1
    return best
`,
    javascript: `function bestPairTotal(prices, budget) {
  let i = 0, j = prices.length - 1, best = -1;
  while (i < j) {
    const s = prices[i] + prices[j];
    if (s <= budget) { if (s > best) best = s; i++; }
    else j--;
  }
  return best;
}
`,
    java: `class Solution {
    public static int bestPairTotal(int[] prices, int budget) {
        int i = 0, j = prices.length - 1, best = -1;
        while (i < j) {
            long s = (long) prices[i] + prices[j];
            if (s <= budget) { if (s > best) best = (int) s; i++; }
            else j--;
        }
        return best;
    }
}
`,
    c: `int best_pair_total(const int *prices, int pricesLen, int budget) {
    int i = 0, j = pricesLen - 1;
    long long best = -1;
    while (i < j) {
        long long s = (long long)prices[i] + prices[j];
        if (s <= budget) { if (s > best) best = s; i++; }
        else j--;
    }
    return (int)best;
}
`,
    go: `package main

func bestPairTotal(prices []int, budget int) int {
	i, j, best := 0, len(prices)-1, -1
	for i < j {
		s := prices[i] + prices[j]
		if s <= budget {
			if s > best {
				best = s
			}
			i++
		} else {
			j--
		}
	}
	return best
}
`,
  },
});
