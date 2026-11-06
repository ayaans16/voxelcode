"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Small right-aligned text, e.g. a file extension or "not installed". */
  hint?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface Props<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name (also shown in tooltips). */
  label: string;
  className?: string;
  /** Opens above the trigger instead of below. */
  up?: boolean;
  align?: "left" | "right";
}

/**
 * A custom dropdown in the app's block style, replacing the OS-native <select>.
 * Keyboard: Enter/Space/Arrow opens, Up/Down/Home/End move, type to jump, Enter picks, Esc closes.
 */
export function Select<T extends string>({ value, options, onChange, label, className = "", up = false, align = "left" }: Props<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const current = options.find((o) => o.value === value);
  const enabled = useMemo(() => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0), [options]);

  const openMenu = useCallback(() => {
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : (enabled[0] ?? 0));
    setOpen(true);
  }, [options, value, enabled]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  const pick = useCallback(
    (i: number) => {
      const o = options[i];
      if (!o || o.disabled) return;
      onChange(o.value);
      close();
    },
    [options, onChange, close],
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const move = (dir: 1 | -1) => {
    const pos = enabled.indexOf(active);
    const next = enabled[(pos + dir + enabled.length) % enabled.length];
    if (next !== undefined) setActive(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        if (enabled[0] !== undefined) setActive(enabled[0]);
        break;
      case "End":
        e.preventDefault();
        if (enabled.length) setActive(enabled[enabled.length - 1]!);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = Date.now();
          typed.current.text = now - typed.current.at > 700 ? e.key.toLowerCase() : typed.current.text + e.key.toLowerCase();
          typed.current.at = now;
          const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
          if (hit >= 0) setActive(hit);
        }
    }
  };

  return (
    <div ref={root} className={"relative inline-block " + className} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        title={label}
        onClick={() => (open ? close(false) : openMenu())}
        className={"btn w-full justify-between gap-3 px-3 py-1.5 text-[12px] " + (open ? "!border-accent !text-accent" : "")}
      >
        <span className="flex items-center gap-2 truncate">
          {current?.icon}
          {current?.label ?? value}
        </span>
        <PixelIcon name="chevronDown" px={2} className={"shrink-0 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={
            "block absolute z-50 max-h-72 min-w-full overflow-auto p-1 " +
            (up ? "bottom-full mb-2 " : "top-full mt-2 ") +
            (align === "right" ? "right-0" : "left-0")
          }
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                onPointerEnter={() => !o.disabled && setActive(i)}
                onClick={() => pick(i)}
                className={
                  "flex cursor-pointer items-center gap-3 whitespace-nowrap px-3 py-2 text-[12px] " +
                  (o.disabled ? "cursor-not-allowed text-dim opacity-60 " : i === active ? "bg-accent text-accent-ink " : "text-ink ")
                }
              >
                <span className="flex w-3 shrink-0 justify-center">{selected && <PixelIcon name="check" px={2} />}</span>
                <span className="flex flex-1 items-center gap-2 font-bold">
                  {o.icon}
                  {o.label}
                </span>
                {o.hint && <span className={"text-[10px] " + (i === active && !o.disabled ? "text-accent-ink/70" : "text-dim")}>{o.hint}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
