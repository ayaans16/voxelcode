import { defineProblem, t } from "../define";

const deep = "(".repeat(100_000) + ")".repeat(100_000);
const deepMixed = "[{(".repeat(30_000) + ")}]".repeat(30_000);
const deepBad = "(".repeat(100_000) + "]" + ")".repeat(99_999);
const longOk = "(a[b]{c})".repeat(20_000);

export default defineProblem({
  schemaVersion: 1,
  slug: "bracket-bookkeeper",
  title: "Bracket Bookkeeper",
  difficulty: "easy",
  patterns: ["stack"],
  statement: `A line of text may contain three kinds of brackets: \`( )\`, \`[ ]\` and \`{ }\`. All other characters are noise and should be ignored.

The brackets are **balanced** when every opener is closed by the matching closer, and closers come in the right order: the most recently opened bracket must be the next one closed.

Return \`true\` if the text is balanced, otherwise \`false\`. A text with no brackets is balanced.`,
  constraints: ["0 <= text.length <= 200 000", "text may contain any printable characters"],
  examples: [
    { input: 'text = "{[a+b]*(c)}"', output: "true" },
    { input: 'text = "(]"', output: "false", explanation: "The ( is closed by the wrong kind of bracket." },
    { input: 'text = "(("', output: "false", explanation: "Two openers are never closed." },
  ],
  signature: { name: { python: "is_balanced", javascript: "isBalanced" }, params: [{ name: "text", type: "string" }], returns: "bool" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", ["{[a+b]*(c)}"], true), t("basic", ["(]"], false), t("basic", ["(("], false)],
  hiddenTests: [
    t("basic", ["([]{})"], true),
    t("basic", ["([)]"], false),
    t("basic", ["a(b)c[d]e{f}"], true),
    t("edge", [""], true),
    t("edge", ["no brackets here"], true),
    t("edge", [")"], false),
    t("edge", ["]["], false),
    t("large", [deep], true),
    t("large", [deepMixed], true),
    t("large", [deepBad], false),
    t("large", [longOk], true),
  ],
  hints: [
    "Think about what you need to remember while reading left to right: the openers that are still waiting for a closer.",
    "The most recent unmatched opener is always the one that must close first. Which simple structure gives you 'most recent first'?",
    "Push each opener on a stack. For a closer, the top of the stack must be its matching opener (pop it), otherwise the text is unbalanced. At the end the stack must be empty.",
  ],
  editorial: `## Idea

Matching brackets nest like boxes inside boxes, so the **last opened** bracket must be the **first closed**: that is a stack (last in, first out).

## Walkthrough

- Opener: push it.
- Closer: if the stack is empty or its top is not the matching opener, return \`false\`; otherwise pop.
- Other characters: skip.
- At the end return whether the stack is empty (leftover openers mean unbalanced).

## Cost

**O(n) time**, and the stack holds at most n openers: **O(n) space**.
`,
  approachCheckpoint: {
    patternOptions: ["stack", "two-pointers", "hashing", "greedy", "dp"],
    correctPattern: "stack",
    complexity: { time: ["O(1)", "O(n)", "O(n log n)", "O(n^2)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n)", correctSpace: "O(n)" },
    explanation: "Nested structure with last-opened-first-closed behaviour is the textbook case for a stack. One pass is O(n); in the worst case (all openers) the stack holds n items.",
  },
  referenceSolution: {
    python: `def is_balanced(text):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in text:
        if ch in '([{':
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return not stack
`,
    javascript: `function isBalanced(text) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of text) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (pairs[ch] !== undefined) {
      if (stack.length === 0 || stack[stack.length - 1] !== pairs[ch]) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}
`,
    java: `class Solution {
    public static boolean isBalanced(String text) {
        char[] st = new char[text.length()];
        int top = 0;
        for (int k = 0; k < text.length(); k++) {
            char c = text.charAt(k);
            if (c == '(' || c == '[' || c == '{') st[top++] = c;
            else if (c == ')' || c == ']' || c == '}') {
                if (top == 0) return false;
                char o = st[--top];
                if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
            }
        }
        return top == 0;
    }
}
`,
    c: `bool is_balanced(const char *text) {
    size_t n = strlen(text);
    char *st = malloc(n + 1);
    size_t top = 0;
    for (size_t k = 0; k < n; k++) {
        char c = text[k];
        if (c == '(' || c == '[' || c == '{') st[top++] = c;
        else if (c == ')' || c == ']' || c == '}') {
            if (top == 0) { free(st); return false; }
            char o = st[--top];
            if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) { free(st); return false; }
        }
    }
    free(st);
    return top == 0;
}
`,
    go: `package main

func isBalanced(text string) bool {
	stack := []byte{}
	for i := 0; i < len(text); i++ {
		c := text[i]
		switch c {
		case '(', '[', '{':
			stack = append(stack, c)
		case ')', ']', '}':
			if len(stack) == 0 {
				return false
			}
			o := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			if (c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{') {
				return false
			}
		}
	}
	return len(stack) == 0
}
`,
  },
});
