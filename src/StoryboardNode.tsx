import { Handle, Position, type NodeProps } from "@xyflow/react";
import { LANES, type LaneId } from "./lanes";

export interface StoryboardNodeData {
  label: string;
  laneId: LaneId;
  /** Every node in a slice's column shares this — needed by the Layer 1
   * drill-down UI (double-click → that slice's Example Map). */
  sliceId: string;
  /** Given/When/Then scenario attached to this element — the "Scenarios"
   * feature borrowed from eventmodelers.ai: any element, not just a
   * drill-down slice board, can carry an inline behavioral spec. */
  scenario?: { given: string; when: string; then: string };
  /** Layer 2 (Example Map) card counts for this node's slice, computed in
   * App.tsx from exampleMapStore — undefined/all-zero means nothing mapped
   * yet, distinct from the green Layer-1-scenario checkmark below. */
  exampleMapSummary?: { rules: number; examples: number; questions: number; openQuestions: number };
  [key: string]: unknown;
}

const laneBorderColor: Record<LaneId, string> = {
  actor: "#a1a1aa",
  screen: "#6366f1",
  action: "#06b6d4",
  outcome: "#f97316",
  ownedData: "#22c55e",
};

export function StoryboardNode({ data }: NodeProps) {
  const nodeData = data as unknown as StoryboardNodeData;
  const lane = LANES.find((l) => l.id === nodeData.laneId);
  const hasScenario = Boolean(nodeData.scenario);
  const mapSummary = nodeData.exampleMapSummary;
  const hasExampleMap = Boolean(mapSummary && (mapSummary.rules || mapSummary.examples || mapSummary.questions));

  return (
    <div
      title={hasExampleMap ? undefined : "Double-click to open this slice's Example Map"}
      style={{
        border: `2px solid ${laneBorderColor[nodeData.laneId]}`,
        borderRadius: 6,
        padding: "8px 12px",
        background: "white",
        minWidth: 160,
        fontSize: 13,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ fontSize: 10, color: "#71717a", marginBottom: 2 }}>{lane?.label}</div>
      <div style={{ fontWeight: 600 }}>{nodeData.label}</div>
      {hasExampleMap && mapSummary && (
        <div
          title={
            `Example Map: ${mapSummary.rules} Rule${mapSummary.rules === 1 ? "" : "s"}, ` +
            `${mapSummary.examples} Example${mapSummary.examples === 1 ? "" : "s"}, ` +
            `${mapSummary.questions} Question${mapSummary.questions === 1 ? "" : "s"}` +
            (mapSummary.openQuestions ? ` (${mapSummary.openQuestions} open)` : "") +
            " — double-click to open"
          }
          style={{
            position: "absolute",
            bottom: -8,
            left: -8,
            background: mapSummary.openQuestions ? "#ef4444" : "#3b82f6",
            color: "white",
            borderRadius: 9,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          R{mapSummary.rules} E{mapSummary.examples} Q{mapSummary.questions}
        </div>
      )}
      {hasScenario && (
        <div
          title={`Given ${nodeData.scenario!.given}\nWhen ${nodeData.scenario!.when}\nThen ${nodeData.scenario!.then}`}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            background: "#22c55e",
            color: "white",
            borderRadius: "50%",
            width: 18,
            height: 18,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✓
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
