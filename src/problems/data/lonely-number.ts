import { checkpoint, defineProblem, lcg, t } from "../define";

const rand = lcg(7);
const mk = (pairs: number, lonely: number) => {
  const a: number[] = [];
  for (let i = 0; i < pairs; i++) {
    const v = Math.floor(rand() * 2_000_000_000) - 1_000_000_000;
    a.push(v, v);
  }
  a.push(lonely);
  return a.sort(() => rand() - 0.5);
};
const big = mk(150_000, 424_242);
const big2 = mk(100_000, -999_999_999);

export default defineProblem({
  schemaVersion: 1,
  slug: "lonely-number",
  title: "The Lonely Number",
  difficulty: "easy",
  patterns: ["bits"],
  statement: `A dance floor is full of couples, and everyone holds a card with a number on it. Both partners of a couple carry the **same** number, but one person arrived alone.

Given everyone's card numbers in no particular order, return the number on the **lone** dancer's card. Aim for one pass and no extra memory that grows with the crowd.`,
  constraints: ["1 <= cards.length <= 300 001, and the length is odd", "-1 000 000 000 <= cards[i] <= 1 000 000 000", "Every number appears exactly twice, except one that appears once"],
  examples: [
    { input: "cards = [4, 1, 2, 1, 2]", output: "4" },
    { input: "cards = [7]", output: "7" },
    { input: "cards = [3, 3, 5]", output: "5" },
  ],
  signature: { name: { python: "lone_card", javascript: "loneCard" }, params: [{ name: "cards", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[4, 1, 2, 1, 2]], 4), t("basic", [[7]], 7), t("basic", [[3, 3, 5]], 5)],
  hiddenTests: [
    t("basic", [[2, 2, 1]], 1),
    t("basic", [[-1, 5, -1]], 5),
    t("edge", [[-1000000000]], -1000000000),
    t("edge", [[1000000000, 1000000000, -1000000000]], -1000000000),
    t("edge", [[0, 9, 0]], 9),
    t("large", [big], 424_242),
    t("large", [big2], -999_999_999),
  ],
  hints: [
    "A hash set that adds and removes numbers works, but there is a trick that needs no memory at all.",
    "Think about what happens when you combine a number with itself using XOR (^).",
    "XOR is order-independent and x ^ x = 0, x ^ 0 = x. XOR every card together; every couple cancels out and only the lone number is left.",
  ],
  editorial: `## Idea

The bitwise **XOR** operation has three handy properties: \`x ^ x = 0\`, \`x ^ 0 = x\`, and the order does not matter. XOR everything together and each pair cancels itself, leaving the lone value.

## Cost

One pass: **O(n) time, O(1) space**.
`,
  approachCheckpoint: checkpoint({ pattern: "bits", others: ["hashing", "sliding-window", "binary-search", "math"], time: "O(n)", space: "O(1)", why: "XOR cancels equal pairs, so a running XOR over the list leaves the lone value: one pass and a single variable." }),
  referenceSolution: {
    python: `def lone_card(cards):
    r = 0
    for x in cards:
        r ^= x
    return r
`,
    javascript: `function loneCard(cards) {
  let r = 0;
  for (const x of cards) r ^= x;
  return r;
}
`,
  },
});
