# EUnomia MCP server

Exposes EUnomia's board data over the Model Context Protocol, so any MCP-compatible harness (Claude Code, Codex, Gemini CLI, etc.) can query it directly — no per-harness export adapter needed. See the design note at the top of `index.mjs` for why this replaces the originally-planned per-harness Markdown/YAML exporters.

## Tools

- `list_story_arcs` — every story-arc currently on the board, with node/edge counts.
- `get_story_arc(specId)` — full nodes/edges for one story-arc, in the canvas's own schema.
- `search_elements(query)` — case-insensitive substring search across every arc's node labels.
- `list_slices(specId?)` — slices (vertical buildable units), optionally filtered to one arc; each entry flags `hasExampleMap`.
- `get_example_map(sliceId)` — a slice's Layer 2 Example Map (Rule/Example/Question cards, with Given/When/Then).
- `export_specifications(sliceId)` — a slice's Example Map → `specifications[]` array (the verification spine; refuses on unresolved Question cards).

**Read-only.** Writing to the board (Agentic Modeling — task-queued, skill-routed edits) is separate, larger scope, not this server.

## Running it standalone

```bash
node mcp-server/index.mjs
```

Speaks stdio JSON-RPC — not meant to be run directly by a human, only spawned by an MCP client. `smoke-test.mjs` drives it directly for manual verification without needing an external harness installed.

## Registering with Claude Code

Add to `.mcp.json` in a project that wants to query this board:

```json
{
  "mcpServers": {
    "eunomia": {
      "command": "node",
      "args": ["/absolute/path/to/storyboard-canvas-spike/mcp-server/index.mjs"]
    }
  }
}
```

Any other MCP-compatible harness registers it the same way — a stdio command, same as any other MCP server. That's the whole point of this reframe: one server, many harnesses, instead of one exporter per harness.
