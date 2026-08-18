"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  CheckIcon,
  PlayIcon,
  PlusIcon,
  SharedIcon,
} from "./icons";

type ActionTone = "add" | "shared" | "watched" | "delete" | "watch";

const toneClass: Record<ActionTone, string> = {
  add: "action-btn-add",
  shared: "action-btn-shared",
  watched: "action-btn-watched",
  delete: "action-btn-delete",
  watch: "action-btn-watch",
};

function CardActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group/action relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="card-action-tooltip app-tooltip pointer-events-none absolute left-1/2 bottom-[calc(100%+0.4rem)] z-30 -translate-x-1/2 whitespace-nowrap opacity-0 transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export function CardIconButton({
  label,
  onClick,
  icon,
  tone,
  disabled = false,
}: {
  label: string;
  onClick?: (event: MouseEvent) => void;
  icon: ReactNode;
  tone: ActionTone;
  disabled?: boolean;
}) {
  return (
    <CardActionTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`card-action-icon ${toneClass[tone]} ${
          disabled ? "card-action-icon-muted" : ""
        }`}
      >
        {icon}
      </button>
    </CardActionTooltip>
  );
}

export function CardIconLink({
  label,
  href,
  onClick,
  icon,
  tone,
}: {
  label: string;
  href: string;
  onClick?: (event: MouseEvent) => void;
  icon: ReactNode;
  tone: ActionTone;
}) {
  return (
    <CardActionTooltip label={label}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        onClick={onClick}
        className={`card-action-icon ${toneClass[tone]} no-underline`}
      >
        {icon}
      </a>
    </CardActionTooltip>
  );
}

type ListMovie = {
  tmdbMovieId: number;
  mediaType?: "movie" | "tv";
  title: string;
  year: string | null;
  posterPath: string | null;
  overview?: string;
};

export function ListAddIconButtons<T extends ListMovie>({
  movie,
  onAdd,
}: {
  movie: T;
  onAdd: (movie: T, list: "personal" | "shared") => void | Promise<void>;
}) {
  return (
    <>
      <CardIconButton
        label="Add to my list"
        tone="add"
        icon={<PlusIcon className="h-5 w-5" />}
        onClick={() => onAdd(movie, "personal")}
      />
      <CardIconButton
        label="Add to shared list"
        tone="shared"
        icon={<SharedIcon className="h-5 w-5" />}
        onClick={() => onAdd(movie, "shared")}
      />
    </>
  );
}

export function ListStatusIcon({ label }: { label: string }) {
  return (
    <CardIconButton
      label={label}
      tone="watched"
      icon={<CheckIcon className="h-5 w-5" />}
      disabled
    />
  );
}

export function WatchNowIconLink({
  href,
  onClick,
}: {
  href: string;
  onClick?: (event: MouseEvent) => void;
}) {
  return (
    <CardIconLink
      label="Watch now"
      href={href}
      onClick={onClick}
      tone="watch"
      icon={<PlayIcon className="h-5 w-5" />}
    />
  );
}
