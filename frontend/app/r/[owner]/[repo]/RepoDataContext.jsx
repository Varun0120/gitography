"use client";

// RepoDataContext - fetches the repo's analysis once per (owner, repo) and
// shares it with every page under /r/[owner]/[repo]/*, plus the global
// Simple/Developer mode toggle. Each page reads via useRepoData() instead
// of re-fetching itself.

import { createContext, useContext, useEffect, useState } from "react";

const RepoDataContext = createContext(null);

export function RepoDataProvider({ owner, repo, children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("simple"); // "simple" | "developer"

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: `https://github.com/${owner}/${repo}` }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Something went wrong");
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  return (
    <RepoDataContext.Provider value={{ data, error, loading, mode, setMode, owner, repo }}>
      {children}
    </RepoDataContext.Provider>
  );
}

export function useRepoData() {
  const ctx = useContext(RepoDataContext);
  if (!ctx) throw new Error("useRepoData must be used inside RepoDataProvider");
  return ctx;
}
