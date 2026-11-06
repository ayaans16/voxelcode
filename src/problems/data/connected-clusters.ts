import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(n: number, links: number[][]): number {
  const p = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => { while (p[x] !== x) { p[x] = p[p[x]!]!; x = p[x]!; } return x; };
  let c = n;
  for (const [a, b] of links) { const ra = find(a!), rb = find(b!); if (ra !== rb) { p[ra] = rb; c--; } }
  return c;
}
const rand = lcg(29);
const N = 100_000;
const sparse = Array.from({ length: 60_000 }, () => [Math.floor(rand() * N), Math.floor(rand() * N)]);
const chain = Array.from({ length: N - 1 }, (_, i) => [i, i + 1]);
const pairs = Array.from({ length: N / 2 }, (_, i) => [2 * i, 2 * i + 1]);

export default defineProblem({
  schemaVersion: 1,
  slug: "connected-clusters",
  title: "Friend Clusters",
  difficulty: "medium",
  patterns: ["graphs"],
  statement: `A social app has \`n\` users numbered \`0\` to \`n - 1\`. Each entry of \`friendships\` is a pair \`[a, b]\` meaning users \`a\` and \`b\` are friends (friendship goes both ways).

A **cluster** is a group of users who are connected through chains of friends (friends of friends of friends...). Everyone in a cluster can reach everyone else, and nobody reaches users outside it. A user with no friends is a cluster of one.

Return the number of clusters.`,
  constraints: ["1 <= n <= 100 000", "0 <= friendships.length <= 150 000", "0 <= a, b < n; repeats and self-links are allowed"],
  examples: [
    { input: "n = 5, friendships = [[0,1],[1,2],[3,4]]", output: "2" },
    { input: "n = 4, friendships = []", output: "4" },
    { input: "n = 1, friendships = []", output: "1" },
  ],
  signature: { name: { python: "count_clusters", javascript: "countClusters" }, params: [{ name: "n", type: "int" }, { name: "friendships", type: "int[][]" }], returns: "int" },
  timeLimitMs: 2000,
  visibleTests: [t("basic", [5, [[0, 1], [1, 2], [3, 4]]], 2), t("basic", [4, []], 4), t("basic", [1, []], 1)],
  hiddenTests: [
    t("basic", [6, [[0, 1], [2, 3], [4, 5], [1, 2]]], 2),
    t("basic", [3, [[0, 1], [1, 2], [2, 0]]], 1),
    t("edge", [2, [[0, 0], [1, 1]]], 2),
    t("edge", [3, [[0, 1], [0, 1], [1, 0]]], 2),
    t("edge", [1, [[0, 0]]], 1),
    t("large", [N, sparse], ref(N, sparse)),
    t("large", [N, chain], 1),
    t("large", [N, pairs], N / 2),
  ],
  hints: [
    "Start with every user in their own cluster. Each friendship may merge two clusters.",
    "You need a fast way to ask 'are these two users already in the same cluster?' and to merge clusters.",
    "Union-find (disjoint sets) with path compression does both in near-constant time. Count how many merges actually happen and subtract from n. A BFS/DFS flood fill also works.",
  ],
  editorial: `## Idea

Treat users as nodes: clusters are **connected components**. With **union-find**, start with \`n\` components and decrement each time a friendship joins two different roots.

## Cost

Near-linear: **O((n + m) * alpha(n))** time, O(n) space. A BFS over adjacency lists is O(n + m).
`,
  approachCheckpoint: checkpoint({ pattern: "graphs", others: ["trees", "dp", "hashing", "greedy"], time: "O(n)", space: "O(n)", why: "Union-find processes each friendship in almost constant amortised time, so the work is linear up to the inverse-Ackermann factor; the parent array takes O(n)." }),
  referenceSolution: {
    python: `def count_clusters(n, friendships):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    count = n
    for a, b in friendships:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            count -= 1
    return count
`,
    javascript: `function countClusters(n, friendships) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  let count = n;
  for (const [a, b] of friendships) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) { parent[ra] = rb; count--; }
  }
  return count;
}
`,
  },
});
