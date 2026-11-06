import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(n: number, pre: number[][]): boolean {
  const indeg = new Int32Array(n);
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of pre) { adj[b!]!.push(a!); indeg[a!]!++; }
  const q: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  let seen = 0;
  for (let h = 0; h < q.length; h++) {
    seen++;
    for (const v of adj[q[h]!]!) if (--indeg[v]! === 0) q.push(v);
  }
  return seen === n;
}
const rand = lcg(17);
const N = 100_000;
const chain = Array.from({ length: N - 1 }, (_, i) => [i + 1, i]);
const cycle = [...chain, [0, N - 1]];
const dag: number[][] = [];
for (let i = 1; i < N; i++) { dag.push([i, Math.floor(rand() * i)]); if (rand() < 0.5) dag.push([i, Math.floor(rand() * i)]); }
const dagWithBack = [...dag, [0, N - 1]];

export default defineProblem({
  schemaVersion: 1,
  slug: "course-order",
  title: "Course Order",
  difficulty: "medium",
  patterns: ["graphs"],
  statement: `A school offers \`n\` courses numbered \`0\` to \`n - 1\`. Each entry of \`prerequisites\` is a pair \`[a, b]\` meaning **you must finish course \`b\` before you can start course \`a\`**.

Return \`true\` if it is possible to finish **all** courses in some order, or \`false\` if the requirements contradict each other (for example, two courses that each require the other).`,
  constraints: ["1 <= n <= 100 000", "0 <= prerequisites.length <= 200 000", "0 <= a, b < n, a != b"],
  examples: [
    { input: "n = 2, prerequisites = [[1, 0]]", output: "true", explanation: "Take 0, then 1." },
    { input: "n = 2, prerequisites = [[1, 0], [0, 1]]", output: "false" },
    { input: "n = 3, prerequisites = []", output: "true" },
  ],
  signature: { name: { python: "can_finish_all", javascript: "canFinishAll" }, params: [{ name: "n", type: "int" }, { name: "prerequisites", type: "int[][]" }], returns: "bool" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [2, [[1, 0]]], true), t("basic", [2, [[1, 0], [0, 1]]], false), t("basic", [3, []], true)],
  hiddenTests: [
    t("basic", [4, [[1, 0], [2, 1], [3, 2]]], true),
    t("basic", [3, [[0, 1], [1, 2], [2, 0]]], false),
    t("basic", [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], true),
    t("edge", [1, []], true),
    t("edge", [2, [[1, 0], [1, 0]]], true),
    t("edge", [5, [[1, 0], [2, 1], [1, 2]]], false),
    t("large", [N, chain], true),
    t("large", [N, cycle], false),
    t("large", [N, dag], ref(N, dag)),
    t("large", [N, dagWithBack], ref(N, dagWithBack)),
  ],
  hints: [
    "Draw an arrow from each course to the courses that depend on it. When is it impossible to finish everything?",
    "It is impossible exactly when the arrows form a cycle. A course with no unmet requirements can always be taken first.",
    "Repeatedly take courses that currently have zero unmet prerequisites (a queue), 'completing' them to reduce their dependents' counts. If you take all n courses, there was no cycle.",
  ],
  editorial: `## Idea

This is **cycle detection in a directed graph**. Kahn's algorithm (topological sort) repeatedly removes nodes with in-degree 0; if every node is removed there was no cycle.

## Cost

**O(n + m) time and space.**
`,
  approachCheckpoint: checkpoint({ pattern: "graphs", others: ["dp", "trees", "greedy", "stack"], time: "O(n + m)", space: "O(n + m)", why: "Each course and each requirement is processed once while peeling off zero-in-degree courses; the adjacency lists and counters take O(n + m) memory." }),
  referenceSolution: {
    python: `from collections import deque

def can_finish_all(n, prerequisites):
    indeg = [0] * n
    adj = [[] for _ in range(n)]
    for a, b in prerequisites:
        adj[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    seen = 0
    while q:
        u = q.popleft()
        seen += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return seen == n
`,
    javascript: `function canFinishAll(n, prerequisites) {
  const indeg = new Array(n).fill(0);
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of prerequisites) { adj[b].push(a); indeg[a]++; }
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  let seen = 0;
  for (let h = 0; h < q.length; h++) {
    seen++;
    for (const v of adj[q[h]]) if (--indeg[v] === 0) q.push(v);
  }
  return seen === n;
}
`,
  },
});
