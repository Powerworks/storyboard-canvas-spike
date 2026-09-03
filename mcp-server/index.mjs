#!/usr/bin/env node
// MCP server exposing this canvas's board data (currently PowerGym's
// imported eventmodelers.ai story-arcs) to any MCP-compatible harness.
//
// Design note (Ouroboros-inspired reframe, decided 2026-09-02): rather
// than hand-building a per-harness export adapter (a Claude-flavored
// Markdown exporter, a Gemini-flavored one, etc.), expose the board
// through one protocol every major harness already speaks. The canonical
// data stays the same JSON schema the import adapter and the React app
// both already use (src/data/powergym-board.json) — this server is a
// thin protocol wrapper around it, not a second source of truth.
//
// v1 scope: read-only tools over the existing imported board. Writing
// back to the board (the Agentic Modeling capability, task-queued,
// skill-routed edits) is separate, larger scope — not this file.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

const server = new McpServer({ name: "storyboard-canvas", version: "0.1.0" });

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

const transport = new StdioServerTransport();
await server.connect(transport);
