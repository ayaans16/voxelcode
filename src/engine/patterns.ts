/** The pattern vocabulary shared by problems, species and the roadmap. */
export const PATTERNS = [
  { id: "arrays", label: "Arrays" },
  { id: "hashing", label: "Hashing" },
  { id: "two-pointers", label: "Two Pointers" },
  { id: "sliding-window", label: "Sliding Window" },
  { id: "stack", label: "Stack" },
  { id: "heap", label: "Heap" },
  { id: "binary-search", label: "Binary Search" },
  { id: "trees", label: "Trees" },
  { id: "graphs", label: "Graphs" },
  { id: "dp", label: "Dynamic Programming" },
  { id: "greedy", label: "Greedy" },
  { id: "intervals", label: "Intervals" },
  { id: "backtracking", label: "Backtracking" },
  { id: "bits", label: "Bit Tricks" },
  { id: "math", label: "Math" },
] as const;

export type PatternId = (typeof PATTERNS)[number]["id"];

export const PATTERN_IDS = PATTERNS.map((p) => p.id) as unknown as readonly [PatternId, ...PatternId[]];

export function patternLabel(id: string): string {
  return PATTERNS.find((p) => p.id === id)?.label ?? id;
}
