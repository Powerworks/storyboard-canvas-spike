import type { Node, Edge } from "@xyflow/react";
import { LANES, snapYToLane, type LaneId } from "./lanes";
import type { StoryboardNodeData } from "./StoryboardNode";
import rawBoard from "./data/powergym-board.json";

/** Shape produced by scripts/import-eventmodelers.mjs — see that file for
 * the source markdown format this was parsed from. */
interface ImportedNode {
  id: string;
  label: string;
  laneId: LaneId;
  sliceId: string;
  sliceType: string;
  specId: string;
}
interface ImportedEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}
interface ImportedBoard {
  nodes: ImportedNode[];
  edges: ImportedEdge[];
}

const board = rawBoard as ImportedBoard;

const COLUMN_WIDTH = 300;

/** All spec ids present in the imported board, in file order (stable —
 * matches the order scripts/import-eventmodelers.mjs was invoked with). */
export function listSpecs(): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const n of board.nodes) {
    if (!seen.has(n.specId)) {
      seen.add(n.specId);
      order.push(n.specId);
    }
  }
  return order;
}

export interface SliceSummary {
  sliceId: string;
  label: string;
}

/** Slices for one spec, in order of first appearance, labeled by their
 * Screen node when present (most readable) or their first node otherwise —
 * the source board carries no separate slice title field. */
export function listSlices(specId: string): SliceSummary[] {
  const specNodes = board.nodes.filter((n) => n.specId === specId);
  const seen = new Set<string>();
  const order: SliceSummary[] = [];
  for (const n of specNodes) {
    if (seen.has(n.sliceId)) continue;
    seen.add(n.sliceId);
    const screenNode = specNodes.find((m) => m.sliceId === n.sliceId && m.laneId === "screen");
    order.push({ sliceId: n.sliceId, label: (screenNode ?? n).label });
  }
  return order;
}

/** Load one spec (story-arc) as React Flow nodes/edges, laid out on the
 * fixed lane bands from lanes.ts. The source board carries no position
 * data at all (confirmed against the real PowerGym export — every
 * element is field-less), so layout is computed here: slices become
 * timeline columns in their order of first appearance in the source
 * file, nodes within a slice snap to their lane's Y center. */
export function loadSpec(specId: string): { nodes: Node[]; edges: Edge[] } {
  const specNodes = board.nodes.filter((n) => n.specId === specId);
  const specEdges = board.edges.filter((e) =>
    specNodes.some((n) => n.id === e.source) && specNodes.some((n) => n.id === e.target),
  );

  const sliceOrder: string[] = [];
  const seenSlices = new Set<string>();
  for (const n of specNodes) {
    if (!seenSlices.has(n.sliceId)) {
      seenSlices.add(n.sliceId);
      sliceOrder.push(n.sliceId);
    }
  }
  const columnOf = new Map(sliceOrder.map((sliceId, i) => [sliceId, i]));

  const nodes: Node[] = specNodes.map((n) => {
    const x = 40 + (columnOf.get(n.sliceId) ?? 0) * COLUMN_WIDTH;
    const lane = LANES.find((l) => l.id === n.laneId);
    const y = (lane?.yCenter ?? snapYToLane(0).y) - 30;
    return {
      id: n.id,
      type: "storyboard",
      position: { x, y },
      data: { label: n.label, laneId: n.laneId } as StoryboardNodeData,
    };
  });

  const edges: Edge[] = specEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.label === "produces",
    style: e.label === "triggers" ? { strokeDasharray: "5 5" } : undefined,
  }));

  return { nodes, edges };
}
