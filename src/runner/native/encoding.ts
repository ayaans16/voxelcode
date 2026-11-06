/**
 * The wire format between the compile server and the generated test drivers.
 * Typed languages cannot parse JSON without a library, so values travel as
 * whitespace-separated tokens that are trivial to read in Java, C and Go:
 *
 *   int / long   decimal           42   -7
 *   bool         0 or 1
 *   string       hex of the UTF-8 bytes, "-" for the empty string
 *   int[]        <n> v1 .. vn
 *   int[][]      <rows> then per row: <len> v1 .. vlen
 *   string[]     <n> s1 .. sn   (each string hex-encoded)
 */
import type { ValueType } from "@/problems/languages";

export function hexOf(s: string): string {
  return s.length === 0 ? "-" : Buffer.from(s, "utf8").toString("hex");
}

export function unhex(token: string): string {
  return token === "-" ? "" : Buffer.from(token, "hex").toString("utf8");
}

export function encodeValue(type: ValueType, v: unknown, out: string[]): void {
  switch (type) {
    case "int":
    case "long":
      out.push(String(v as number));
      return;
    case "bool":
      out.push(v ? "1" : "0");
      return;
    case "string":
      out.push(hexOf(v as string));
      return;
    case "int[]": {
      const a = v as number[];
      out.push(String(a.length));
      for (const x of a) out.push(String(x));
      return;
    }
    case "int[][]": {
      const a = v as number[][];
      out.push(String(a.length));
      for (const row of a) {
        out.push(String(row.length));
        for (const x of row) out.push(String(x));
      }
      return;
    }
    case "string[]": {
      const a = v as string[];
      out.push(String(a.length));
      for (const x of a) out.push(hexOf(x));
      return;
    }
  }
}

/** Encodes every test (all arguments, in order) into one input document. */
export function encodeTests(paramTypes: readonly ValueType[], tests: readonly { args: unknown[] }[]): string {
  const lines: string[] = [String(tests.length)];
  for (const t of tests) {
    const tokens: string[] = [];
    paramTypes.forEach((type, i) => encodeValue(type, t.args[i], tokens));
    lines.push(tokens.join(" "));
  }
  return lines.join("\n") + "\n";
}

export function decodeValue(type: ValueType, tokens: string[], at = { i: 0 }): unknown {
  const next = () => {
    const t = tokens[at.i++];
    if (t === undefined) throw new Error("Unexpected end of result");
    return t;
  };
  switch (type) {
    case "int":
    case "long":
      return Number(next());
    case "bool":
      return next() === "1";
    case "string":
      return unhex(next());
    case "int[]": {
      const n = Number(next());
      const a = new Array<number>(n);
      for (let i = 0; i < n; i++) a[i] = Number(next());
      return a;
    }
    case "int[][]": {
      const rows = Number(next());
      const a: number[][] = [];
      for (let r = 0; r < rows; r++) {
        const n = Number(next());
        const row = new Array<number>(n);
        for (let i = 0; i < n; i++) row[i] = Number(next());
        a.push(row);
      }
      return a;
    }
    case "string[]": {
      const n = Number(next());
      const a: string[] = [];
      for (let i = 0; i < n; i++) a.push(unhex(next()));
      return a;
    }
  }
}
