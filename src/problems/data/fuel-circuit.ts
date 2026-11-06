import { checkpoint, defineProblem, lcg, t } from "../define";

function ref(gas: number[], cost: number[]): number {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const d = gas[i]! - cost[i]!;
    total += d; tank += d;
    if (tank < 0) { start = i + 1; tank = 0; }
  }
  return total >= 0 ? start : -1;
}
const rand = lcg(24);
const N = 200_000;
const cost = Array.from({ length: N }, () => 1 + Math.floor(rand() * 100));
const gas = cost.map((c, i) => (i % 3 === 0 ? c + Math.floor(rand() * 5) : Math.max(0, c - Math.floor(rand() * 3))));
const equalG = new Array<number>(N).fill(7);
const equalC = new Array<number>(N).fill(7);
const lastWorks = Array.from({ length: N }, (_, i) => (i === N - 1 ? 2_000_000 : 0));
const lastCost = Array.from({ length: N }, (_, i) => (i === N - 1 ? 0 : 10));

export default defineProblem({
  schemaVersion: 1,
  slug: "fuel-circuit",
  title: "Fuel Circuit",
  difficulty: "medium",
  patterns: ["greedy"],
  statement: `A delivery van drives around a **circular** road with \`n\` stations numbered \`0\` to \`n - 1\`. Station \`i\` gives you \`fuel[i]\` units when you arrive, and the leg from station \`i\` to the next one costs \`cost[i]\` units. The van starts with an empty tank at the station you choose (and collects that station's fuel immediately).

Return the **smallest station number** from which the van can complete one full circle, or \`-1\` if no starting station works.`,
  constraints: ["1 <= n <= 200 000", "0 <= fuel[i] <= 2 000 000", "0 <= cost[i] <= 2 000 000"],
  examples: [
    { input: "fuel = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2]", output: "3" },
    { input: "fuel = [2, 3, 4], cost = [3, 4, 3]", output: "-1" },
    { input: "fuel = [5], cost = [4]", output: "0" },
  ],
  signature: { name: { python: "start_station", javascript: "startStation" }, params: [{ name: "fuel", type: "int[]" }, { name: "cost", type: "int[]" }], returns: "int" },
  timeLimitMs: 1500,
  visibleTests: [t("basic", [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], 3), t("basic", [[2, 3, 4], [3, 4, 3]], -1), t("basic", [[5], [4]], 0)],
  hiddenTests: [
    t("basic", [[3, 1, 1], [1, 2, 2]], 0),
    t("basic", [[2, 0, 0, 5], [1, 4, 1, 1]], 3),
    t("edge", [[1], [2]], -1),
    t("edge", [[4, 4], [4, 4]], 0),
    t("edge", [[0], [0]], 0),
    t("large", [gas, cost], ref(gas, cost)),
    t("large", [equalG, equalC], 0),
    t("large", [lastWorks, lastCost], N - 1),
  ],
  hints: [
    "Trying every start and simulating the lap is O(n^2). Look for a shortcut when a start fails.",
    "If the total fuel is less than the total cost, no start works. Otherwise a start exists.",
    "Sweep once tracking your tank. When it goes negative at station i, no station from the current start up to i can work: restart at i + 1 with an empty tank.",
  ],
  editorial: `## Idea

If the van, starting at \`s\`, first runs dry at station \`i\`, then **no** station between \`s\` and \`i\` could have succeeded either (each would have arrived at \`i\` with even less fuel). So the next candidate is \`i + 1\`.

If total fuel >= total cost, the last candidate found works. It is also the smallest valid one, since every earlier start was ruled out.

## Cost

**O(n) time, O(1) space.**
`,
  approachCheckpoint: checkpoint({ pattern: "greedy", others: ["dp", "two-pointers", "binary-search", "graphs"], time: "O(n)", space: "O(1)", why: "One sweep with a running tank and a total balance rules out whole stretches of starts at once, using two counters." }),
  referenceSolution: {
    python: `def start_station(fuel, cost):
    total = tank = start = 0
    for i in range(len(fuel)):
        d = fuel[i] - cost[i]
        total += d
        tank += d
        if tank < 0:
            start = i + 1
            tank = 0
    return start if total >= 0 else -1
`,
    javascript: `function startStation(fuel, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < fuel.length; i++) {
    const d = fuel[i] - cost[i];
    total += d; tank += d;
    if (tank < 0) { start = i + 1; tank = 0; }
  }
  return total >= 0 ? start : -1;
}
`,
  },
});
