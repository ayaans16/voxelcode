/**
 * Supported languages and how each one is run.
 *  - python, javascript: in the browser, inside a Web Worker (Pyodide for Python).
 *  - java, c, go: compiled and run by the LOCAL compile server (see src/runner/native).
 */
export const LANGUAGES = ["python", "javascript", "java", "c", "go"] as const;
export type Language = (typeof LANGUAGES)[number];

export const WORKER_LANGUAGES = ["python", "javascript"] as const;
export type WorkerLanguage = (typeof WORKER_LANGUAGES)[number];

export const NATIVE_LANGUAGES = ["java", "c", "go"] as const;
export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  c: "C",
  go: "Go",
};

export const isNativeLanguage = (l: Language): l is NativeLanguage => (NATIVE_LANGUAGES as readonly string[]).includes(l);

/** File extension used for editor models and temp files. */
export const FILE_EXTENSION: Record<Language, string> = { python: "py", javascript: "js", java: "java", c: "c", go: "go" };

/** The value types a problem signature may use (these map onto each language's native types). */
export const VALUE_TYPES = ["int", "long", "bool", "string", "int[]", "int[][]", "string[]"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

/** Which of the two authored names each language uses: snake_case for Python and C, camelCase for the rest. */
export function functionNameFor(name: { python: string; javascript: string }, language: Language): string {
  return language === "python" || language === "c" ? name.python : name.javascript;
}
