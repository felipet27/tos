import React from "react";

const ICONS = {
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1" />
    </>
  ),
  lockOpen: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.8-1.2" />
      <circle cx="12" cy="16" r="1" />
    </>
  ),
  hand: (
    <>
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </>
  ),
  pointer: <path d="M6 3.5l12 9-5.6.9 3.3 6.3-2.3 1.2-3.3-6.4L6 18.6z" />,
  square: <rect x="4" y="4" width="16" height="16" rx="2.5" />,
  diamond: <path d="M10.6 3.6a2 2 0 0 1 2.8 0l7 7a2 2 0 0 1 0 2.8l-7 7a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8z" />,
  circle: <circle cx="12" cy="12" r="8.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  line: <path d="M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  text: <path d="M4 20h4M16 20h4M6 20l6-16 6 16M8.3 14h7.4" />,
  note: (
    <>
      <path d="M14 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v9z" />
      <path d="M14 20v-5a1 1 0 0 1 1-1h5" />
      <path d="M8 9h8M8 12.5h4" />
    </>
  ),
  eraser: (
    <>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  folder: <path d="M4 19a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1z" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  exportImage: (
    <>
      <path d="M15 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="m4 16 4.5-4.5a1.5 1.5 0 0 1 2 0L16 17" />
      <path d="M17 3h4v4M21 3l-5 5" />
    </>
  ),
  zap: <path d="M13 3 4 14h7l-1 7 9-11h-7z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <circle cx="12" cy="17" r=".6" fill="currentColor" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  sliders: (
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />
  ),
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 5 5 9-10" />,
  image: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m20 15-4-4-9 9" />
    </>
  ),
  frame: <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />,
  laser: (
    <>
      <path d="m4 20 9-9" />
      <path d="M15 4v2M19 8h2M17.5 5.5l1.5-1.5M17.5 10.5l1.5 1.5M12.5 5.5 11 4" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
    </>
  ),
  sparkles: (
    <path d="M12 3.5 13.6 8a2 2 0 0 0 1.4 1.4l4.5 1.6-4.5 1.6a2 2 0 0 0-1.4 1.4L12 18.5 10.4 14A2 2 0 0 0 9 12.6L4.5 11 9 9.4A2 2 0 0 0 10.4 8zM19 3v3M17.5 4.5h3" />
  ),
  mermaid: (
    <path d="M4 5c0 6 4 7 8 10 4-3 8-4 8-10M12 15v5M4 5c3 0 5 2 6 4M20 5c-3 0-5 2-6 4" />
  ),
  library: (
    <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13" />
  ),
  sidebar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M14.5 4.5v15" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  grid: <path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16" />,
  zen: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </>
  ),
  example: (
    <>
      <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  duplicate: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  // --- Properties panel glyphs ---
  strokeThin: <path d="M5 12h14" strokeWidth={1.2} />,
  strokeBold: <path d="M5 12h14" strokeWidth={2.6} />,
  strokeExtra: <path d="M5 12h14" strokeWidth={4.2} />,
  styleSolid: <path d="M4 12h16" strokeWidth={2} />,
  styleDashed: <path d="M4 12h3.5M10.25 12h3.5M16.5 12H20" strokeWidth={2} />,
  styleDotted: <path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01" strokeWidth={2.4} />,
  sloppy0: <path d="M4 15c3-5 5-6 8-3s5 2 8-3" />,
  sloppy1: <path d="M4 15c2-3 3-6 5-4s2 4 4 2 3-5 4-4 2 2 3 0" />,
  sloppy2: <path d="M4 15c1-2 2-5 3-3s1 3 2 1 2-4 3-2 1 4 2 2 2-5 3-3 1 2 3 0M5 13c2-1 3-3 5-1" />,
  edgeSharp: <path d="M5 19V5h14" strokeDasharray="0" />,
  edgeRound: <path d="M5 19V11a6 6 0 0 1 6-6h8" />,
  arrowStraight: <path d="M5 19 19 5M11 5h8v8" />,
  arrowCurved: <path d="M5 19c0-8 6-14 14-14M13 4l6 1-1 6" />,
  arrowElbow: <path d="M5 19v-7h12V5M14 8l3-3 3 3" />,
  headNone: <path d="M4 12h16M5 9l-1 3 1 3" strokeOpacity={0.35} />,
  headStart: <path d="M4 12h16M9 7l-5 5 5 5" />,
  headEnd: <path d="M4 12h16M15 7l5 5-5 5" />,
  fontHand: (
    <>
      <path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  fontSans: <path d="M6 20 12 4l6 16M8.3 14h7.4" />,
  fontMono: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  alignLeft: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  fillHachure: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 12 12 4M4 19 19 4M11 20l9-9" />
    </>
  ),
  fillCross: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 12 12 4M4 19 19 4M11 20l9-9M12 20 4 12M19 20 4 5M20 12l-8-8" />
    </>
  ),
  fillSolid: <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />,
  layerBack: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  layerBackward: <path d="M12 5v14M6 13l6 6 6-6" />,
  layerForward: <path d="M12 19V5M6 11l6-6 6 6" />,
  layerFront: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 18,
  className,
  filled = false,
}: {
  name: IconName;
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}
