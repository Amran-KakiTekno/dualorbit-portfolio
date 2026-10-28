/**
 * Original two-orbit motif: two ellipses crossing at different angles around
 * a shared centre. Inline SVG only — no external image or icon font.
 */
export function OrbitMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <g fill="none" strokeWidth="2.4">
        <ellipse cx="32" cy="32" rx="27" ry="11" stroke="var(--accent-cyan)" transform="rotate(-28 32 32)" />
        <ellipse cx="32" cy="32" rx="27" ry="11" stroke="var(--accent-amber)" transform="rotate(28 32 32)" />
      </g>
      <circle cx="32" cy="32" r="4.5" fill="var(--accent-cyan)" />
    </svg>
  );
}
