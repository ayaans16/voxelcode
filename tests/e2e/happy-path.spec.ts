import { expect, test } from "@playwright/test";
import { BUDGET_PAIR_JS, progressPercent, resetData, setEditorCode } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetData(page);
});

test("opening a problem plants a seed, and a passing Run grows the tree", async ({ page }) => {
  await page.goto("/problems");
  await page.getByRole("link", { name: /Budget Pair/ }).click();
  await expect(page.getByRole("heading", { name: "Budget Pair" })).toBeVisible();

  // The seed: +5% just for opening the problem.
  await expect.poll(() => progressPercent(page)).toBe(5);

  await setEditorCode(page, BUDGET_PAIR_JS);
  await page.keyboard.press("Control+Enter"); // Cmd/Ctrl+Enter runs the visible tests
  await page.getByRole("button", { name: /Run/ }).click();
  await expect(page.getByText("3 / 3 passed")).toBeVisible();

  // Visible tests are worth up to +35%: 5% + 35% = 40%.
  await expect.poll(() => progressPercent(page)).toBe(40);
});

test("submitting a correct solution completes the tree and plants it in the forest", async ({ page }) => {
  await page.goto("/problems/budget-pair");
  await setEditorCode(page, BUDGET_PAIR_JS);
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("All hidden tests passed.")).toBeVisible();
  await expect.poll(() => progressPercent(page)).toBe(100);
  await expect(page.getByText("Solved", { exact: true })).toBeVisible();

  // The roadmap now shows the solved state...
  await page.goto("/problems");
  await expect(page.getByText(/1 \/ \d+ trees grown/)).toBeVisible();

  // ...and the forest has a tree for it.
  await page.goto("/forest");
  await expect(page.getByRole("button", { name: /Budget Pair/ })).toBeVisible();
  await expect(page.getByText(/^1 \/ \d+$/).first()).toBeVisible();
});

test("an infinite loop is stopped with a clear message and never shrinks the tree", async ({ page }) => {
  await page.goto("/problems/budget-pair");
  await setEditorCode(page, BUDGET_PAIR_JS);
  await page.getByRole("button", { name: /Run/ }).click();
  await expect(page.getByText("3 / 3 passed")).toBeVisible();
  await expect.poll(() => progressPercent(page)).toBe(40);

  await setEditorCode(page, "function bestPairTotal(prices, budget) { while (true) {} }");
  await page.getByRole("button", { name: /Run/ }).click();
  await expect(page.getByText(/Time limit exceeded/).first()).toBeVisible({ timeout: 30_000 });

  // The page stays responsive and the tree keeps everything it grew.
  expect(await progressPercent(page)).toBe(40);

  // And a fixed solution still works afterwards (a fresh worker is spawned).
  await setEditorCode(page, BUDGET_PAIR_JS);
  await page.getByRole("button", { name: /Run/ }).click();
  await expect(page.getByText("3 / 3 passed")).toBeVisible();
});

const SOLUTIONS: Record<"java" | "c" | "go", string> = {
  java: `class Solution {
    public static int bestPairTotal(int[] prices, int budget) {
        int i = 0, j = prices.length - 1, best = -1;
        while (i < j) { long s = (long) prices[i] + prices[j]; if (s <= budget) { if (s > best) best = (int) s; i++; } else j--; }
        return best;
    }
}`,
  c: `int best_pair_total(const int *prices, int pricesLen, int budget) {
    int i = 0, j = pricesLen - 1; long long best = -1;
    while (i < j) { long long s = (long long)prices[i] + prices[j]; if (s <= budget) { if (s > best) best = s; i++; } else j--; }
    return (int)best;
}`,
  go: `package main

func bestPairTotal(prices []int, budget int) int {
	i, j, best := 0, len(prices)-1, -1
	for i < j {
		s := prices[i] + prices[j]
		if s <= budget { if s > best { best = s }; i++ } else { j-- }
	}
	return best
}`,
};

test("Java, C and Go compile on the local server and grow the tree", async ({ page, request }) => {
  const rt = await (await request.get("/api/runtimes")).json();
  test.skip(!rt.enabled, "compile server disabled");
  await page.goto("/problems/budget-pair");
  await expect.poll(() => progressPercent(page)).toBe(5);
  for (const lang of ["c", "go", "java"] as const) {
    test.skip(!rt.runtimes[lang].available, `${lang} toolchain not installed`);
    await page.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: new RegExp(`^${lang === "c" ? "C" : lang === "go" ? "Go" : "Java"}\\b`) }).first().click();
    await setEditorCode(page, SOLUTIONS[lang]);
    await page.getByRole("button", { name: /Run/ }).click();
    await expect(page.getByText("3 / 3 passed")).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => progressPercent(page)).toBe(40);
  }
});
