"use client";

// Shared layout for every /r/[owner]/[repo]/* page: the persistent top bar
// (repo name, Overview/Map/Tour/Health tabs, Simple/Developer toggle) plus
// the RepoDataProvider so every page underneath can read the same fetch.

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { RepoDataProvider, useRepoData } from "./RepoDataContext.jsx";
import { COLORS, SPACING } from "../../../theme.js";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/map", label: "Map" },
  { href: "/tour", label: "Tour" },
  { href: "/health", label: "Health" },
];

function TopBar() {
  const { owner, repo, mode, setMode } = useRepoData();
  const pathname = usePathname();
  const base = `/r/${owner}/${repo}`;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: `${SPACING.md}px ${SPACING.xl}px`, borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.card, flexWrap: "wrap", gap: SPACING.sm,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING.xl, flexWrap: "wrap" }}>
        <Link href="/" style={{ color: COLORS.textPrimary, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
          Git<span style={{ color: COLORS.accent }}>ography</span>
        </Link>
        <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>{owner}/{repo}</span>
        <nav style={{ display: "flex", gap: SPACING.lg }}>
          {TABS.map((t) => {
            const href = base + t.href;
            const active = pathname === href;
            return (
              <Link
                key={t.href}
                href={href}
                style={{
                  color: active ? COLORS.accent : COLORS.textSecondary,
                  fontSize: 14, textDecoration: "none", fontWeight: active ? 600 : 400,
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ display: "flex", gap: SPACING.xs, fontSize: 13 }}>
        {["simple", "developer"].map((m) => (
          <button
            key={m}
            className="btn"
            onClick={() => setMode(m)}
            style={{
              padding: "6px 12px", textTransform: "capitalize", fontSize: 13,
              background: mode === m ? COLORS.accent : "transparent",
              color: mode === m ? COLORS.bg : COLORS.textPrimary,
              borderColor: mode === m ? COLORS.accent : COLORS.border,
            }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RepoLayout({ children }) {
  const { owner, repo } = useParams();
  return (
    <RepoDataProvider owner={owner} repo={repo}>
      <TopBar />
      <div style={{ padding: SPACING.xl, maxWidth: 1120, margin: "0 auto" }}>{children}</div>
    </RepoDataProvider>
  );
}
