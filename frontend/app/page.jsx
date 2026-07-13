"use client";

// Home - Page 1 of Gitography 2.0. Job: get a URL pasted with zero
// confusion, nothing else. The old inline graph view moved to
// /r/[owner]/[repo] and its sub-pages.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, SPACING, RADIUS } from "./theme.js";

const EXAMPLES = ["axios/axios", "expressjs/express", "chalk/chalk"];

// "Progress theater" (blueprint's term) - we don't have real incremental
// progress events from the backend (one POST /analyze call, no streaming),
// so a timed sequence of honest-sounding stages keeps a 10-30s wait
// feeling alive instead of a static spinner.
const PROGRESS_STAGES = [
  "Downloading the repo…",
  "Reading the files…",
  "Drawing the map…",
  "Writing your summary…",
];

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stageIndex, setStageIndex] = useState(0);
  const stageTimer = useRef(null);

  useEffect(() => {
    if (!loading) {
      clearInterval(stageTimer.current);
      setStageIndex(0);
      return;
    }
    stageTimer.current = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, PROGRESS_STAGES.length - 1));
    }, 1400);
    return () => clearInterval(stageTimer.current);
  }, [loading]);

  async function analyze(urlOverride) {
    const url = urlOverride ?? repoUrl;
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const [owner, repo] = data.repo.split("/");
      router.push(`/r/${owner}/${repo}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  function tryExample(slug) {
    const url = `https://github.com/${slug}`;
    setRepoUrl(url);
    analyze(url);
  }

  if (loading) {
    return (
      <main style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: SPACING.lg,
        padding: SPACING.xl, textAlign: "center",
      }}>
        <div className="skeleton" style={{ width: 260, height: 20 }} />
        <p style={{ color: COLORS.textPrimary, fontSize: 16, margin: 0 }}>{PROGRESS_STAGES[stageIndex]}</p>
        <p style={{ color: COLORS.textSecondary, fontSize: 13, margin: 0 }}>
          This can take up to 30 seconds on larger repos.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: `${SPACING.xxl * 2}px ${SPACING.xl}px`, textAlign: "center" }}>
      <h1 style={{ fontSize: 40, marginBottom: SPACING.xs, fontWeight: 600 }}>
        Git<span style={{ color: COLORS.accent }}>ography</span>
      </h1>
      <p style={{ color: COLORS.textSecondary, fontSize: 17, marginTop: 0, marginBottom: SPACING.xl, lineHeight: 1.5 }}>
        Understand any GitHub project in one minute.<br />
        No setup. No jargon. Just paste a link.
      </p>

      <div style={{ display: "flex", gap: SPACING.sm }}>
        <input
          className="input-field"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="https://github.com/owner/repo"
          style={{ flex: 1, padding: "12px 14px", fontSize: 15, boxSizing: "border-box" }}
        />
        <button
          className="btn-accent"
          onClick={() => analyze()}
          disabled={!repoUrl}
          style={{ padding: "12px 22px", fontSize: 15 }}
        >
          Analyze
        </button>
      </div>

      {error && <p style={{ color: COLORS.error, marginTop: SPACING.md }}>⚠ {error}</p>}

      <div style={{ marginTop: SPACING.lg, display: "flex", gap: SPACING.sm, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Or try an example:</span>
        {EXAMPLES.map((slug) => (
          <button key={slug} className="btn" onClick={() => tryExample(slug)} style={{ padding: "6px 12px", fontSize: 13 }}>
            {slug.split("/")[1]}
          </button>
        ))}
      </div>

      <div style={{ marginTop: SPACING.xxl * 2 }}>
        <p style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.md }}>
          How it works
        </p>
        <div style={{ display: "flex", gap: SPACING.md, justifyContent: "center", flexWrap: "wrap" }}>
          {["Paste a link", "We read the code", "You get the story"].map((step, i) => (
            <div
              key={step}
              style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.card, padding: SPACING.lg, width: 160, textAlign: "left",
              }}
            >
              <p style={{ color: COLORS.accent, fontWeight: 700, margin: 0, fontSize: 18 }}>{i + 1}</p>
              <p style={{ color: COLORS.textPrimary, margin: `${SPACING.xs}px 0 0`, fontSize: 13 }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
