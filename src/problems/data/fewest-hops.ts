import { defineProblem, lcg, t } from "../define";

function ref(n: number, links: number[][], start: number, goal: number): number {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of links) {
    adj[a!]!.push(b!);
    adj[b!]!.push(a!);
  }
  const dist = new Int32Array(n).fill(-1);
  dist[start] = 0;
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const u = q[i]!;
    if (u === goal) return dist[u]!;
    for (const v of adj[u]!) {
      if (dist[v] === -1) {
        dist[v] = dist[u]! + 1;
        q.push(v);
      }
    }
  }
  return -1;
}

const rand = lcg(9);
const N = 100_000;
const pathLinks = Array.from({ length: N - 1 }, (_, i) => [i, i + 1]);
const randomLinks: number[][] = [];
for (let i = 1; i < N; i++) randomLinks.push([i, Math.floor(rand() * i)]);
for (let i = 0; i < 50_000; i++) randomLinks.push([Math.floor(rand() * N), Math.floor(rand() * N)].map((x) => x) as number[]);
const twoIslands = [...pathLinks.slice(0, 40_000), ...pathLinks.slice(60_000)];

export default defineProblem({
  schemaVersion: 1,
  slug: "fewest-hops",
  title: "Fewest Hops",
  difficulty: "medium",
  patterns: ["graphs"],
  statement: `A network has \`n\` stations numbered \`0\` to \`n - 1\`. Each entry of \`links\` is a pair \`[a, b]\` meaning stations \`a\` and \`b\` are joined by a two-way cable.

A message hops from station to station along cables. Return the **smallest number of hops** needed to get from \`start\` to \`goal\`, or \`-1\` if there is no route.`,
  constraints: ["1 <= n <= 100 000", "0 <= links.length <= 150 000", "0 <= start, goal < n", "Links may repeat or connect a station to itself"],
  examples: [
    { input: "n = 5, links = [[0,1],[1,2],[0,3],[3,4],[4,2]], start = 0, goal = 2", output: "2", explanation: "0 -> 1 -> 2." },
    { input: "n = 4, links = [[0,1],[2,3]], start = 0, goal = 3", output: "-1" },
    { input: "n = 3, links = [[0,1]], start = 2, goal = 2", output: "0" },
  ],
  signature: {
    name: { python: "fewest_hops", javascript: "fewestHops" },
    params: [{ name: "n", type: "int" }, { name: "links", type: "int[][]" }, { name: "start", type: "int" }, { name: "goal", type: "int" }],
    returns: "int",
  },
  timeLimitMs: 2000,
  visibleTests: [
    t("basic", [5, [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2]], 0, 2], 2),
    t("basic", [4, [[0, 1], [2, 3]], 0, 3], -1),
    t("basic", [3, [[0, 1]], 2, 2], 0),
  ],
  hiddenTests: [
    t("basic", [6, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]], 0, 5], 4),
    t("basic", [4, [[0, 1], [1, 2], [2, 3], [0, 3]], 0, 2], 2),
    t("edge", [1, [], 0, 0], 0),
    t("edge", [2, [], 0, 1], -1),
    t("edge", [3, [[1, 1], [0, 1], [0, 1]], 0, 1], 1),
    t("large", [N, pathLinks, 0, N - 1], N - 1),
    t("large", [N, randomLinks, 0, N - 1], ref(N, randomLinks, 0, N - 1)),
    t("large", [N, randomLinks, 5, 99_000], ref(N, randomLinks, 5, 99_000)),
    t("large", [N, twoIslands, 0, N - 1], -1),
  ],
  hints: [
    "Think of stations as nodes and cables as edges. You want the shortest route in a graph where every edge costs the same.",
    "Explore outward from `start` in rings: first everything one hop away, then everything two hops away, and so on.",
    "That is a breadth-first search with a queue and a `distance` array initialised to -1. The first time you reach a station, that distance is the shortest.",
  ],
  editorial: `## Idea

In an unweighted graph, **breadth-first search** visits nodes in increasing order of distance, so the first time it reaches \`goal\` it has found the shortest route.

## Walkthrough

1. Build an adjacency list (add each link in both directions).
2. \`dist[start] = 0\`; push \`start\` on a queue.
3. Pop a station; for each neighbour not yet reached, set \`dist = dist[u] + 1\` and enqueue it.
4. Return \`dist[goal]\` (still \`-1\` if unreachable).

## Cost

Each station and cable is processed once: **O(n + m) time and space**.
`,
  approachCheckpoint: {
    patternOptions: ["graphs", "dp", "greedy", "trees", "binary-search"],
    correctPattern: "graphs",
    complexity: { time: ["O(n)", "O(n + m)", "O(n * m)", "O(n^2 * m)"], space: ["O(1)", "O(n)", "O(n + m)", "O(n * m)"], correctTime: "O(n + m)", correctSpace: "O(n + m)" },
    explanation: "BFS on an adjacency list touches every node and edge once (O(n + m)) and stores the graph plus a queue and distances (O(n + m)).",
  },
  referenceSolution: {
    python: `from collections import deque

def fewest_hops(n, links, start, goal):
    adj = [[] for _ in range(n)]
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    dist = [-1] * n
    dist[start] = 0
    q = deque([start])
    while q:
        u = q.popleft()
        if u == goal:
            return dist[u]
        for v in adj[u]:
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                q.append(v)
    return -1
`,
    javascript: `function fewestHops(n, links, start, goal) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of links) { adj[a].push(b); adj[b].push(a); }
  const dist = new Array(n).fill(-1);
  dist[start] = 0;
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    if (u === goal) return dist[u];
    for (const v of adj[u]) {
      if (dist[v] === -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
  }
  return -1;
}
`,
    java: `class Solution {
    public static int fewestHops(int n, int[][] links, int start, int goal) {
        int m = links.length;
        int[] head = new int[n], nxt = new int[2 * m], to = new int[2 * m];
        java.util.Arrays.fill(head, -1);
        int e = 0;
        for (int[] l : links) {
            to[e] = l[1]; nxt[e] = head[l[0]]; head[l[0]] = e++;
            to[e] = l[0]; nxt[e] = head[l[1]]; head[l[1]] = e++;
        }
        int[] dist = new int[n];
        java.util.Arrays.fill(dist, -1);
        int[] q = new int[n];
        int qh = 0, qt = 0;
        dist[start] = 0;
        q[qt++] = start;
        while (qh < qt) {
            int u = q[qh++];
            if (u == goal) return dist[u];
            for (int k = head[u]; k != -1; k = nxt[k]) {
                int v = to[k];
                if (dist[v] == -1) { dist[v] = dist[u] + 1; q[qt++] = v; }
            }
        }
        return -1;
    }
}
`,
    c: `int fewest_hops(int n, int **links, int linksLen, const int *linksCols, int start, int goal) {
    int *head = malloc(sizeof(int) * n), *nxt = malloc(sizeof(int) * (2 * linksLen + 1)), *to = malloc(sizeof(int) * (2 * linksLen + 1));
    for (int i = 0; i < n; i++) head[i] = -1;
    int e = 0;
    for (int i = 0; i < linksLen; i++) {
        int a = links[i][0], b = links[i][1];
        to[e] = b; nxt[e] = head[a]; head[a] = e++;
        to[e] = a; nxt[e] = head[b]; head[b] = e++;
    }
    int *dist = malloc(sizeof(int) * n), *q = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) dist[i] = -1;
    int qh = 0, qt = 0, ans = -1;
    dist[start] = 0;
    q[qt++] = start;
    while (qh < qt) {
        int u = q[qh++];
        if (u == goal) { ans = dist[u]; break; }
        for (int k = head[u]; k != -1; k = nxt[k]) {
            int v = to[k];
            if (dist[v] == -1) { dist[v] = dist[u] + 1; q[qt++] = v; }
        }
    }
    free(head); free(nxt); free(to); free(dist); free(q);
    return ans;
}
`,
    go: `package main

func fewestHops(n int, links [][]int, start int, goal int) int {
	adj := make([][]int, n)
	for _, l := range links {
		adj[l[0]] = append(adj[l[0]], l[1])
		adj[l[1]] = append(adj[l[1]], l[0])
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[start] = 0
	q := []int{start}
	for i := 0; i < len(q); i++ {
		u := q[i]
		if u == goal {
			return dist[u]
		}
		for _, v := range adj[u] {
			if dist[v] == -1 {
				dist[v] = dist[u] + 1
				q = append(q, v)
			}
		}
	}
	return -1
}
`,
  },
});
