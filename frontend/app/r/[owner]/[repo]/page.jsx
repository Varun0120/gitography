"use client";

// Overview - the "money page". In 30 seconds: what is this, and what
// should I do next? Answers Law 3 ("what is this?") with stat cards +
// a tiny static mini-map as an appetizer for the full Map page.

import Link from "next/link";
import { useRepoData } from "./RepoDataContext.jsx";
import { colorForFolder } from "../../../graphUtils.js";
import { COLORS, SPACING, RADIUS } from "../../../theme.js";

function StatCard({ label, value }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.card, padding: SPACING.lg, flex: 1, minWidth: 140,
    }}>
      <p style={{ color: COLORS.textSecondary, fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </p>
      <p style={{ color: COLORS.textPrimary, fontSize: 17, fontWeight: 600, margin: `${SPACING.xs}px 0 0`, wordBreak: "break-all" }}>
        {value}
      </p>
    </div>
  );
}

function healthColor(score) {
  if (score >= 70) return COLORS.success;
  if (score >= 40) return COLORS.warning;
  return COLORS.error;
}

export default function OverviewPage() {
  const { data, loading, error, owner, repo } = useRepoData();

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: SPACING.md }}>
        <div className="skeleton" style={{ height: 64, borderRadius: RADIUS.card }} />
        <div style={{ display: "flex", gap: SPACING.md, flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 70, flex: 1, minWidth: 140, borderRadius: RADIUS.card }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: RADIUS.card }} />
      </div>
    );
  }

  if (error) {
    return <p style={{ color: COLORS.error }}>⚠ {error}</p>;
  }

  const { stats, fileCount, folderGraph, ai } = data;
  // Law: if the AI call ever fails or isn't configured (ai === null), the
  // page still renders fully - this derived one-liner replaces the AI
  // summary strip instead of showing an error box.
  const summary = ai?.overview
    ?? `A JavaScript/TypeScript project with ${fileCount} source files. Core: ${stats.coreFolder ?? "root"}/.`;

  const entryFolder = stats.entryPoint?.includes("/")
    ? stats.entryPoint.split("/")[0]
    : "(root)";

  return (
    <div>
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.card, padding: SPACING.lg, marginBottom: SPACING.lg,
      }}>
        <p style={{ color: COLORS.textSecondary, fontSize: 11, textTransform: "uppercase", margin: 0, letterSpacing: 0.5 }}>
          What is this?{ai?.overview && <span style={{ color: COLORS.accent, marginLeft: SPACING.xs }}>AI-generated</span>}
        </p>
        <p style={{ color: COLORS.textPrimary, fontSize: 15, marginTop: SPACING.xs, marginBottom: 0, lineHeight: 1.6 }}>
          {summary}
        </p>
      </div>

      <div style={{ display: "flex", gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: "wrap" }}>
        <StatCard label="Starts at" value={stats.entryPoint ?? "unknown"} />
        <StatCard label="Engine room" value={stats.coreFolder ? `${stats.coreFolder}/` : "unknown"} />
        <StatCard label="Everything relies on" value={stats.topFile ?? "unknown"} />
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.card, padding: SPACING.lg, flex: 1, minWidth: 140,
        }}>
          <p style={{ color: COLORS.textSecondary, fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Health
          </p>
          <p style={{ color: healthColor(stats.healthScore), fontSize: 17, fontWeight: 600, margin: `${SPACING.xs}px 0 0` }}>
            {stats.healthScore} / 100
          </p>
        </div>
      </div>

      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.card, padding: SPACING.lg, marginBottom: SPACING.lg,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p style={{ color: COLORS.textSecondary, fontSize: 11, textTransform: "uppercase", margin: 0, letterSpacing: 0.5 }}>
            The shape of the project
          </p>
          <Link href={`/r/${owner}/${repo}/map`} style={{ color: COLORS.accent, fontSize: 13, textDecoration: "none" }}>
            Open the full map →
          </Link>
        </div>

        {/* Static appetizer, not the real map - Law 2 (30-Shape Law) caps
            this at 8 boxes, not the file count. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.md }}>
          {folderGraph.nodes.slice(0, 8).map((f) => {
            const isEntryFolder = f.id === entryFolder;
            return (
              <div
                key={f.id}
                style={{
                  border: `1px solid ${isEntryFolder ? COLORS.accent : COLORS.border}`,
                  borderRadius: 8, padding: `${SPACING.sm}px ${SPACING.md}px`,
                  background: COLORS.bg, position: "relative", minWidth: 90,
                }}
              >
                {isEntryFolder && (
                  <span style={{
                    position: "absolute", top: -9, left: 8, background: COLORS.accent,
                    color: COLORS.bg, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                  }}>
                    START
                  </span>
                )}
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 600,
                  color: f.isSupport ? COLORS.graphSupport : colorForFolder(f.id),
                }}>
                  {f.id}/
                </p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textSecondary }}>{f.fileCount} files</p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: SPACING.md, flexWrap: "wrap" }}>
        <Link
          href={`/r/${owner}/${repo}/tour`}
          className="btn-accent"
          style={{ padding: "10px 18px", fontSize: 14, textDecoration: "none", display: "inline-block" }}
        >
          Start the guided tour →
        </Link>
        <Link
          href={`/r/${owner}/${repo}/health`}
          className="btn"
          style={{ padding: "10px 18px", fontSize: 14, textDecoration: "none", display: "inline-block" }}
        >
          See the health report →
        </Link>
      </div>
    </div>
  );
}
