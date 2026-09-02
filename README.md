# storyboard-canvas-spike

Personal spike proving a [React Flow](https://reactflow.dev)-based CRUD-native event-modeling canvas: Actor/Screen/Action/Outcome/Owned-Data swimlanes with drag-snap-to-lane node placement. React Flow was chosen over tldraw specifically for its MIT license, since the long-term goal is a Version1-internal tool.

The board is populated with PowerGym's actual "Member Registration" story-arc, transcribed verbatim from its eventmodelers.ai board export (2 screens, 2 human command/event slices, 3 system-automation slices, deliberately zero invented field-level data since the source board has none).

This is a throwaway/exploratory spike, not production code. Scope is deliberately narrow (Layer 1 board only; Layer 2 Example Mapping, export, and multiplayer are explicitly deferred).

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
