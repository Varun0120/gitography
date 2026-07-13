// theme.js - single source of truth for the design system (see CLAUDE.md).
// Plain JS constants (not CSS-in-JS) so both inline styles and globals.css
// can reference the same values without drifting apart.

export const COLORS = {
  bg: "#0B0E14",
  card: "#151A23",
  border: "#232B38",
  textPrimary: "#E6EBF2",
  textSecondary: "#8A94A6",
  accent: "#4D9FFF",
  success: "#3FB68B",
  warning: "#E5A455",
  error: "#E5615C",
  graphEdge: "#2A3341",
  graphSupport: "#4A5568",
};

// Accent-tinted palette for "core" (non-test/docs/example) folders.
// Capped at 3 - the design system forbids rainbow palettes.
export const CORE_FOLDER_COLORS = ["#4D9FFF", "#6FE3C4", "#C79CFF"];

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const RADIUS = { card: 12 };
