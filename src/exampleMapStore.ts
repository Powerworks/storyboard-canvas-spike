import type { Node, Edge } from "@xyflow/react";

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
