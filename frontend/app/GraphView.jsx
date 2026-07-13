"use client";

// GraphView - renders { nodes, edges } as an interactive Cytoscape.js graph.
// Owns its own selection + search state; the side panel lives right here
// since both read/write the same "which node is active" state.

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { topFolder, colorForFolder, basename, computeDegrees, sizeForDegree } from "./graphUtils.js";
import { COLORS, SPACING, RADIUS } from "./theme.js";

const HUB_COUNT = 10;

// Nodes with zero connections never enter the physics simulation - with
// nothing pulling on them, force-directed layouts just dump them in an
// arbitrary grid, which reads as a bug rather than data. They're rendered
// separately instead (see the orphan panel in the component below).
function splitByConnectivity(nodes, degree) {
  const connected = [];
  const orphans = [];
  for (const n of nodes) {
    (degree.get(n.id) > 0 ? connected : orphans).push(n);
  }
  return { connected, orphans };
}

function buildElements(connectedNodes, edges, degree) {
  const maxDegree = Math.max(0, ...degree.values());
  const hubIds = new Set(
    [...connectedNodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, HUB_COUNT)
      .map((n) => n.id)
  );

  const nodeElements = connectedNodes.map((n) => {
    const folder = topFolder(n.path);
    return {
      data: {
        id: n.id,
        path: n.path,
        name: basename(n.path),
        size: n.size,
        folder,
        color: colorForFolder(folder),
        nodeSize: sizeForDegree(degree.get(n.id) ?? 0, maxDegree),
      },
      classes: hubIds.has(n.id) ? "hub" : "",
    };
  });

  const edgeElements = edges.map((e) => ({
    data: { id: `${e.from}=>${e.to}`, source: e.from, target: e.to },
  }));

  return [...nodeElements, ...edgeElements];
}

// Build a side-panel-shaped data object for an orphan node - orphans never
// go into Cytoscape, so there's no cy.data() to read; this makes one by
// hand using the exact same shape so the side panel doesn't need to care
// where a selection came from.
function orphanAsSelection(n, degree, maxDegree) {
  const folder = topFolder(n.path);
  return {
    id: n.id,
    path: n.path,
    name: basename(n.path),
    size: n.size,
    folder,
    color: colorForFolder(folder),
    nodeSize: sizeForDegree(degree.get(n.id) ?? 0, maxDegree),
  };
}

// Pill-chip label style shared by hub/selected/hovered nodes - a small
// rounded background behind the text keeps it legible over crossing edges.
const LABEL_STYLE = {
  color: COLORS.textPrimary,
  "font-size": 10,
  "font-family": "Inter, system-ui, sans-serif",
  "text-valign": "top",
  "text-margin-y": -8,
  "text-background-color": COLORS.card,
  "text-background-opacity": 0.9,
  "text-background-padding": 4,
  "text-border-width": 1,
  "text-border-color": COLORS.border,
  "text-border-opacity": 1,
};

const STYLE = [
  {
    selector: "node",
    style: {
      "background-color": "data(color)",
      width: "data(nodeSize)",
      height: "data(nodeSize)",
      "border-width": 1,
      "border-color": COLORS.bg,
    },
  },
  {
    // Hub files (most-connected) are always labeled, like a map only
    // naming major cities at a low zoom level.
    selector: ".hub",
    style: { label: "data(name)", "text-margin-y": -6, ...LABEL_STYLE },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": COLORS.graphEdge,
      "target-arrow-color": COLORS.graphEdge,
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.6,
      "curve-style": "bezier",
      opacity: 0.4,
    },
  },
  {
    // Only the edges touching a hovered or selected node light up - with
    // 150+ edges on screen, showing every line at full brightness makes
    // all of them equally illegible.
    selector: ".edge-active",
    style: {
      opacity: 1,
      width: 2,
      "line-color": COLORS.accent,
      "target-arrow-color": COLORS.accent,
    },
  },
  {
    selector: ".selected",
    style: { "border-width": 3, "border-color": COLORS.accent, label: "data(name)", ...LABEL_STYLE },
  },
  {
    selector: ".hovered",
    style: { "border-width": 3, "border-color": COLORS.accent, label: "data(name)", ...LABEL_STYLE },
  },
  {
    selector: ".highlighted",
    style: { "border-width": 3, "border-color": COLORS.accent },
  },
  {
    selector: ".dimmed",
    style: { opacity: 0.12 },
  },
];

export default function GraphView({ graph }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const selectedIdRef = useRef(null); // mirrors `selected` for use inside event handlers
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [showOrphans, setShowOrphans] = useState(false);

  const degree = useMemo(() => computeDegrees(graph.nodes, graph.edges), [graph]);
  const maxDegree = useMemo(() => Math.max(0, ...degree.values()), [degree]);
  const { connected, orphans } = useMemo(
    () => splitByConnectivity(graph.nodes, degree),
    [graph, degree]
  );
  const folders = useMemo(
    () => [...new Set(graph.nodes.map((n) => topFolder(n.path)))].sort(),
    [graph]
  );

  // (Re)build the graph whenever a new analysis result comes in.
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(connected, graph.edges, degree),
      style: STYLE,
      layout: {
        name: "cose",
        animate: false,
        padding: 40,
        // Spacing tuning: cose's defaults pack everything into the corner
        // on a fresh canvas. Pushed further apart again here since orphan
        // removal alone wasn't enough room for a 200+ node repo like axios.
        nodeRepulsion: 20000,
        idealEdgeLength: 120,
        componentSpacing: 150,
        nodeOverlap: 20,
      },
    });

    cy.on("layoutstop", () => {
      cy.resize();
      cy.fit(undefined, 30);
    });

    function clearActiveEdges() {
      cy.edges().removeClass("edge-active");
    }

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      node.addClass("hovered");
      node.connectedEdges().addClass("edge-active");
    });
    cy.on("mouseout", "node", (evt) => {
      const node = evt.target;
      node.removeClass("hovered");
      // Don't clear edges belonging to the currently-selected node.
      if (node.id() !== selectedIdRef.current) {
        node.connectedEdges().removeClass("edge-active");
      }
    });

    cy.on("tap", "node", (evt) => {
      clearActiveEdges();
      const node = evt.target;
      node.connectedEdges().addClass("edge-active");
      selectedIdRef.current = node.id();
      setSelected(node.data());
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        clearActiveEdges();
        selectedIdRef.current = null;
        setSelected(null);
      }
    });

    cyRef.current = cy;
    return () => cy.destroy();
  }, [graph]);

  // Search: highlight matching nodes, dim everything else, and zoom to fit
  // the matches so you don't have to hunt for them on a big graph.
  // Debounced + cancels any in-flight animation first - otherwise every
  // keystroke queues its own pan/zoom and they play back-to-back, which
  // looks like the view endlessly drifting sideways instead of settling.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const timer = setTimeout(() => {
      cy.stop(true, true); // cancel any animation still in flight
      cy.nodes().removeClass("highlighted dimmed");

      const term = search.trim().toLowerCase();
      if (!term) return;

      const matches = cy.nodes().filter((n) => n.data("path").toLowerCase().includes(term));
      if (matches.length === 0) return;

      cy.nodes().difference(matches).addClass("dimmed");
      matches.addClass("highlighted");
      cy.animate({ fit: { eles: matches, padding: 60 }, duration: 300 });
    }, 200); // wait for a short pause in typing before moving the camera

    return () => clearTimeout(timer);
  }, [search]);

  function zoomBy(factor) {
    const cy = cyRef.current;
    if (!cy) return;
    const { w, h } = { w: cy.width(), h: cy.height() };
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: w / 2, y: h / 2 } });
  }

  function fitView() {
    cyRef.current?.fit(undefined, 30);
  }

  function selectOrphan(n) {
    selectedIdRef.current = null; // not a cy node, so no edges to manage
    cyRef.current?.edges().removeClass("edge-active");
    cyRef.current?.nodes().removeClass("selected");
    setSelected(orphanAsSelection(n, degree, maxDegree));
  }

  const importsOf = selected
    ? graph.edges.filter((e) => e.from === selected.id).map((e) => e.to)
    : [];
  const importedByOf = selected
    ? graph.edges.filter((e) => e.to === selected.id).map((e) => e.from)
    : [];

  return (
    <div style={{ marginTop: SPACING.lg }}>
      {/* Legend: what each color means. Without this, color-coding is
          just decoration - nobody can tell what a color represents. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACING.md, marginBottom: SPACING.sm, fontSize: 12, color: COLORS.textSecondary }}>
        {folders.map((f) => (
          <span key={f} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: colorForFolder(f), display: "inline-block",
            }} />
            {f}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: SPACING.lg }}>
        {/* minWidth: 0 stops a flexbox+canvas feedback loop: without it, this
            column tries to grow to fit the canvas's own pixel size, which
            just got resized to match the column - each resize retriggers the
            other, and the whole layout visibly drifts sideways forever. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files by path…"
            style={{ width: "100%", padding: "10px 12px", marginBottom: SPACING.sm, fontSize: 14, boxSizing: "border-box" }}
          />
          <div style={{ position: "relative" }}>
            <div
              ref={containerRef}
              style={{
                width: "100%", height: 560, borderRadius: RADIUS.card,
                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                overflow: "hidden",
              }}
            />
            <div style={{ position: "absolute", top: SPACING.sm, right: SPACING.sm, display: "flex", flexDirection: "column", gap: SPACING.xs }}>
              {[
                ["+", () => zoomBy(1.25)],
                ["–", () => zoomBy(1 / 1.25)],
                ["Fit", fitView],
              ].map(([label, onClick]) => (
                <button key={label} className="btn" onClick={onClick} style={{ width: 32, height: 32, fontSize: 14 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {orphans.length > 0 && (
            <div style={{ marginTop: SPACING.sm, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: SPACING.md }}>
              <button
                className="link-btn"
                onClick={() => setShowOrphans((v) => !v)}
                style={{ fontSize: 13, padding: 0 }}
              >
                {showOrphans ? "▾" : "▸"} {orphans.length} file{orphans.length === 1 ? "" : "s"} with no import connections
              </button>
              {showOrphans && (
                <ul style={{
                  margin: `${SPACING.sm}px 0 0`, paddingLeft: 18, maxHeight: 160, overflowY: "auto",
                  fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.8,
                }}>
                  {orphans.map((n) => (
                    <li key={n.id}>
                      <button
                        className="link-btn"
                        onClick={() => selectOrphan(n)}
                        style={{ fontSize: 13, padding: 0, textAlign: "left" }}
                      >
                        {n.path}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            width: 280, flexShrink: 0, padding: SPACING.lg, borderRadius: RADIUS.card,
            border: `1px solid ${COLORS.border}`, background: COLORS.card,
            color: COLORS.textSecondary, fontSize: 13, height: "fit-content",
          }}
        >
          {!selected && <p style={{ color: COLORS.textSecondary }}>Click a node to inspect it.</p>}
          {selected && (
            <>
              <p style={{ color: COLORS.textPrimary, fontWeight: 600, wordBreak: "break-all", marginTop: 0 }}>
                {selected.path}
              </p>
              <p style={{ color: COLORS.textSecondary }}>{selected.size} bytes · folder: {selected.folder}</p>

              <p style={{ marginTop: SPACING.lg, marginBottom: SPACING.xs, color: COLORS.textPrimary, fontWeight: 600 }}>
                Imports ({importsOf.length})
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                {importsOf.map((p) => <li key={p}>{p}</li>)}
                {importsOf.length === 0 && <li style={{ color: COLORS.textSecondary }}>none</li>}
              </ul>

              <p style={{ marginTop: SPACING.lg, marginBottom: SPACING.xs, color: COLORS.textPrimary, fontWeight: 600 }}>
                Imported by ({importedByOf.length})
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                {importedByOf.map((p) => <li key={p}>{p}</li>)}
                {importedByOf.length === 0 && <li style={{ color: COLORS.textSecondary }}>none</li>}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
