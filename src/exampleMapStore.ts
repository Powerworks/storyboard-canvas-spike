import type { Node, Edge } from "@xyflow/react";
import type { ExampleMapNodeData } from "./ExampleMapNode";

/** Layer 2 (Example Mapping) boards, one per Layer 1 slice, persisted to
 * localStorage keyed by sliceId. Spike-level persistence only — no backend,
 * matches the rest of this repo's throwaway-MVP scope. */

const STORAGE_PREFIX = "example-map:";

export interface ExampleMapBoard {
  nodes: Node[];
  edges: Edge[];
}

export function loadExampleMap(sliceId: string): ExampleMapBoard {
  const raw = localStorage.getItem(STORAGE_PREFIX + sliceId);
  if (!raw) return { nodes: [], edges: [] };
  try {
    return JSON.parse(raw) as ExampleMapBoard;
  } catch {
    return { nodes: [], edges: [] };
  }
}

export function saveExampleMap(sliceId: string, board: ExampleMapBoard): void {
  localStorage.setItem(STORAGE_PREFIX + sliceId, JSON.stringify(board));
}

export interface ExampleMapSummary {
  rules: number;
  examples: number;
  questions: number;
  openQuestions: number;
}

/** Card counts for one slice's Example Map, read straight from localStorage —
 * used by the Layer 1 drill-down UI (node badge + Slices list) so a slice's
 * Layer 2 completeness is visible without opening its board. Missing/undefined
 * `status` on a question is "open", same convention as export-stakeholder-digest.mjs. */
export function getExampleMapSummary(sliceId: string): ExampleMapSummary {
  const { nodes } = loadExampleMap(sliceId);
  const summary: ExampleMapSummary = { rules: 0, examples: 0, questions: 0, openQuestions: 0 };
  for (const n of nodes) {
    const data = n.data as unknown as ExampleMapNodeData;
    if (data.nodeType === "rule") summary.rules++;
    else if (data.nodeType === "example") summary.examples++;
    else if (data.nodeType === "question") {
      summary.questions++;
      if (data.status !== "answered") summary.openQuestions++;
    }
  }
  return summary;
}
