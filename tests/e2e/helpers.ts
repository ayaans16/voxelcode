import type { Page } from "@playwright/test";

export const BUDGET_PAIR_JS = `function bestPairTotal(prices, budget) {
  let i = 0, j = prices.length - 1, best = -1;
  while (i < j) {
    const s = prices[i] + prices[j];
    if (s <= budget) { if (s > best) best = s; i++; }
    else j--;
  }
  return best;
}`;

/** Replaces the code in the (Monaco) editor for the current language. */
export async function setEditorCode(page: Page, code: string) {
  await page.waitForFunction(() => {
    const m = (window as unknown as { monaco?: { editor: { getModels(): unknown[] } } }).monaco;
    return !!m && m.editor.getModels().length > 0;
  });
  await page.evaluate((value) => {
    const m = (window as unknown as { monaco: { editor: { getModels(): { setValue(v: string): void }[] } } }).monaco;
    const models = m.editor.getModels();
    // Monaco keeps one model per file; the newest one belongs to the language currently shown.
    models[models.length - 1]!.setValue(value);
  }, code);
}

export async function progressPercent(page: Page): Promise<number> {
  const v = await page.getByRole("progressbar", { name: "Growth progress" }).getAttribute("aria-valuenow");
  return Number(v);
}

/** Wipes IndexedDB so each test starts from an empty forest. */
export async function resetData(page: Page) {
  await page.goto("/settings");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("voxelcode");
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      }),
  );
}
