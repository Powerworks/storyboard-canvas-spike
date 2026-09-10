import { Handle, Position, type NodeProps } from "@xyflow/react";

export type ExampleMapNodeType = "rule" | "example" | "question";

export interface ExampleMapNodeData {
  nodeType: ExampleMapNodeType;
  label: string;
  /** Only meaningful on "example" nodes — the classic Example Mapping
   * green card is itself a Given/When/Then, same shape as the Layer 1
   * Scenario feature it's borrowed from. */
  scenario?: { given: string; when: string; then: string };
  [key: string]: unknown;
}

const STYLE: Record<ExampleMapNodeType, { bg: string; border: string; label: string }> = {
  rule: { bg: "#fef9c3", border: "#eab308", label: "RULE" },
  example: { bg: "#dcfce7", border: "#22c55e", label: "EXAMPLE" },
  question: { bg: "#fee2e2", border: "#ef4444", label: "QUESTION" },
};

export function ExampleMapNode({ data }: NodeProps) {
  const nodeData = data as unknown as ExampleMapNodeData;
  const style = STYLE[nodeData.nodeType];

  return (
    <div
      style={{
        border: `2px solid ${style.border}`,
        borderRadius: 6,
        padding: "8px 12px",
        background: style.bg,
        minWidth: 180,
        maxWidth: 220,
        fontSize: 13,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontSize: 10, color: "#52525b", marginBottom: 2, fontWeight: 700, letterSpacing: 0.5 }}>
        {style.label}
      </div>
      <div style={{ fontWeight: 600 }}>{nodeData.label}</div>
      {nodeData.nodeType === "example" && nodeData.scenario && (
        <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5, color: "#166534" }}>
          <div><strong>Given</strong> {nodeData.scenario.given}</div>
          <div><strong>When</strong> {nodeData.scenario.when}</div>
          <div><strong>Then</strong> {nodeData.scenario.then}</div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
