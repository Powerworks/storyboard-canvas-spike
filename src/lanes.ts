// Fixed horizontal swimlanes, top to bottom, matching the board layout in
// the Version1 brief: Actor/Role, Screen/View, Action, Outcome, Owned Data.
// Time flows left-to-right within each lane (X axis), lane assignment is
// purely Y-axis (vertical band a node's center falls into).
export type LaneId = "actor" | "screen" | "action" | "outcome" | "ownedData";

export interface Lane {
  id: LaneId;
  label: string;
  yCenter: number;
  height: number;
  color: string;
}

const LANE_HEIGHT = 140;

export const LANES: Lane[] = [
  { id: "actor", label: "ACTOR / ROLE", yCenter: LANE_HEIGHT / 2, height: LANE_HEIGHT, color: "#f4f4f5" },
  { id: "screen", label: "SCREEN / VIEW", yCenter: LANE_HEIGHT * 1 + LANE_HEIGHT / 2, height: LANE_HEIGHT, color: "#eef2ff" },
  { id: "action", label: "ACTION", yCenter: LANE_HEIGHT * 2 + LANE_HEIGHT / 2, height: LANE_HEIGHT, color: "#ecfeff" },
  { id: "outcome", label: "OUTCOME (State Change)", yCenter: LANE_HEIGHT * 3 + LANE_HEIGHT / 2, height: LANE_HEIGHT, color: "#fff7ed" },
  { id: "ownedData", label: "OWNED DATA", yCenter: LANE_HEIGHT * 4 + LANE_HEIGHT / 2, height: LANE_HEIGHT, color: "#f0fdf4" },
];

export const TOTAL_HEIGHT = LANE_HEIGHT * LANES.length;

/** Snap an arbitrary Y drop position to the nearest lane's vertical center. */
export function snapYToLane(y: number): { laneId: LaneId; y: number } {
  let closest = LANES[0];
  let closestDist = Math.abs(y - LANES[0].yCenter);
  for (const lane of LANES) {
    const dist = Math.abs(y - lane.yCenter);
    if (dist < closestDist) {
      closest = lane;
      closestDist = dist;
    }
  }
  return { laneId: closest.id, y: closest.yCenter };
}
