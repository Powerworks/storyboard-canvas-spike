import type { LaneId } from "./lanes";

// Single source of truth for visual tokens — the substrate the design
// presets (theme, density) will later override. Deliberately a plain mutable
// object with an explicit interface (not `as const`), so a preset can swap
// values without a literal-type fight. Everything visual in the canvas reads
// from here instead of scattering hex literals across components.

export interface Theme {
  color: {
    /** One fill + border per Layer 1 lane, keyed by lane id. */
    lane: Record<LaneId, { fill: string; border: string }>;
    /** Layer 2 Example Mapping card types (Rule/Example/Question). */
    card: Record<
      "rule" | "example" | "question" | "answeredQuestion",
      { bg: string; border: string; label: string }
    >;
    badge: { info: string; danger: string; success: string; text: string };
    text: {
      muted: string;
      subtle: string;
      body: string;
      strong: string;
      exampleBody: string;
    };
    border: string;
    borderLight: string;
    surface: string;
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; pill: number; round: string };
  fontSize: { xs: number; sm: number; md: number; base: number };
  shadow: { sm: string; md: string };
}

export const theme: Theme = {
  color: {
    lane: {
      actor: { fill: "#f4f4f5", border: "#a1a1aa" },
      screen: { fill: "#eef2ff", border: "#6366f1" },
      action: { fill: "#ecfeff", border: "#06b6d4" },
      outcome: { fill: "#fff7ed", border: "#f97316" },
      ownedData: { fill: "#f0fdf4", border: "#22c55e" },
    },
    card: {
      rule: { bg: "#fef9c3", border: "#eab308", label: "RULE" },
      example: { bg: "#dcfce7", border: "#22c55e", label: "EXAMPLE" },
      question: { bg: "#fee2e2", border: "#ef4444", label: "QUESTION" },
      answeredQuestion: { bg: "#f4f4f5", border: "#a1a1aa", label: "QUESTION — ANSWERED" },
    },
    badge: { info: "#3b82f6", danger: "#ef4444", success: "#22c55e", text: "white" },
    text: {
      muted: "#71717a",
      subtle: "#52525b",
      body: "#3f3f46",
      strong: "#08060d",
      exampleBody: "#166534",
    },
    border: "#e4e4e7",
    borderLight: "#f4f4f5",
    surface: "white",
  },
  space: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16 },
  radius: { sm: 4, md: 6, pill: 9, round: "50%" },
  fontSize: { xs: 10, sm: 11, md: 12, base: 13 },
  shadow: { sm: "0 1px 2px rgba(0,0,0,0.08)", md: "0 1px 4px rgba(0,0,0,0.15)" },
};
