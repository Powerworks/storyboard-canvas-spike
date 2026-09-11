import { useCallback, useEffect, useState } from "react";
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
import { ExampleMapNode, type ExampleMapNodeData, type ExampleMapNodeType } from "./ExampleMapNode";
import { loadExampleMap, saveExampleMap } from "./exampleMapStore";

const nodeTypes = { exampleMap: ExampleMapNode };

let nextId = 1;
function newNodeId() {
  return `em-${Date.now()}-${nextId++}`;
}

// The caller must remount this component on slice change (key={sliceId}) —
// state is initialized once from that slice's saved board rather than
// synchronized via an effect on the sliceId prop.
export function ExampleMapView({ sliceId, sliceLabel, onBack }: { sliceId: string; sliceLabel: string; onBack: () => void }) {
  const [nodes, setNodes] = useState<Node[]>(() => loadExampleMap(sliceId).nodes);
  const [edges, setEdges] = useState<Edge[]>(() => loadExampleMap(sliceId).edges);
  const [selected, setSelected] = useState<Node | null>(null);

  // Persist on every change — spike-level autosave, no explicit save action.
  useEffect(() => {
    saveExampleMap(sliceId, { nodes, edges });
  }, [sliceId, nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedIds = new Set(
        changes.filter((c): c is Extract<NodeChange, { type: "remove" }> => c.type === "remove").map((c) => c.id),
      );
      if (removedIds.size > 0) {
        setSelected((sel) => (sel && removedIds.has(sel.id) ? null : sel));
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const exportBoardJson = useCallback(() => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sliceId}-example-map.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, sliceId]);

  const addRule = useCallback(() => {
    const label = window.prompt("Rule text?");
    if (!label) return;
    const id = newNodeId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "exampleMap",
        position: { x: 40 + nds.length * 40, y: 40 + nds.length * 20 },
        data: { nodeType: "rule", label } as ExampleMapNodeData,
      },
    ]);
  }, []);

  const addChild = useCallback(
    (kind: Extract<ExampleMapNodeType, "example" | "question">) => {
      if (!selected || (selected.data as ExampleMapNodeData).nodeType !== "rule") {
        window.alert("Select a Rule card first — Examples and Questions attach to a Rule.");
        return;
      }
      const label = window.prompt(kind === "example" ? "Example title?" : "Question text?");
      if (!label) return;
      const id = newNodeId();
      const parent = selected;
      const siblingCount = edges.filter((e) => e.source === parent.id).length;

      let scenario: ExampleMapNodeData["scenario"];
      if (kind === "example") {
        const given = window.prompt("Given?") ?? "";
        const when = window.prompt("When?") ?? "";
        const then = window.prompt("Then?") ?? "";
        scenario = { given, when, then };
      }

      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "exampleMap",
          position: { x: parent.position.x + siblingCount * 240, y: parent.position.y + 160 },
          data: { nodeType: kind, label, scenario } as ExampleMapNodeData,
        },
      ]);
      setEdges((eds) => [...eds, { id: `${parent.id}-${id}`, source: parent.id, target: id }]);
    },
    [selected, edges],
  );

  const markAnswered = useCallback(() => {
    if (!selected || (selected.data as ExampleMapNodeData).nodeType !== "question") {
      window.alert("Select a Question card first.");
      return;
    }
    const answer = window.prompt("Answer?");
    if (!answer) return;
    const targetId = selected.id;
    const answeredAt = new Date().toISOString();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === targetId
          ? { ...n, data: { ...n.data, status: "answered", answer, answeredAt } as ExampleMapNodeData }
          : n,
      ),
    );
  }, [selected]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "white",
            padding: "6px 10px",
            borderRadius: 6,
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            fontFamily: "sans-serif",
            fontSize: 13,
          }}
        >
          <button onClick={onBack}>&larr; Back to Timeline</button>
          <span style={{ color: "#71717a" }}>Example Map — {sliceLabel}</span>
          <button onClick={addRule}>+ Rule</button>
          <button onClick={() => addChild("example")}>+ Example</button>
          <button onClick={() => addChild("question")}>+ Question</button>
          <button onClick={markAnswered}>Mark Answered</button>
          <button onClick={exportBoardJson}>Export Board JSON</button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_e, n) => setSelected(n)}
          onPaneClick={() => setSelected(null)}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
