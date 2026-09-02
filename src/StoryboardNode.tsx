import { Handle, Position, type NodeProps } from "@xyflow/react";
import { LANES, type LaneId } from "./lanes";

export interface StoryboardNodeData {
  label: string;
  laneId: LaneId;
  /** Given/When/Then scenario attached to this element — the "Scenarios"
   * feature borrowed from eventmodelers.ai: any element, not just a
   * drill-down slice board, can carry an inline behavioral spec. */
  scenario?: { given: string; when: string; then: string };
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

  return (
    <div
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
