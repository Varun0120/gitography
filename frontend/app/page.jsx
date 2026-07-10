"use client";

// Week 1 frontend: paste a URL, hit the API, show the file list.
// Week 3 replaces the <ul> with the interactive Cytoscape.js map.

import { useState } from "react";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px" }}>
      <h1 style={{ fontSize: 40, marginBottom: 4 }}>
        Code<span style={{ color: "#4da3ff" }}>Map</span>
      </h1>
      <p style={{ color: "#8b98a9", marginTop: 0 }}>
        Google Maps for a codebase — paste a public GitHub repo to begin.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="https://github.com/owner/repo"
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 8,
            border: "1px solid #2a3546", background: "#161d2b",
            color: "#e6edf3", fontSize: 15,
          }}
        />
        <button
          onClick={analyze}
          disabled={loading || !repoUrl}
          style={{
            padding: "12px 22px", borderRadius: 8, border: "none",
            background: loading ? "#2a3546" : "#2f7fe0",
            color: "white", fontSize: 15, cursor: "pointer",
          }}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#ff7b7b", marginTop: 16 }}>⚠ {error}</p>
      )}

      {result && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>
            {result.repo} — {result.fileCount} source files
          </h2>
          <ul style={{ lineHeight: 1.9, color: "#b7c2d0", fontSize: 14 }}>
            {result.files.map((f) => (
              <li key={f.path}>
                {f.path}{" "}
                <span style={{ color: "#5b6878" }}>({f.size} bytes)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
