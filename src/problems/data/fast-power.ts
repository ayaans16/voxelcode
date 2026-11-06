import { checkpoint, defineProblem, t } from "../define";

function ref(base: number, exp: number, mod: number): number {
  let r = 1 % mod, b = base % mod, e = exp;
  while (e > 0) {
    if (e % 2 === 1) r = (r * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return r;
}

export default defineProblem({
  schemaVersion: 1,
  slug: "fast-power",
  title: "Fast Power",
  difficulty: "medium",
  patterns: ["math"],
  statement: `Compute \`base\` raised to the power \`exp\`, then take the **remainder when divided by \`mod\`**. The true value is astronomically large, so you must not multiply \`exp\` times; work with remainders along the way.

Return \`(base ^ exp) % mod\`. (\`base ^ 0\` is \`1\`, and anything modulo \`1\` is \`0\`.)`,
  constraints: ["0 <= base < mod", "0 <= exp <= 2 000 000 000", "1 <= mod <= 90 000 000 (so products of two remainders stay exact)"],
  examples: [
    { input: "base = 2, exp = 10, mod = 1000", output: "24", explanation: "2^10 = 1024, and 1024 % 1000 = 24." },
    { input: "base = 3, exp = 0, mod = 7", output: "1" },
    { input: "base = 5, exp = 3, mod = 13", output: "8", explanation: "125 % 13 = 8." },
  ],
  signature: { name: { python: "power_mod", javascript: "powerMod" }, params: [{ name: "base", type: "int" }, { name: "exp", type: "int" }, { name: "mod", type: "int" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [2, 10, 1000], 24), t("basic", [3, 0, 7], 1), t("basic", [5, 3, 13], 8)],
  hiddenTests: [
    t("basic", [7, 2, 5], 4),
    t("basic", [10, 9, 13], ref(10, 9, 13)),
    t("edge", [0, 0, 5], 1),
    t("edge", [4, 5, 1], 0),
    t("edge", [0, 7, 9], 0),
    t("large", [2, 2_000_000_000, 89_999_999], ref(2, 2_000_000_000, 89_999_999)),
    t("large", [123_456, 1_999_999_999, 87_654_321], ref(123_456, 1_999_999_999, 87_654_321)),
    t("large", [89_999_998, 2_000_000_000, 90_000_000], ref(89_999_998, 2_000_000_000, 90_000_000)),
  ],
  hints: [
    "Multiplying base by itself exp times is hopeless for exp = 2 billion. How could you use fewer multiplications?",
    "Squaring doubles the exponent: base^(2k) = (base^k)^2. So you can build the result from the binary digits of exp.",
    "Loop while exp > 0: if exp is odd, multiply the result by the current base; then square the base and halve exp. Take % mod after every multiplication.",
  ],
  editorial: `## Idea

**Exponentiation by squaring** uses the binary representation of the exponent: square the base each step, and multiply it into the result whenever the current bit is 1. Reduce with \`% mod\` at every step so numbers never grow.

## Cost

**O(log exp) time, O(1) space.** The naive loop is O(exp), about two billion steps here.
`,
  approachCheckpoint: checkpoint({ pattern: "math", others: ["dp", "binary-search", "bits", "greedy"], time: "O(log n)", space: "O(1)", why: "Halving the exponent each iteration takes about log2(exp) steps, using only a few variables." }),
  referenceSolution: {
    python: `def power_mod(base, exp, mod):
    result = 1 % mod
    b = base % mod
    while exp > 0:
        if exp % 2 == 1:
            result = (result * b) % mod
        b = (b * b) % mod
        exp //= 2
    return result
`,
    javascript: `function powerMod(base, exp, mod) {
  let result = 1 % mod, b = base % mod, e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}
`,
  },
});
