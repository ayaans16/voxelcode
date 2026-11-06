import { defineProblem, lcg, t } from "../define";

function ref(bookings: number[][]): number[][] {
  const sorted = bookings.map((b) => [...b]).sort((a, b) => a[0]! - b[0]!);
  const out: number[][] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s! <= last[1]!) last[1] = Math.max(last[1]!, e!);
    else out.push([s!, e!]);
  }
  return out;
}

const rand = lcg(15);
const randomBookings = Array.from({ length: 100_000 }, () => {
  const s = Math.floor(rand() * 5_000_000);
  return [s, s + Math.floor(rand() * 40)];
});
const sparse = Array.from({ length: 100_000 }, (_, i) => [i * 10, i * 10 + 3]).reverse();
const oneBig = [[0, 1_000_000], ...Array.from({ length: 50_000 }, (_, i) => [i * 7, i * 7 + 2])];

export default defineProblem({
  schemaVersion: 1,
  slug: "booking-merge",
  title: "Booking Merge",
  difficulty: "medium",
  patterns: ["intervals"],
  statement: `A venue records each reservation as \`[start, end]\` (whole numbers, \`start <= end\`). Reservations arrive in **no particular order**.

Two reservations **overlap** if they share at least one moment, which includes touching at an endpoint (\`[1, 4]\` and \`[4, 5]\` overlap). Overlapping reservations are combined into a single block that runs from the earliest start to the latest end.

Return the list of combined blocks, **sorted by start time**.`,
  constraints: ["1 <= bookings.length <= 100 000", "0 <= start <= end <= 10 000 000"],
  examples: [
    { input: "bookings = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" },
    { input: "bookings = [[1,4],[4,5]]", output: "[[1,5]]", explanation: "They touch at 4." },
    { input: "bookings = [[7,9],[1,2],[3,4]]", output: "[[1,2],[3,4],[7,9]]", explanation: "Input is unsorted; nothing overlaps." },
  ],
  signature: { name: { python: "merge_bookings", javascript: "mergeBookings" }, params: [{ name: "bookings", type: "int[][]" }], returns: "int[][]" },
  timeLimitMs: 2000,
  visibleTests: [
    t("basic", [[[1, 3], [2, 6], [8, 10], [15, 18]]], [[1, 6], [8, 10], [15, 18]]),
    t("basic", [[[1, 4], [4, 5]]], [[1, 5]]),
    t("basic", [[[7, 9], [1, 2], [3, 4]]], [[1, 2], [3, 4], [7, 9]]),
  ],
  hiddenTests: [
    t("basic", [[[1, 10], [2, 3], [4, 5]]], [[1, 10]]),
    t("basic", [[[5, 6], [1, 5], [6, 9]]], [[1, 9]]),
    t("edge", [[[3, 3]]], [[3, 3]]),
    t("edge", [[[2, 2], [2, 2], [2, 2]]], [[2, 2]]),
    t("edge", [[[0, 0], [1, 1]]], [[0, 0], [1, 1]]),
    t("large", [randomBookings], ref(randomBookings)),
    t("large", [sparse], ref(sparse)),
    t("large", [oneBig], [[0, 1_000_000]]),
  ],
  hints: [
    "Comparing every pair of reservations is too slow. What ordering would make overlapping reservations sit next to each other?",
    "Sort by start time. Then a reservation can only overlap the block you are currently building, never one far back.",
    "Keep the last output block. If the next reservation starts at or before that block's end, extend the end (using the larger end); otherwise start a new block.",
  ],
  editorial: `## Idea

Once reservations are sorted by start, overlaps become local: a new reservation either extends the **most recent merged block** or starts a fresh one.

## Walkthrough

1. Sort by start.
2. For each \`[s, e]\`: if there is a last block and \`s <= last.end\`, set \`last.end = max(last.end, e)\`; else append \`[s, e]\`.

## Cost

Sorting dominates: **O(n log n) time**, O(n) space for the output.
`,
  approachCheckpoint: {
    patternOptions: ["intervals", "greedy", "two-pointers", "dp", "stack"],
    correctPattern: "intervals",
    complexity: { time: ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"], space: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctTime: "O(n log n)", correctSpace: "O(n)" },
    explanation: "Sorting by start (O(n log n)) turns the problem into a single sweep that extends the last block or opens a new one. The merged list can hold up to n blocks (O(n) space).",
  },
  referenceSolution: {
    python: `def merge_bookings(bookings):
    out = []
    for s, e in sorted(bookings, key=lambda b: b[0]):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out
`,
    javascript: `function mergeBookings(bookings) {
  const sorted = bookings.map((b) => [b[0], b[1]]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}
`,
    java: `import java.util.*;

class Solution {
    public static int[][] mergeBookings(int[][] bookings) {
        int[][] c = bookings.clone();
        Arrays.sort(c, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>();
        for (int[] b : c) {
            if (!out.isEmpty() && b[0] <= out.get(out.size() - 1)[1]) {
                int[] last = out.get(out.size() - 1);
                last[1] = Math.max(last[1], b[1]);
            } else out.add(new int[] { b[0], b[1] });
        }
        return out.toArray(new int[0][]);
    }
}
`,
    c: `static int vc_cmp_rows(const void *a, const void *b) {
    const int *x = *(int *const *)a, *y = *(int *const *)b;
    return (x[0] > y[0]) - (x[0] < y[0]);
}

int **merge_bookings(int **bookings, int bookingsLen, const int *bookingsCols, int *returnSize, int **returnColumnSizes) {
    int **rows = malloc(sizeof(int *) * (bookingsLen > 0 ? bookingsLen : 1));
    for (int i = 0; i < bookingsLen; i++) rows[i] = bookings[i];
    qsort(rows, bookingsLen, sizeof(int *), vc_cmp_rows);
    int **out = malloc(sizeof(int *) * (bookingsLen > 0 ? bookingsLen : 1));
    int *cols = malloc(sizeof(int) * (bookingsLen > 0 ? bookingsLen : 1));
    int n = 0;
    for (int i = 0; i < bookingsLen; i++) {
        if (n > 0 && rows[i][0] <= out[n - 1][1]) {
            if (rows[i][1] > out[n - 1][1]) out[n - 1][1] = rows[i][1];
        } else {
            int *r = malloc(2 * sizeof(int));
            r[0] = rows[i][0];
            r[1] = rows[i][1];
            out[n] = r;
            cols[n] = 2;
            n++;
        }
    }
    free(rows);
    *returnSize = n;
    *returnColumnSizes = cols;
    return out;
}
`,
    go: `package main

import "sort"

func mergeBookings(bookings [][]int) [][]int {
	c := make([][]int, len(bookings))
	copy(c, bookings)
	sort.Slice(c, func(i, j int) bool { return c[i][0] < c[j][0] })
	out := [][]int{}
	for _, b := range c {
		if len(out) > 0 && b[0] <= out[len(out)-1][1] {
			last := out[len(out)-1]
			if b[1] > last[1] {
				last[1] = b[1]
			}
		} else {
			out = append(out, []int{b[0], b[1]})
		}
	}
	return out
}
`,
  },
});
