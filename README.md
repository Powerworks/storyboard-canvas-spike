# storyboard-canvas-spike

A CRUD-native event-modeling canvas: [React Flow](https://reactflow.dev)-based Actor/Screen/Action/Outcome/Owned-Data swimlanes, with drag-snap-to-lane node placement and inline Given/When/Then Scenario attachment per node. Personal MVP proving out the design described in [the Version1 App Delivery Canvas brief](docs/plan.md#background) before it's pitched internally.

This is exploratory personal-project tooling, not production code — see [Scope](#scope) below for exactly what's in and out right now.

## Quickstart

```bash
npm install
npm run dev
```

Opens the canvas with PowerGym's real "Member Registration" story-arc loaded by default. Use the **Story-arc** selector in the sidebar to browse any of the 18 story-arcs imported from PowerGym's real eventmodelers.ai board.

## What's in the repo

| Path | What it is |
|---|---|
| `src/` | The canvas itself — React Flow app, lane layout, node/edge components |
| `scripts/import-eventmodelers.mjs` | Import adapter: parses eventmodelers.ai board exports (`requirements.md`/`research.md`, as transcribed by the PowerGym-style build kit) into this canvas's node/edge schema |
| `scripts/export-specifications.mjs` | Export adapter (the reverse of the import script): turns one slice's Layer 2 Example Map into a `specifications[]` array, the shape K9Crush's `build-state-change`/`build-state-view` skills consume to write one xUnit test per specification — see the script's header comment for known schema deviations |
| `scripts/export-billing-snapshot.mjs` | Export adapter: turns a chosen set of slices' Layer 2 Example Maps into a priced, client-facing scope-of-work Markdown document (slices × flat per-slice rate = total), flagging rather than refusing slices with open Questions — see the script's header comment for the policy contrast with `export-specifications.mjs` |
| `src/data/powergym-board.json` | The adapter's output, run against all 18 of PowerGym's real story-arcs — 149 nodes, 84 edges |
| `mcp-server/` | An [MCP server](mcp-server/README.md) exposing the board to any MCP-compatible harness (Claude Code, Gemini CLI, etc.) — read-only for now |
| `docs/` | Plan, solution architecture, and [ADRs](docs/adr/) for the real decisions made building this |

## Scope

**In (v1, built):**
- Layer 1 board: Actor, Screen, Action, Outcome node types; "produces"/"triggers" edges
- Fixed swimlane layout with drag-snap-to-lane
- Inline Scenario (Given/When/Then) attachment on any node
- Import adapter for eventmodelers.ai board exports
- Read-only MCP server exposing the board
- Layer 2 Example Mapping: per-slice, free-form canvas of Rule/Example/Question cards, persisted to `localStorage`, with an "Export Board JSON" action for feeding the export adapter below
- Export adapter turning a slice's Example Map into a `specifications[]` array for downstream test-generation (`scripts/export-specifications.mjs`) — see [the plan](docs/plan.md) for what's still out of scope (wiring into a mechanical gate, drift detection)
- Export adapter turning chosen slices' Example Maps into a priced, client-facing scope-of-work Markdown snapshot (`scripts/export-billing-snapshot.mjs`)

**Out (deferred):**
- Markdown export beyond the billing snapshot and MCP tool responses
- AI-generated content (sketches, code)
- Multiplayer/collaboration
- Writing back to the board (the planned "Agentic Modeling" capability — task-queued, skill-routed edits; see [the plan](docs/plan.md))

## Development

Built with Vite + React + TypeScript + `@xyflow/react`. Standard Vite scripts apply: `npm run dev`, `npm run build`, `npm run lint`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the working conventions this repo follows.

## Related documentation

- [docs/plan.md](docs/plan.md) — project background, scope, and roadmap
- [docs/solution-architecture.md](docs/solution-architecture.md) — how the pieces fit together and why
- [docs/adr/](docs/adr/) — the decision log
- [mcp-server/README.md](mcp-server/README.md) — MCP server tools and how to register it with a harness
