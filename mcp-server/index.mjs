#!/usr/bin/env node
// MCP server exposing EUnomia's board data (currently PowerGym's imported
// eventmodelers.ai story-arcs) to any MCP-compatible harness.
//
// Design note (Ouroboros-inspired reframe, decided 2026-09-02): rather than
// hand-building a per-harness export adapter, expose the board through one
// protocol every major harness already speaks. The canonical data stays the
// same JSON schema the import adapter and the React app both already use
// (src/data/powergym-board.json) — this server is a thin protocol wrapper
// around it, not a second source of truth.
//
// v2 (2026-09-14) adds the verification-spine surface: slice listing,
// Layer 2 Example Maps, and the specifications[] export (WS3). Still
// read-only — writing back to the board (Agentic Modeling) is separate,
// larger scope, not this file.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { exportSpecifications } from "../scripts/export-specifications.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const board = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "powergym-board.json"), "utf-8"));

function specIds() {
  const seen = new Set();
  const order = [];
  for (const n of board.nodes) {
    if (!seen.has(n.specId)) {
      seen.add(n.specId);
      order.push(n.specId);
    }
  }
  return order;
}

/** Slices for one spec (or every spec when specId is omitted), in order of
 * first appearance, labeled by their Screen node when present — the source
 * board carries no separate slice title field (same logic as loadBoard.ts). */
function slices(specId) {
  const byId = new Map();
  const order = [];
  for (const n of board.nodes) {
    if (specId && n.specId !== specId) continue;
    if (!byId.has(n.sliceId)) {
      byId.set(n.sliceId, { sliceId: n.sliceId, specId: n.specId, sliceType: n.sliceType, label: n.label });
      order.push(n.sliceId);
    }
    if (n.laneId === "screen") byId.get(n.sliceId).label = n.label;
  }
  return order.map((id) => {
    const s = byId.get(id);
    return {
      sliceId: s.sliceId,
      specId: s.specId,
      sliceType: s.sliceType,
      label: s.label,
      hasExampleMap: Boolean(board.seedExampleMaps?.[id]),
    };
  });
}

const server = new McpServer({ name: "eunomia", version: "0.2.0" });

server.tool(
  "list_story_arcs",
  "List every story-arc (spec) currently on the board, with node/edge counts. Use this before get_story_arc to see what's available.",
  {},
  async () => {
    const arcs = specIds().map((specId) => {
      const nodes = board.nodes.filter((n) => n.specId === specId);
      const edges = board.edges.filter(
        (e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target),
      );
      return { specId, nodeCount: nodes.length, edgeCount: edges.length };
    });
    return { content: [{ type: "text", text: JSON.stringify(arcs, null, 2) }] };
  },
);

server.tool(
  "get_story_arc",
  "Get the full nodes and edges for one story-arc, in the canvas's own node/edge schema (id, label, laneId, sliceId, sliceType for nodes; source, target, label for edges). laneId is one of actor/screen/action/outcome/ownedData.",
  { specId: z.string().describe("A story-arc id from list_story_arcs, e.g. '002a-member-registration'") },
  async ({ specId }) => {
    const nodes = board.nodes.filter((n) => n.specId === specId);
    if (nodes.length === 0) {
      return {
        content: [{ type: "text", text: `No story-arc found with id "${specId}". Call list_story_arcs to see valid ids.` }],
        isError: true,
      };
    }
    const edges = board.edges.filter(
      (e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target),
    );
    return { content: [{ type: "text", text: JSON.stringify({ nodes, edges }, null, 2) }] };
  },
);

server.tool(
  "search_elements",
  "Search across every story-arc for nodes whose label contains the query (case-insensitive substring match). Use this to find which slice/story-arc handles a given concept without knowing the specId up front.",
  { query: z.string().min(1) },
  async ({ query }) => {
    const q = query.toLowerCase();
    const matches = board.nodes.filter((n) => n.label.toLowerCase().includes(q));
    return { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] };
  },
);

server.tool(
  "list_slices",
  "List slices (vertical buildable units), optionally filtered to one story-arc. Each entry has sliceId, specId, sliceType, a human label, and hasExampleMap (whether a Layer 2 Example Map was seeded from the source). Use this before get_example_map or export_specifications.",
  { specId: z.string().optional().describe("Optional story-arc id to filter by; omit to list every slice on the board.") },
  async ({ specId }) => {
    return { content: [{ type: "text", text: JSON.stringify(slices(specId), null, 2) }] };
  },
);

server.tool(
  "get_example_map",
  "Get a slice's Layer 2 Example Map (Rule/Example/Question cards, each Example carrying a Given/When/Then scenario) as nodes/edges. Only slices whose source had Functional Requirements/Acceptance Criteria have a seed map (see hasExampleMap in list_slices).",
  { sliceId: z.string().describe("A slice id from list_slices, e.g. a uuid.") },
  async ({ sliceId }) => {
    const seed = board.seedExampleMaps?.[sliceId];
    if (!seed) {
      return {
        content: [{ type: "text", text: `No seed Example Map for slice "${sliceId}". Only slices whose source spec had Functional Requirements + Acceptance Criteria get one — check list_slices (hasExampleMap) for which do.` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(seed, null, 2) }] };
  },
);

server.tool(
  "export_specifications",
  "Turn a slice's Example Map into a specifications[] array (the shape downstream test-generation consumes: one spec per Example, with the Rule's text carried on each). Refuses if the map has unresolved Question cards — that's the 'slice isn't understood well enough' signal.",
  { sliceId: z.string().describe("A slice id from list_slices that has hasExampleMap true.") },
  async ({ sliceId }) => {
    const seed = board.seedExampleMaps?.[sliceId];
    if (!seed) {
      return {
        content: [{ type: "text", text: `No seed Example Map for slice "${sliceId}" — call list_slices to find one with hasExampleMap true.` }],
        isError: true,
      };
    }
    try {
      const result = exportSpecifications(seed, sliceId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: err.message }], isError: true };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
