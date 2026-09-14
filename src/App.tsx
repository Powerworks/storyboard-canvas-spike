import { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LaneBackground } from "./LaneBackground";
import { snapYToLane, TOTAL_HEIGHT } from "./lanes";
import { StoryboardNode, type StoryboardNodeData } from "./StoryboardNode";
import { listSpecs, loadSpec, listSlices } from "./loadBoard";
import { ExampleMapView } from "./ExampleMapView";
import { getExampleMapSummary } from "./exampleMapStore";
import { Badge } from "./components/Badge";
import { Button } from "./components/Button";
import { SettingsPanel } from "./components/SettingsPanel";
import { useTheme } from "./presetContext";

const CANVAS_WIDTH = 2400;

const nodeTypes = { storyboard: StoryboardNode };
const specs = listSpecs();

// Real content loaded from src/data/powergym-board.json — the output of
// scripts/import-eventmodelers.mjs run against all 18 of PowerGym's real
// eventmodelers.ai story-arcs. Defaults to 002a-member-registration,
// matching the hand-built reference this import adapter was verified
// against. Owned Data is absent everywhere: the source board carries no
// field-level detail board-wide (confirmed across all 65 slices) — left
// off rather than invented, per the source's own constitution Principle III.
export default function App() {
  const [selectedSpec, setSelectedSpec] = useState<string>(specs[0]);
  const initial = loadSpec(selectedSpec);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [selected, setSelected] = useState<Node | null>(null);
  const [openSliceId, setOpenSliceId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const slices = listSlices(selectedSpec);
  const theme = useTheme();

  // Recomputed on every render — including whenever openSliceId flips back
  // to null (returning from an Example Map edit) — so badges/counts stay
  // live without a second state-sync mechanism. Plain computation, not
  // memoized: slice counts here are single/low-digit, not worth the
  // memoization bookkeeping.
  const exampleMapSummaries = Object.fromEntries(
    slices.map((s) => [s.sliceId, getExampleMapSummary(s.sliceId)]),
  );

  const displayNodes = nodes.map((n) => ({
    ...n,
    data: { ...n.data, exampleMapSummary: exampleMapSummaries[(n.data as StoryboardNodeData).sliceId] },
  }));

  const changeSpec = useCallback((specId: string) => {
    setSelectedSpec(specId);
    const { nodes: n, edges: e } = loadSpec(specId);
    setNodes(n);
    setEdges(e);
    setSelected(null);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  // The actual swimlane spike: on drag stop, snap the node's Y back to
  // its nearest lane center (X stays free, so time-ordering within a
  // lane is preserved) and update its laneId so the label/border re-styles.
  const onNodeDragStop = useCallback((_evt: MouseEvent | TouchEvent, draggedNode: Node) => {
    const { laneId, y } = snapYToLane(draggedNode.position.y + 30);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === draggedNode.id
          ? { ...n, position: { ...n.position, y: y - 30 }, data: { ...n.data, laneId } }
          : n,
      ),
    );
  }, []);

  if (openSliceId) {
    const slice = slices.find((s) => s.sliceId === openSliceId);
    return (
      <ExampleMapView
        key={openSliceId}
        sliceId={openSliceId}
        sliceLabel={slice?.label ?? openSliceId}
        onBack={() => setOpenSliceId(null)}
      />
    );
  }

  const panelStyle = {
    width: 300,
    borderLeft: `1px solid ${theme.color.border}`,
    padding: theme.space.xl,
    fontFamily: "sans-serif",
    fontSize: theme.fontSize.base,
  } as const;

  return (
    <>
      <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <div style={{ flex: 1, position: "relative", overflow: "auto", minWidth: 0 }}>
        <LaneBackground width={CANVAS_WIDTH} />
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_e, n) => setSelected(n)}
          onNodeDoubleClick={(_e, n) => setOpenSliceId((n.data as StoryboardNodeData).sliceId)}
          translateExtent={[
            [0, 0],
            [CANVAS_WIDTH, TOTAL_HEIGHT],
          ]}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Minimal scenario side panel — proves the "attach GWT to any
          element" feature is structurally wired, not just cosmetic. */}
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.space.lg }}>
          <h3 style={{ margin: 0 }}>EUnomia</h3>
          <Button onClick={() => setShowSettings(true)}>Settings</Button>
        </div>
        <h3 style={{ marginTop: 0 }}>Story-arc</h3>
        <select
          value={selectedSpec}
          onChange={(e) => changeSpec(e.target.value)}
          style={{ width: "100%", padding: theme.space.sm, marginBottom: theme.space.xl, fontSize: theme.fontSize.md }}
        >
          {specs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div style={{ color: theme.color.text.muted, marginBottom: theme.space.xl, fontSize: theme.fontSize.sm }}>
          {nodes.length} nodes, {edges.length} edges — imported from PowerGym's real eventmodelers.ai board
        </div>

        <h3 style={{ marginTop: 0 }}>Slices</h3>
        <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: theme.space.xl }}>
          {slices.map((s) => (
            <div
              key={s.sliceId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: `${theme.space.xs}px 0`,
                borderBottom: `1px solid ${theme.color.borderLight}`,
                fontSize: theme.fontSize.md,
              }}
            >
              <span title={s.label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: theme.space.sm }}>
                {(() => {
                  const summary = exampleMapSummaries[s.sliceId];
                  if (!summary || (!summary.rules && !summary.examples && !summary.questions)) return null;
                  return (
                    <Badge
                      background={summary.openQuestions ? theme.color.badge.danger : theme.color.badge.info}
                      title={`${summary.rules} Rule(s), ${summary.examples} Example(s), ${summary.questions} Question(s)`}
                    >
                      R{summary.rules} E{summary.examples} Q{summary.questions}
                    </Badge>
                  );
                })()}
                <Button onClick={() => setOpenSliceId(s.sliceId)}>Example Map &rarr;</Button>
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 0 }}>Scenario</h3>
        {selected ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: theme.space.md }}>{(selected.data as StoryboardNodeData).label}</div>
            {(selected.data as StoryboardNodeData).scenario ? (
              <div style={{ lineHeight: 1.6 }}>
                <div><strong>Given</strong> {(selected.data as StoryboardNodeData).scenario!.given}</div>
                <div><strong>When</strong> {(selected.data as StoryboardNodeData).scenario!.when}</div>
                <div><strong>Then</strong> {(selected.data as StoryboardNodeData).scenario!.then}</div>
              </div>
            ) : (
              <div style={{ color: theme.color.text.muted }}>No scenario attached to this element yet.</div>
            )}
          </>
        ) : (
          <div style={{ color: theme.color.text.muted }}>Click a card to view its attached scenario (Given/When/Then).</div>
        )}
      </div>
    </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}
