"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import type { Language } from "@/problems/languages";

// Monaco is self-hosted under /public/monaco (see scripts/copy-assets.mjs): no CDN.
loader.config({ paths: { vs: "/monaco/vs" } });

type Monaco = Parameters<OnMount>[1];

function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme("voxel-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6f6a62", fontStyle: "italic" },
      { token: "keyword", foreground: "ff9455" },
      { token: "string", foreground: "9fd88a" },
      { token: "number", foreground: "f2c94c" },
    ],
    colors: {
      "editor.background": "#17191c",
      "editor.foreground": "#f5efe6",
      "editorLineNumber.foreground": "#4a4740",
      "editorLineNumber.activeForeground": "#a39d92",
      "editor.lineHighlightBackground": "#1d2024",
      "editor.selectionBackground": "#ff945538",
      "editorCursor.foreground": "#ff9455",
      "editorWidget.background": "#1d2024",
      "editorIndentGuide.background1": "#2a2d32",
    },
  });
  monaco.editor.defineTheme("voxel-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a8373", fontStyle: "italic" },
      { token: "keyword", foreground: "c4501a" },
      { token: "string", foreground: "3f7a2f" },
      { token: "number", foreground: "8a6a00" },
    ],
    colors: {
      "editor.background": "#fffaf1",
      "editor.foreground": "#1d1a15",
      "editorLineNumber.foreground": "#b8ad98",
      "editor.lineHighlightBackground": "#f0e9dc",
      "editorCursor.foreground": "#e8661f",
    },
  });
}

function useResolvedTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

interface Props {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  /** Stable key per file so Monaco keeps separate undo history per problem+language. */
  path: string;
}

export function CodeEditor({ language, value, onChange, onRun, onSubmit, path }: Props) {
  const theme = useResolvedTheme();
  const run = useRef(onRun);
  const submit = useRef(onSubmit);
  useEffect(() => {
    run.current = onRun;
    submit.current = onSubmit;
  });

  const onMount: OnMount = (editor, monaco) => {
    // Cmd/Ctrl+Enter runs; Cmd/Ctrl+Shift+Enter submits. Added inside Monaco so they win over its own bindings.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run.current());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => submit.current());
  };

  return (
    <Editor
      path={path}
      language={language}
      value={value}
      theme={theme === "light" ? "voxel-light" : "voxel-dark"}
      beforeMount={defineThemes}
      onMount={onMount}
      onChange={(v) => onChange(v ?? "")}
      loading={<div className="p-4 text-[12px] text-dim">Loading editor...</div>}
      options={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: language === "javascript" ? 2 : 4,
        insertSpaces: language !== "go",
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "solid",
        fontLigatures: false,
        accessibilitySupport: "auto",
      }}
    />
  );
}
