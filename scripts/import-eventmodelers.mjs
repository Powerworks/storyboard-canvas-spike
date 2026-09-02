#!/usr/bin/env node
// Import adapter: parses eventmodelers.ai board exports (as transcribed
// verbatim into requirements.md/research.md by the PowerGym-style build
// kit) into this canvas's node/edge JSON schema.
//
// Source shape (from real PowerGym specs, not assumed):
//   requirements.md "## Event Model Detail (Source of Truth)" section:
//     ### Slice: <Name> (`<uuid>`, status: <status>, type: STATE_CHANGE|AUTOMATION)
//     **<ElementName>** (<command|event|automation/processor>, id `<uuid>`, ...)
//     Dependencies: ← <Other> (<TYPE>)   [or →]
//   research.md "## UI Reference" section:
//     _(from slice: <SliceName>)_
//     **<ScreenName>** (screen, id `<uuid>`, ...)
//     Dependencies: → <Command> (COMMAND)
//
// Usage: node scripts/import-eventmodelers.mjs <specDir> [<specDir> ...] > board.json

import { readFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

/** @typedef {{ id: string, label: string, laneId: string, sliceId: string, sliceType: string, specId: string }} ImportedNode */
/** @typedef {{ source: string, target: string, label: string }} ImportedEdge */

const SLICE_RE = /^### Slice: (.+?) \(`([^`]+)`, status: (\S+), type: (\S+)\)$/;
const ELEMENT_RE = /^\*\*(.+?)\*\* \((command|event|automation\/processor|screen)(?:, id `([^`]+)`)?/;
const DEP_RE = /^Dependencies: (←|→) (.+?) \((\w+)\)/;
const SCREEN_CONTEXT_RE = /^_\(from slice: (.+?)\)_$/;

function elementTypeToLane(elementType, sliceType) {
  if (elementType === "screen") return "screen";
  if (elementType === "event") return "outcome";
  if (elementType === "automation/processor") return "action";
  if (elementType === "command") {
    // In an AUTOMATION-type slice, the command is the automation's own
    // trigger — redundant with the automation/processor node itself, so
    // it's skipped rather than duplicated (matches the hand-built
    // Member Registration reference import).
    return sliceType === "AUTOMATION" ? null : "action";
  }
  return null;
}

/** Parse one spec's requirements.md Event Model Detail section. */
function parseRequirements(text, specId) {
  /** @type {ImportedNode[]} */
  const nodes = [];
  /** @type {ImportedEdge[]} */
  const edges = [];
  const lines = text.split("\n");

  let currentSlice = null;
  let currentElementId = null;
  let inDetailSection = false;

  for (const line of lines) {
    if (line.startsWith("## Event Model Detail")) {
      inDetailSection = true;
      continue;
    }
    if (!inDetailSection) continue;

    const sliceMatch = line.match(SLICE_RE);
    if (sliceMatch) {
      currentSlice = { name: sliceMatch[1], id: sliceMatch[2], status: sliceMatch[3], type: sliceMatch[4] };
      continue;
    }

    const elMatch = line.match(ELEMENT_RE);
    if (elMatch && currentSlice) {
      const [, name, elementType, elId] = elMatch;
      const laneId = elementTypeToLane(elementType, currentSlice.type);
      currentElementId = elId ? `${specId}:${elId}` : null;
      if (laneId && currentElementId) {
        nodes.push({
          id: currentElementId,
          label: name,
          laneId,
          sliceId: currentSlice.id,
          sliceType: currentSlice.type,
          specId,
        });
      } else {
        currentElementId = null; // skipped element (e.g. redundant command) — no edges to it
      }
      continue;
    }

    const depMatch = line.match(DEP_RE);
    if (depMatch && currentElementId) {
      const [, arrow, otherName] = depMatch;
      // Dependency target is named, not id-linked in the source text —
      // resolved to a node id in a second pass once all specs are parsed
      // (see resolveEdges below), since the referenced element may be a
      // Screen defined only in research.md, parsed separately.
      edges.push(
        arrow === "←"
          ? { source: `NAME:${otherName}`, target: currentElementId, label: "produces" }
          : { source: currentElementId, target: `NAME:${otherName}`, label: "produces" },
      );
    }
  }

  return { nodes, edges };
}

/** Parse research.md's UI Reference section for Screen elements + their Dependencies. */
function parseScreens(text, specId) {
  /** @type {ImportedNode[]} */
  const nodes = [];
  /** @type {ImportedEdge[]} */
  const edges = [];
  const lines = text.split("\n");

  let inUiRef = false;
  let currentSliceName = null;
  let currentScreenId = null;

  for (const line of lines) {
    if (line.startsWith("## UI Reference")) {
      inUiRef = true;
      continue;
    }
    if (!inUiRef) continue;

    const ctxMatch = line.match(SCREEN_CONTEXT_RE);
    if (ctxMatch) {
      currentSliceName = ctxMatch[1];
      continue;
    }

    const elMatch = line.match(ELEMENT_RE);
    if (elMatch && elMatch[2] === "screen") {
      const [, name, , elId] = elMatch;
      currentScreenId = elId ? `${specId}:${elId}` : null;
      if (currentScreenId) {
        nodes.push({ id: currentScreenId, label: name, laneId: "screen", sliceId: currentSliceName ?? "", sliceType: "SCREEN", specId });
      }
      continue;
    }

    const depMatch = line.match(DEP_RE);
    if (depMatch && currentScreenId) {
      const [, arrow, otherName] = depMatch;
      edges.push(
        arrow === "→"
          ? { source: currentScreenId, target: `NAME:${otherName}`, label: "triggers" }
          : { source: `NAME:${otherName}`, target: currentScreenId, label: "triggers" },
      );
    }
  }

  return { nodes, edges };
}

/** Second pass: resolve NAME:<label> edge endpoints to real node ids by
 * matching against every node's label within the same spec. Cross-spec
 * dependencies (a different feature entirely) are left unresolved and
 * dropped with a warning — out of scope for a single-spec import. */
function resolveEdges(nodes, edges, specId) {
  const byLabel = new Map(nodes.filter((n) => n.specId === specId).map((n) => [n.label, n.id]));
  const resolved = [];
  let dropped = 0;
  for (const e of edges) {
    const source = e.source.startsWith("NAME:") ? byLabel.get(e.source.slice(5)) : e.source;
    const target = e.target.startsWith("NAME:") ? byLabel.get(e.target.slice(5)) : e.target;
    if (source && target) {
      resolved.push({ id: `e-${source}-${target}`, source, target, label: e.label });
    } else {
      dropped++;
    }
  }
  if (dropped > 0) {
    console.error(`[${specId}] dropped ${dropped} edge(s) with unresolved endpoints (likely cross-spec dependencies, or a skipped redundant command)`);
  }
  return resolved;
}

/** The source text never states "this Action produces this Outcome"
 * explicitly — they're implicitly paired by both belonging to the same
 * Slice block. Inferred here, not invented: within one slice, an
 * Action-lane node followed by an Outcome-lane node is exactly the
 * Command→Event pairing every STATE_CHANGE/AUTOMATION slice models. */
function inferProducesEdges(nodes) {
  const bySlice = new Map();
  for (const n of nodes) {
    if (n.laneId !== "action" && n.laneId !== "outcome") continue;
    if (!bySlice.has(n.sliceId)) bySlice.set(n.sliceId, []);
    bySlice.get(n.sliceId).push(n);
  }
  const edges = [];
  for (const [, members] of bySlice) {
    const action = members.find((n) => n.laneId === "action");
    const outcome = members.find((n) => n.laneId === "outcome");
    if (action && outcome) {
      edges.push({ id: `e-${action.id}-${outcome.id}`, source: action.id, target: outcome.id, label: "produces" });
    }
  }
  return edges;
}

function importSpec(specDir) {
  const specId = basename(specDir);
  const reqPath = join(specDir, "requirements.md");
  const resPath = join(specDir, "research.md");
  if (!existsSync(reqPath)) {
    console.error(`[${specId}] missing requirements.md — skipped`);
    return { nodes: [], edges: [] };
  }
  const reqText = readFileSync(reqPath, "utf-8");
  const resText = existsSync(resPath) ? readFileSync(resPath, "utf-8") : "";

  const req = parseRequirements(reqText, specId);
  const scr = parseScreens(resText, specId);

  const allNodes = [...req.nodes, ...scr.nodes];
  const explicitEdges = resolveEdges(allNodes, [...req.edges, ...scr.edges], specId);
  const producesEdges = inferProducesEdges(allNodes);

  return { nodes: allNodes, edges: [...explicitEdges, ...producesEdges] };
}

const specDirs = process.argv.slice(2);
if (specDirs.length === 0) {
  console.error("Usage: node import-eventmodelers.mjs <specDir> [<specDir> ...]");
  process.exit(1);
}

let allNodes = [];
let allEdges = [];
for (const dir of specDirs) {
  const { nodes, edges } = importSpec(dir);
  allNodes = allNodes.concat(nodes);
  allEdges = allEdges.concat(edges);
  console.error(`[${basename(dir)}] ${nodes.length} nodes, ${edges.length} edges`);
}

// Dedupe: requirements.md and research.md each independently encode a
// Screen<->Action relationship from their own side (requirements.md's
// command lists "Dependencies: ← <Screen>"; research.md's screen entry
// lists "Dependencies: → <Command>") — same edge, two source files.
// Keep the first occurrence per (source,target) pair.
const seen = new Set();
const dedupedEdges = allEdges.filter((e) => {
  const key = `${e.source}->${e.target}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
if (dedupedEdges.length < allEdges.length) {
  console.error(`Deduped ${allEdges.length - dedupedEdges.length} duplicate edge(s) (same source/target from both requirements.md and research.md)`);
}

console.log(JSON.stringify({ nodes: allNodes, edges: dedupedEdges }, null, 2));
