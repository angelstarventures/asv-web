import type { ReactNode } from "react";

// One small line icon per sector value seen in Company.sector — purely decorative, shown
// next to the sector name in the portfolio logo grid's hover overlay. New sectors fall back to
// a generic dot rather than failing to render.
const ICONS: Record<string, ReactNode> = {
  "Medical Devices": (
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
  ),
  Biotechnology: (
    <path d="M8 3c0 4 8 4 8 8s-8 4-8 8M16 3c0 4-8 4-8 8s8 4 8 8" />
  ),
  "Artificial Intelligence": (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  "Materials Science": (
    <path d="M12 2 3 7l9 5 9-5-9-5ZM3 17l9 5 9-5M3 12l9 5 9-5" />
  ),
  Semiconductors: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  "Food and Beverage": <path d="M6 2v8a3 3 0 0 0 6 0V2M9 10v12M18 2c-2 2-2 5-2 8a2 2 0 0 0 4 0c0-3 0-6-2-8ZM18 14v8" />,
  Technology: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
};

export function SectorIcon({ sector, className }: { sector: string; className?: string }) {
  const path = ICONS[sector] ?? <circle cx="12" cy="12" r="3" />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
