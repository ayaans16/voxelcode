import { checkpoint, defineProblem, t } from "../define";

function ref(tokens: string[]): number {
  const st: number[] = [];
  for (const k of tokens) {
    if (["+", "-", "*", "/"].includes(k)) {
      const b = st.pop()!, a = st.pop()!;
      st.push(k === "+" ? a + b : k === "-" ? a - b : k === "*" ? a * b : Math.trunc(a / b));
    } else st.push(Number(k));
  }
  return st[0]!;
}
const chain = ["1", ...Array.from({ length: 50_000 }, () => ["2", "+"]).flat()];
const deep = [...Array.from({ length: 50_000 }, (_, i) => String((i % 7) + 1)), ...new Array<string>(49_999).fill("+")];
const mixed = ["100000", ...Array.from({ length: 20_000 }, (_, i) => (i % 2 === 0 ? ["3", "-"] : ["1", "+"])).flat()];

export default defineProblem({
  schemaVersion: 1,
  slug: "tape-calculator",
  title: "Tape Calculator",
  difficulty: "medium",
  patterns: ["stack"],
  statement: `An old shop calculator reads a paper tape in **postfix** order: the numbers come first and the operator comes **after** the two numbers it applies to. For example \`2 3 +\` means 2 + 3, and \`2 1 + 3 *\` means (2 + 1) * 3.

The tape is given as a list of text tokens. Each token is either an integer (possibly negative, like \`"-11"\`) or one of the operators \`"+"\`, \`"-"\`, \`"*"\`, \`"/"\`. Division **truncates toward zero** (7 / 2 = 3 and -7 / 2 = -3). The tape is always valid, never divides by zero, and every intermediate result fits in a 32-bit signed integer.

Return the value of the tape.`,
  constraints: ["1 <= tape.length <= 100 001", "Tokens are integers in [-10 000, 10 000] or one of + - * /"],
  examples: [
    { input: 'tape = ["2", "1", "+", "3", "*"]', output: "9" },
    { input: 'tape = ["4", "13", "5", "/", "+"]', output: "6", explanation: "13 / 5 = 2, then 4 + 2." },
    { input: 'tape = ["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]', output: "22" },
  ],
  signature: { name: { python: "eval_tape", javascript: "evalTape" }, params: [{ name: "tape", type: "string[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [
    t("basic", [["2", "1", "+", "3", "*"]], 9),
    t("basic", [["4", "13", "5", "/", "+"]], 6),
    t("basic", [["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]], 22),
  ],
  hiddenTests: [
    t("basic", [["3", "4", "-"]], -1),
    t("basic", [["7", "-2", "/"]], -3),
    t("basic", [["-7", "2", "/"]], -3),
    t("edge", [["42"]], 42),
    t("edge", [["0", "5", "*"]], 0),
    t("edge", [["1", "2", "3", "4", "+", "+", "+"]], 10),
    t("large", [chain], ref(chain)),
    t("large", [deep], ref(deep)),
    t("large", [mixed], ref(mixed)),
  ],
  hints: [
    "Postfix order means each operator acts on the two most recent results. What structure remembers 'most recent first'?",
    "Push numbers on a stack. When you meet an operator, pop two numbers, apply it, and push the result.",
    "Mind the order for - and /: the first popped value is the RIGHT operand. Division must truncate toward zero (not floor).",
  ],
  editorial: `## Idea

Postfix notation needs no parentheses: each operator consumes the **two most recent** values, which is exactly what a **stack** gives you.

## Walkthrough

Number: push. Operator: \`b = pop(); a = pop(); push(a op b)\`. Return the single value left. For division use truncation toward zero (\`Math.trunc\`; in Python avoid \`//\`, which floors).

## Cost

**O(n) time, O(n) space.**
`,
  approachCheckpoint: checkpoint({ pattern: "stack", others: ["two-pointers", "dp", "trees", "greedy"], time: "O(n)", space: "O(n)", why: "Each token is handled once. A long run of numbers before any operator can leave up to n values on the stack." }),
  referenceSolution: {
    python: `def eval_tape(tape):
    st = []
    for k in tape:
        if k in ('+', '-', '*', '/'):
            b = st.pop()
            a = st.pop()
            if k == '+':
                st.append(a + b)
            elif k == '-':
                st.append(a - b)
            elif k == '*':
                st.append(a * b)
            else:
                q = abs(a) // abs(b)
                st.append(q if (a < 0) == (b < 0) else -q)
        else:
            st.append(int(k))
    return st[0]
`,
    javascript: `function evalTape(tape) {
  const st = [];
  for (const k of tape) {
    if (k === '+' || k === '-' || k === '*' || k === '/') {
      const b = st.pop(), a = st.pop();
      st.push(k === '+' ? a + b : k === '-' ? a - b : k === '*' ? a * b : Math.trunc(a / b));
    } else st.push(Number(k));
  }
  return st[0];
}
`,
  },
});
