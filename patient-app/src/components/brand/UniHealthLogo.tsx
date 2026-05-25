import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type Props = {
  size?: number;
  idPrefix?: string;
};

/** UniHealth shield mark — matches web `UniHealthLogo` gradients. */
export function UniHealthLogo({ size = 40, idPrefix = "uh" }: Props) {
  const g = `${idPrefix}-lg`;
  const gGlow = `${idPrefix}-glow`;
  const gCore = `${idPrefix}-core`;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="UniHealth">
      <Defs>
        <LinearGradient id={g} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00D4FF" />
          <Stop offset="0.55" stopColor="#2B8FE8" />
          <Stop offset="1" stopColor="#00E5A0" />
        </LinearGradient>
        <LinearGradient id={gGlow} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00D4FF" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#00E5A0" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id={gCore} cx="32" cy="30" rx="18" ry="18" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#B8F0FF" stopOpacity="0.2" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="32" rx="28" ry="26" fill={`url(#${gGlow})`} />
      <Path
        d="M32 6L52 16.5V30.5C52 42.8 43.2 52.6 32 57.5C20.8 52.6 12 42.8 12 30.5V16.5L32 6Z"
        fill="rgba(6,18,42,0.55)"
        stroke={`url(#${g})`}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx="32" cy="31" r="17" stroke={`url(#${g})`} strokeWidth={1.2} strokeOpacity={0.45} strokeDasharray="3 4" fill="none" />
      <Rect x="29" y="24" width="6" height="16" rx="1.5" fill={`url(#${gCore})`} />
      <Rect x="24" y="29" width="16" height="6" rx="1.5" fill={`url(#${gCore})`} />
      <Circle cx="32" cy="31" r="4.5" fill={`url(#${g})`} fillOpacity={0.35} />
      <Path
        d="M18 54H24L27 48L31 56L35 46L38 52H46"
        stroke="#00E5A0"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </Svg>
  );
}
