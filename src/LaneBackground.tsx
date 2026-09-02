import { LANES, TOTAL_HEIGHT } from "./lanes";

/** Renders the fixed lane bands + labels behind the React Flow canvas.
 * This is the "swimlane" visual — plain absolutely-positioned divs, not
 * a React Flow primitive, since lanes aren't built into the library. */
export function LaneBackground({ width }: { width: number }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width, height: TOTAL_HEIGHT, pointerEvents: "none", zIndex: 0 }}>
      {LANES.map((lane) => (
        <div
          key={lane.id}
          style={{
            position: "absolute",
            top: lane.yCenter - lane.height / 2,
            left: 0,
            width,
            height: lane.height,
            background: lane.color,
            borderBottom: "1px solid #e4e4e7",
          }}
        >
          <span
            style={{
              position: "sticky",
              left: 8,
              top: 8,
              fontSize: 11,
              fontWeight: 700,
              color: "#52525b",
              letterSpacing: 0.5,
            }}
          >
            {lane.label}
          </span>
        </div>
      ))}
    </div>
  );
}
