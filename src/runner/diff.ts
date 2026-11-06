export type DiffOp = { kind: "same" | "add" | "del"; line: string };

/**
 * Line diff between expected and actual (LCS). Inputs are abridged by
 * formatValue so they are small; a hard cap keeps worst cases cheap.
 */
export function lineDiff(expected: string, actual: string): DiffOp[] {
  const a = expected.split("\n").slice(0, 400);
  const b = actual.split("\n").slice(0, 400);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", line: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: "del", line: a[i]! });
      i++;
    } else {
      out.push({ kind: "add", line: b[j]! });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", line: a[i++]! });
  while (j < m) out.push({ kind: "add", line: b[j++]! });
  return out;
}
