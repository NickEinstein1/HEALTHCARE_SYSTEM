/**
 * UniHealth brand mark (SVG).
 * Used on sign-in, registration, and dashboard chrome.
 */

type Props = {
  /** Pixel size when parent does not set dimensions via CSS. */
  size?: number;
  className?: string;
  /** Unique id prefix when multiple logos render on one page (gradients). */
  idPrefix?: string;
};

export function UniHealthLogo({ size, className = "unihealth-logo", idPrefix = "uh" }: Props) {
  const g = `${idPrefix}-logo-grad`;
  const gGlow = `${idPrefix}-logo-glow`;
  const gCore = `${idPrefix}-logo-core`;

  return (
    <svg
      className={className}
      width={size ?? undefined}
      height={size ?? undefined}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="UniHealth"
    >
      <title>UniHealth</title>
      <defs>
        <linearGradient id={g} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" />
          <stop offset="0.55" stopColor="#2B8FE8" />
          <stop offset="1" stopColor="#00E5A0" />
        </linearGradient>
        <linearGradient id={gGlow} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#00E5A0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={gCore} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 30) rotate(90) scale(18)">
          <stop stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#B8F0FF" stopOpacity="0.2" />
        </radialGradient>
        <filter id={`${idPrefix}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="32" cy="32" rx="28" ry="26" fill={`url(#${gGlow})`} />

      {/* Shield — clinical trust */}
      <path
        d="M32 6L52 16.5V30.5C52 42.8 43.2 52.6 32 57.5C20.8 52.6 12 42.8 12 30.5V16.5L32 6Z"
        fill="rgba(6,18,42,0.55)"
        stroke={`url(#${g})`}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* AI network ring */}
      <circle cx="32" cy="31" r="17" stroke={`url(#${g})`} strokeWidth="1.2" strokeOpacity="0.45" strokeDasharray="3 4" />
      <circle cx="32" cy="12" r="2.2" fill="#00E5A0" />
      <circle cx="47" cy="22" r="2" fill="#00D4FF" />
      <circle cx="47" cy="40" r="2" fill="#00D4FF" />
      <circle cx="32" cy="50" r="2.2" fill="#00E5A0" />
      <circle cx="17" cy="40" r="2" fill="#00D4FF" />
      <circle cx="17" cy="22" r="2" fill="#00D4FF" />
      <path
        d="M32 14L45 21M45 39L32 46M32 46L19 39M19 21L32 14"
        stroke={`url(#${g})`}
        strokeWidth="0.9"
        strokeOpacity="0.5"
      />

      {/* Medical cross + AI core */}
      <rect x="29" y="24" width="6" height="16" rx="1.5" fill={`url(#${gCore})`} />
      <rect x="24" y="29" width="16" height="6" rx="1.5" fill={`url(#${gCore})`} />
      <circle cx="32" cy="31" r="4.5" fill={`url(#${g})`} fillOpacity="0.35" />

      {/* EKG pulse — clinical AI signal */}
      <path
        d="M18 54H24L27 48L31 56L35 46L38 52H46"
        stroke="#00E5A0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
        filter={`url(#${idPrefix}-soft)`}
      />
    </svg>
  );
}
