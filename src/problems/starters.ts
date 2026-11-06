import type { Language, ValueType } from "./languages";
import { functionNameFor } from "./languages";

interface Sig {
  name: { python: string; javascript: string };
  params: { name: string; type: ValueType }[];
  returns: ValueType;
}

const doc = (sig: Sig) => `${sig.params.map((p) => `${p.name}: ${p.type}`).join(", ")} -> ${sig.returns}`;

// ---- Java --------------------------------------------------------------
export const JAVA_TYPE: Record<ValueType, string> = {
  int: "int",
  long: "long",
  bool: "boolean",
  string: "String",
  "int[]": "int[]",
  "int[][]": "int[][]",
  "string[]": "String[]",
};
const JAVA_DEFAULT: Record<ValueType, string> = {
  int: "0",
  long: "0L",
  bool: "false",
  string: '""',
  "int[]": "new int[0]",
  "int[][]": "new int[0][]",
  "string[]": "new String[0]",
};

// ---- Go ----------------------------------------------------------------
export const GO_TYPE: Record<ValueType, string> = {
  int: "int",
  long: "int64",
  bool: "bool",
  string: "string",
  "int[]": "[]int",
  "int[][]": "[][]int",
  "string[]": "[]string",
};
const GO_DEFAULT: Record<ValueType, string> = {
  int: "0",
  long: "0",
  bool: "false",
  string: '""',
  "int[]": "nil",
  "int[][]": "nil",
  "string[]": "nil",
};

// ---- C -----------------------------------------------------------------
/** Parameter list for C. Arrays arrive as pointer + length; 2D arrays also get a column-count array. */
export function cParams(sig: Sig): string {
  const out: string[] = [];
  for (const p of sig.params) {
    switch (p.type) {
      case "int":
        out.push(`int ${p.name}`);
        break;
      case "long":
        out.push(`long long ${p.name}`);
        break;
      case "bool":
        out.push(`bool ${p.name}`);
        break;
      case "string":
        out.push(`const char *${p.name}`);
        break;
      case "int[]":
        out.push(`const int *${p.name}`, `int ${p.name}Len`);
        break;
      case "int[][]":
        out.push(`int **${p.name}`, `int ${p.name}Len`, `const int *${p.name}Cols`);
        break;
      case "string[]":
        out.push(`const char **${p.name}`, `int ${p.name}Len`);
        break;
    }
  }
  if (sig.returns === "int[]") out.push("int *returnSize");
  if (sig.returns === "int[][]") out.push("int *returnSize", "int **returnColumnSizes");
  return out.join(", ");
}

export function cReturnType(t: ValueType): string {
  return { int: "int", long: "long long", bool: "bool", string: "char *", "int[]": "int *", "int[][]": "int **", "string[]": "char **" }[t];
}

function cDefaultBody(t: ValueType): string {
  switch (t) {
    case "int":
    case "long":
      return "    return 0;";
    case "bool":
      return "    return false;";
    case "string":
      return '    return strdup("");';
    case "int[]":
      return "    *returnSize = 0;\n    return NULL;";
    case "int[][]":
      return "    *returnSize = 0;\n    *returnColumnSizes = NULL;\n    return NULL;";
    case "string[]":
      return "    return NULL;";
  }
}

const C_NOTE: Record<string, string> = {
  "int[]": "// Return an int array: allocate it with malloc and store its length in *returnSize.",
  "int[][]": "// Return an array of int arrays: malloc it, store the row count in *returnSize and each row's length in (*returnColumnSizes)[i].",
};

/** Default starter code for a language, generated from a problem's signature. */
export function defaultStarter(sig: Sig, language: Language): string {
  const jsName = sig.name.javascript;
  const params = sig.params.map((p) => p.name).join(", ");
  switch (language) {
    case "python":
      return `def ${sig.name.python}(${params}):\n    # ${doc(sig)}\n    pass\n`;
    case "javascript":
      return `function ${jsName}(${params}) {\n  // ${doc(sig)}\n}\n`;
    case "java":
      return `class Solution {\n    // ${doc(sig)}\n    public static ${JAVA_TYPE[sig.returns]} ${jsName}(${sig.params.map((p) => `${JAVA_TYPE[p.type]} ${p.name}`).join(", ")}) {\n        return ${JAVA_DEFAULT[sig.returns]};\n    }\n}\n`;
    case "c": {
      const note = C_NOTE[sig.returns] ? `${C_NOTE[sig.returns]}\n` : "";
      return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n// ${doc(sig)}\n// Arrays arrive as a pointer plus a length parameter. Do not define main().\n${note}${cReturnType(sig.returns)} ${functionNameFor(sig.name, "c")}(${cParams(sig)}) {\n${cDefaultBody(sig.returns)}\n}\n`;
    }
    case "go":
      return `package main\n\n// ${doc(sig)}\n// Do not define main().\nfunc ${jsName}(${sig.params.map((p) => `${p.name} ${GO_TYPE[p.type]}`).join(", ")}) ${GO_TYPE[sig.returns]} {\n\treturn ${GO_DEFAULT[sig.returns]}\n}\n`;
  }
}
