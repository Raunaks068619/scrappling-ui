// Tiny accent dot used next to the wordmark in the topbar.
// Per the brief: brand wordmark + small accent dot.
export function AccentDot({ size = 6 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent)",
        verticalAlign: "middle",
        marginInlineStart: 6,
        transform: "translateY(-2px)",
      }}
    />
  );
}

// Monoline arrow used inside the submit pill's circular slot.
export function ArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 8h9" />
      <path d="M8.5 3.5L13 8l-4.5 4.5" />
    </svg>
  );
}

// Spinner — replaces the arrow when a scrape is in-flight.
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      style={{ animation: "scrap-spin 700ms linear infinite" }}
    >
      <circle cx="8" cy="8" r="5.5" opacity="0.25" />
      <path d="M13.5 8a5.5 5.5 0 0 0-5.5-5.5" />
      <style>{`@keyframes scrap-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export function ExternalIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 3.5H3.5v9h9V10" />
      <path d="M9 3.5h3.5V7" />
      <path d="M7.5 8.5L12.5 3.5" />
    </svg>
  );
}

export function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H4.5A1.5 1.5 0 0 0 3 3.5v6A1.5 1.5 0 0 0 4.5 11H5" />
    </svg>
  );
}
