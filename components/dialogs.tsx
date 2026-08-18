"use client";

import { useState } from "react";
import { StarIcon } from "./icons";

export function RatingDialog({
  title,
  onCancel,
  onRate,
}: {
  title: string;
  onCancel: () => void;
  onRate: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-title"
        className="glass w-full max-w-sm rounded-3xl p-6"
      >
        <h2 id="rating-title" className="text-lg font-medium">
          Rate {title}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Pick a star rating to mark it watched. Cancel leaves it unwatched.
        </p>
        <div className="mt-5 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onRate(value)}
              className="glass-icon-button !h-10 !w-10 text-accent"
            >
              <StarIcon className="h-6 w-6" filled={hover >= value} />
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className="glass-button mt-6 w-full">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" className="glass w-full max-w-sm rounded-3xl p-6">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className="glass-button flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="glass-button glass-button-primary flex-1"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
