"use client";

// Placeholder - the full checkup report (expandable orphan/cycle lists,
// score breakdown) arrives in 2.0 Week 3. The underlying algorithm
// (backend/src/services/stats.js) already runs today - Overview's Health
// stat card is real, this page just doesn't have its detailed view yet.

import { COLORS } from "../../../../theme.js";

export default function HealthPage() {
  return <p style={{ color: COLORS.textSecondary }}>Health page — coming in Gitography 2.0 Week 3.</p>;
}
