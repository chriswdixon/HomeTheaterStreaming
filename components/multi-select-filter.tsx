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
        className="filter-trigger flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
        aria-expanded={open}
      >
        <span className="truncate">
          <span className="text-muted">{label}: </span>
          <span className="font-medium text-foreground">{summary}</span>
        </span>
        <span className="text-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="filter-menu absolute z-30 mt-2 max-h-64 w-full min-w-[12rem] overflow-auto rounded-2xl p-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`filter-menu-item mb-1 w-full rounded-xl px-3 py-2 text-left text-sm ${
              selected.length === 0
                ? "filter-menu-item-active font-medium"
                : "filter-menu-item-muted"
            }`}
          >
            {allLabel}
          </button>
          {options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <label
                key={String(option.value)}
                className={`filter-menu-item flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  active ? "filter-menu-item-active font-medium" : ""
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
