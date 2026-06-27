import { useTheme } from "../lib/theme";
import "./ThemeToggle.css";

type Props = {
  className?: string;
  compact?: boolean;
};

export function ThemeToggle({ className = "", compact = false }: Props) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle--compact" : ""} ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {isDark ? "☀️" : "🌙"}
      </span>
      {!compact && (
        <span className="theme-toggle__label">{isDark ? "Light" : "Dark"}</span>
      )}
      <span className="sr-only">Current theme: {theme}</span>
    </button>
  );
}
