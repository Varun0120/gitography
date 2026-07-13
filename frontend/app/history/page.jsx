"use client";

// Placeholder - the real History table (fed by GET /repos/recent, straight
// from graph_cache) arrives in 2.0 Week 4. Route exists now for the
// 6-route skeleton.

import { COLORS, SPACING } from "../theme.js";

export default function HistoryPage() {
  return (
    <main style={{ padding: SPACING.xl, maxWidth: 1120, margin: "0 auto" }}>
      <p style={{ color: COLORS.textSecondary }}>History page — coming in Gitography 2.0 Week 4.</p>
    </main>
  );
}
