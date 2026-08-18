import type { ReactNode } from "react";

export function glassClassName(extra = "") {
  return `glass ${extra}`.trim();
}

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={glassClassName(`rounded-3xl p-6 ${className}`)}>{children}</div>;
}

export function GlassButton({
  children,
  className = "",
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variants = {
    primary: "glass-button glass-button-primary",
    secondary: "glass-button",
    ghost: "glass-button glass-button-ghost",
  };

  return (
    <button type="button" className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function GlassChip({
  children,
  active = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`glass-chip ${active ? "glass-chip-active" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GlassInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`glass-input ${className}`} {...props} />;
}

export function GlassSelect({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`glass-input ${className}`} {...props}>
      {children}
    </select>
  );
}

export function GlassIconButton({
  children,
  label,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`glass-icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
