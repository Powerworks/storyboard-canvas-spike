# Storyboard Canvas MCP server

Exposes this canvas's board data over the Model Context Protocol, so any MCP-compatible harness (Claude Code, Codex, Gemini CLI, etc.) can query it directly — no per-harness export adapter needed. See the design note at the top of `index.mjs` for why this replaces the originally-planned per-harness Markdown/YAML exporters.

## Tools

- `list_story_arcs` — every story-arc currently on the board, with node/edge counts.
- `get_story_arc(specId)` — full nodes/edges for one story-arc, in the canvas's own schema.
- `search_elements(query)` — case-insensitive substring search across every arc's node labels.

**v1 scope: read-only.** Writing to the board (the Agentic Modeling capability — task-queued, skill-routed edits, per `Active_Projects/Storyboard Canvas (Personal MVP)`'s own note) is separate, larger scope, not this server.

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
    "storyboard-canvas": {
      "command": "node",
      "args": ["/absolute/path/to/storyboard-canvas-spike/mcp-server/index.mjs"]
    }
  }
}
```

Any other MCP-compatible harness registers it the same way — a stdio command, same as any other MCP server. That's the whole point of this reframe: one server, many harnesses, instead of one exporter per harness.
