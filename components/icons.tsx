export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8.6-8.6 1.4 1.4z"
      />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5zm1 6h2v9h-2zm4 0h2v9h-2zM6 8h12l-1 13H7z"
      />
    </svg>
  );
}

export function StarIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        d="m12 3.6 2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.8 7 19l.9-5.6-4-3.9 5.6-.8z"
      />
    </svg>
  );
}

export function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 7h2v2H9zm4 0h2v2h-2zM9 11h2v2H9zm4 0h2v2h-2zM9 15h2v2H9zm4 0h2v2h-2z"
      />
    </svg>
  );
}
