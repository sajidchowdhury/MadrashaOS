/**
 * MadrashaOS — Empty-State Illustrations (Session 1.4)
 *
 * 5 flat line-art illustrations, 240×160 px viewBox, stroke-based with
 * `currentColor` so they inherit the brand palette. One focal element
 * uses the accent gold (warm) via `text-accent-500` on a sub-element.
 *
 *   E1 empty-students     — 3 student silhouettes waving
 *   E2 empty-fees          — receipt with checkmark stamp
 *   E3 empty-attendance    — clipboard with row silhouettes
 *   E4 empty-inventory     — shelf with one box
 *   E5 empty-results       — report card with pencil + star
 */

type IllustrationProps = { className?: string };

const BASE = "fill-none stroke-currentColor [stroke-width]:1.5 [stroke-linecap]:round [stroke-linejoin]:round";

/* E1 — Students */
export function EmptyStudents({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label="No students yet">
      <g className={BASE}>
        {/* Figure 1 */}
        <circle cx="70" cy="55" r="14" />
        <path d="M50 110 v-15 a20 20 0 0 1 40 0 v15" />
        <path d="M65 55 q5 8 12 0" />
        {/* Figure 2 (center, waving) */}
        <circle cx="120" cy="45" r="14" />
        <path d="M100 110 v-15 a20 20 0 0 1 40 0 v15" />
        <path d="M115 45 q5 8 12 0" />
        <path d="M134 50 q8 -6 14 -14" className="text-accent-500" />
        {/* Figure 3 */}
        <circle cx="170" cy="55" r="14" />
        <path d="M150 110 v-15 a20 20 0 0 1 40 0 v15" />
        <path d="M165 55 q5 8 12 0" />
        {/* Ground line */}
        <line x1="30" y1="130" x2="210" y2="130" />
      </g>
    </svg>
  );
}

/* E2 — Fees (receipt + checkmark) */
export function EmptyFees({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label="No outstanding fees">
      <g className={BASE}>
        {/* Receipt */}
        <path d="M80 30 h80 v100 l-10 -5 -10 5 -10 -5 -10 5 -10 -5 -10 5 -10 -5 -10 5 z" />
        <line x1="95" y1="55" x2="145" y2="55" />
        <line x1="95" y1="70" x2="145" y2="70" />
        <line x1="95" y1="85" x2="125" y2="85" />
        {/* Checkmark badge */}
        <circle cx="165" cy="45" r="18" className="text-accent-500" />
        <path d="M156 45 l6 6 12 -12" className="text-semantic-success" />
      </g>
    </svg>
  );
}

/* E3 — Attendance (clipboard) */
export function EmptyAttendance({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label="No attendance taken yet">
      <g className={BASE}>
        {/* Clipboard */}
        <rect x="55" y="30" width="100" height="110" rx="6" />
        <rect x="85" y="22" width="40" height="16" rx="4" />
        {/* Row silhouettes */}
        <line x1="70" y1="60" x2="140" y2="60" />
        <line x1="70" y1="75" x2="140" y2="75" />
        <line x1="70" y1="90" x2="140" y2="90" />
        <line x1="70" y1="105" x2="120" y2="105" />
        {/* Pencil */}
        <path d="M175 40 l15 -15 l10 10 l-15 15 z" className="text-accent-500" />
        <path d="M170 45 l5 -5 l10 10 l-5 5 z" className="text-accent-500" />
        <path d="M165 50 l5 15 l15 -5" />
      </g>
    </svg>
  );
}

/* E4 — Inventory (shelf + box) */
export function EmptyInventory({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label="No items in stock">
      <g className={BASE}>
        {/* Shelf */}
        <rect x="30" y="40" width="120" height="90" rx="2" />
        <line x1="30" y1="70" x2="150" y2="70" />
        <line x1="30" y1="100" x2="150" y2="100" />
        {/* Single box on right */}
        <rect x="175" y="85" width="35" height="35" rx="2" className="text-accent-500" />
        <line x1="175" y1="98" x2="210" y2="98" className="text-accent-500" />
        <line x1="192" y1="85" x2="192" y2="120" className="text-accent-500" />
      </g>
    </svg>
  );
}

/* E5 — Results (report card + pencil + star) */
export function EmptyResults({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Results will publish soon">
      <g className={BASE}>
        {/* Report card */}
        <path d="M40 40 h90 v90 h-90 z" />
        <line x1="55" y1="60" x2="115" y2="60" />
        <line x1="55" y1="75" x2="115" y2="75" />
        <line x1="55" y1="90" x2="100" y2="90" />
        {/* Pencil */}
        <path d="M155 70 l40 -40 l15 15 l-40 40 z" className="text-accent-500" />
        <path d="M150 75 l5 20 l20 -5" />
        <path d="M195 30 l15 15 l-5 5 l-15 -15 z" className="text-accent-500" />
        {/* Star */}
        <path d="M200 25 l3 8 l8 0 l-6 5 l2 8 l-7 -5 l-7 5 l2 -8 l-6 -5 l8 0 z" className="text-accent-500 fill-current" />
      </g>
    </svg>
  );
}
