/**
 * The single source of truth for the brand: green arrow mark + "workfinder."
 * wordmark. Use it everywhere the logo appears so the style stays consistent.
 */
export const BRAND_NAME = "workfinder.";

export function BrandWord({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-word ${className}`.trim()}>
      workfinder<span className="brand-dot">.</span>
    </span>
  );
}

export function Brand({
  size = "md",
  className = "",
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={`brand brand-${size} ${className}`.trim()}
      role="img"
      aria-label={BRAND_NAME}
    >
      <span className="brand-mark" aria-hidden="true">
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </svg>
      </span>
      <BrandWord />
    </span>
  );
}
