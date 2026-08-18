"use client";

import { useEffect, useRef, useState } from "react";

export type MultiSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export function MultiSelectFilter<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  allLabel = "All",
}: {
  label: string;
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((option) => option.value === selected[0])?.label ??
          String(selected[0]))
        : `${selected.length} selected`;

  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-[10rem]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="glass-input flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
        aria-expanded={open}
      >
        <span className="truncate">
          <span className="text-muted">{label}: </span>
          <span className="text-foreground">{summary}</span>
        </span>
        <span className="text-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="glass absolute z-30 mt-2 max-h-64 w-full min-w-[12rem] overflow-auto rounded-2xl p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5 ${
              selected.length === 0 ? "bg-white/10 text-foreground" : "text-muted"
            }`}
          >
            {allLabel}
          </button>
          {options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <label
                key={String(option.value)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5 ${
                  active ? "bg-white/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(option.value)}
                  className="accent-[var(--accent-warm)]"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
