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

const CANVAS_WIDTH = 1400;

const nodeTypes = { storyboard: StoryboardNode };

// Real content: PowerGym's "Member Registration" story-arc (Membership
// chapter, board e833cb29-60bd-458a-be57-4acb728d7f53), transcribed
// verbatim from specs/002a-member-registration/{requirements,research}.md.
// One story-arc of 18 on this board (65 slices total) — proves the model
// against real, non-trivial content: two human slices, three system
// automations, zero field-level data anywhere (the board genuinely has
// none yet — represented as-is, not invented, per the source's own
// constitution Principle III).
const initialNodes: Node[] = [
  { id: "actor-receptionist", type: "storyboard", position: { x: 40, y: 70 }, data: { label: "Receptionist", laneId: "actor" } as StoryboardNodeData },
  { id: "actor-system", type: "storyboard", position: { x: 700, y: 70 }, data: { label: "System (automation)", laneId: "actor" } as StoryboardNodeData },

  { id: "screen-new-member", type: "storyboard", position: { x: 40, y: 210 }, data: { label: "New Member Registration", laneId: "screen" } as StoryboardNodeData },
  { id: "screen-take-payment", type: "storyboard", position: { x: 340, y: 210 }, data: { label: "Take Payment", laneId: "screen" } as StoryboardNodeData },

  {
    id: "action-register",
    type: "storyboard",
    position: { x: 40, y: 350 },
    data: {
      label: "Register Member",
      laneId: "action",
      scenario: {
        given: "no precondition recorded on the board",
        when: "Register Member",
        then: "Member Registered",
      },
    } as StoryboardNodeData,
  },
  {
    id: "action-record-payment",
    type: "storyboard",
    position: { x: 340, y: 350 },
    data: {
      label: "Record Membership Payment",
      laneId: "action",
      scenario: { given: "preconditions for this step are met", when: "Record Membership Payment", then: "Membership Payment Received" },
    } as StoryboardNodeData,
  },
  { id: "action-activate", type: "storyboard", position: { x: 640, y: 350 }, data: { label: "Membership Activator", laneId: "action" } as StoryboardNodeData },
  { id: "action-reg-guard", type: "storyboard", position: { x: 900, y: 350 }, data: { label: "Registration Guard", laneId: "action" } as StoryboardNodeData },
  { id: "action-act-guard", type: "storyboard", position: { x: 1160, y: 350 }, data: { label: "Activation Guard", laneId: "action" } as StoryboardNodeData },

  { id: "outcome-registered", type: "storyboard", position: { x: 40, y: 490 }, data: { label: "Member Registered", laneId: "outcome" } as StoryboardNodeData },
  { id: "outcome-payment", type: "storyboard", position: { x: 340, y: 490 }, data: { label: "Membership Payment Received", laneId: "outcome" } as StoryboardNodeData },
  { id: "outcome-activated", type: "storyboard", position: { x: 640, y: 490 }, data: { label: "Membership Activated", laneId: "outcome" } as StoryboardNodeData },
  { id: "outcome-rejected", type: "storyboard", position: { x: 900, y: 490 }, data: { label: "Member Registration Rejected", laneId: "outcome" } as StoryboardNodeData },
  { id: "outcome-act-failed", type: "storyboard", position: { x: 1160, y: 490 }, data: { label: "Membership Activation Failed", laneId: "outcome" } as StoryboardNodeData },

  // Owned Data: not on the source board at all (it has zero field-level
  // detail board-wide) — left off entirely rather than invented, which is
  // itself the honest test of the "don't guess" discipline this MVP is
  // meant to support.
];

const initialEdges: Edge[] = [
  { id: "e-screen-register", source: "screen-new-member", target: "action-register", label: "triggers" },
  { id: "e-screen-payment", source: "screen-take-payment", target: "action-record-payment", label: "triggers" },
  { id: "e-register-registered", source: "action-register", target: "outcome-registered", label: "produces", animated: true },
  { id: "e-payment-received", source: "action-record-payment", target: "outcome-payment", label: "produces", animated: true },
  { id: "e-activator-activated", source: "action-activate", target: "outcome-activated", label: "produces", animated: true },
  { id: "e-regguard-rejected", source: "action-reg-guard", target: "outcome-rejected", label: "produces", animated: true },
  { id: "e-actguard-failed", source: "action-act-guard", target: "outcome-act-failed", label: "produces", animated: true },
];

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selected, setSelected] = useState<Node | null>(null);

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

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <LaneBackground width={CANVAS_WIDTH} />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_e, n) => setSelected(n)}
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
      <div style={{ width: 300, borderLeft: "1px solid #e4e4e7", padding: 16, fontFamily: "sans-serif", fontSize: 13 }}>
        <h3 style={{ marginTop: 0 }}>Scenario</h3>
        {selected ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{(selected.data as StoryboardNodeData).label}</div>
            {(selected.data as StoryboardNodeData).scenario ? (
              <div style={{ lineHeight: 1.6 }}>
                <div><strong>Given</strong> {(selected.data as StoryboardNodeData).scenario!.given}</div>
                <div><strong>When</strong> {(selected.data as StoryboardNodeData).scenario!.when}</div>
                <div><strong>Then</strong> {(selected.data as StoryboardNodeData).scenario!.then}</div>
              </div>
            ) : (
              <div style={{ color: "#71717a" }}>No scenario attached to this element yet.</div>
            )}
          </>
        ) : (
          <div style={{ color: "#71717a" }}>Click a card to view its attached scenario (Given/When/Then).</div>
        )}
      </div>
    </div>
  );
}
