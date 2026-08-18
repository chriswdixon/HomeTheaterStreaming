import type { ReactNode } from "react";

function GlassSvgIcon({
  children,
  gradientId,
}: {
  children: ReactNode;
  gradientId: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="8" y1="4" x2="24" y2="28">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f0d090" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

export function NavMyListIcon() {
  return (
    <GlassSvgIcon gradientId="nav-my-list">
      <rect x="7" y="8" width="18" height="4" rx="2" fill="url(#nav-my-list)" />
      <rect x="7" y="14" width="18" height="4" rx="2" fill="url(#nav-my-list)" opacity="0.85" />
      <rect x="7" y="20" width="12" height="4" rx="2" fill="url(#nav-my-list)" opacity="0.7" />
    </GlassSvgIcon>
  );
}

export function NavSharedIcon() {
  return (
    <GlassSvgIcon gradientId="nav-shared">
      <circle cx="12" cy="13" r="4" fill="url(#nav-shared)" />
      <circle cx="20" cy="13" r="4" fill="url(#nav-shared)" opacity="0.85" />
      <path
        d="M8 24c0-3.3 2.7-5 4-5h8c1.3 0 4 1.7 4 5"
        stroke="url(#nav-shared)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </GlassSvgIcon>
  );
}

export function NavTop100Icon() {
  return (
    <GlassSvgIcon gradientId="nav-top100">
      <path
        d="M16 6 18.8 13.2 26.5 13.6 20.5 18.2 22.6 25.8 16 21.5 9.4 25.8 11.5 18.2 5.5 13.6 13.2 13.2Z"
        fill="url(#nav-top100)"
      />
    </GlassSvgIcon>
  );
}

export function NavRecentIcon() {
  return (
    <GlassSvgIcon gradientId="nav-recent">
      <circle cx="16" cy="16" r="9" stroke="url(#nav-recent)" strokeWidth="2.2" />
      <path
        d="M16 10v6l4 2.5"
        stroke="url(#nav-recent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GlassSvgIcon>
  );
}

export function NavServicesIcon() {
  return (
    <GlassSvgIcon gradientId="nav-services">
      <rect x="8" y="8" width="16" height="16" rx="4" stroke="url(#nav-services)" strokeWidth="2.2" />
      <path d="M12 16h8M16 12v8" stroke="url(#nav-services)" strokeWidth="2.2" strokeLinecap="round" />
    </GlassSvgIcon>
  );
}

export function NavRecommendationsIcon() {
  return (
    <GlassSvgIcon gradientId="nav-recs">
      <path
        d="M10 22 16 8l6 14"
        stroke="url(#nav-recs)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="18" r="2.2" fill="url(#nav-recs)" />
    </GlassSvgIcon>
  );
}

export const NAV_ICONS = {
  "/my-list": NavMyListIcon,
  "/shared": NavSharedIcon,
  "/top-100": NavTop100Icon,
  "/recently-watched": NavRecentIcon,
  "/services": NavServicesIcon,
  "/recommendations": NavRecommendationsIcon,
} as const;

export function NavGlassIcon({ href }: { href: keyof typeof NAV_ICONS }) {
  const Icon = NAV_ICONS[href];
  return (
    <span className="glass-nav-icon">
      <Icon />
    </span>
  );
}
