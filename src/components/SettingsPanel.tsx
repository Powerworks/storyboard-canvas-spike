import { useState } from "react";
import { PRESETS } from "../presets/catalog";
import { resolvePresets } from "../presets/resolver";
import { loadOverrides, saveOverrides } from "../presets/store";
import type { Overrides, PresetDefinition, PresetValue, PresetGroup } from "../presets/types";
import { theme } from "../theme";
import { Button } from "./Button";

const GROUP_LABELS: Record<PresetGroup, string> = {
  language: "Language & locale",
  ideation: "Ideation",
  org: "Identity & org",
  vcs: "Version control & CI",
  modeling: "Modeling",
  design: "Design & UI",
  testing: "Testing & verification",
  integration: "Integration",
  customer: "Customer & commercial",
  communication: "Outbound communication",
  deploy: "Deploy & hosting",
  handover: "Handover & operate",
};

function formatValue(value: PresetValue): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** One preset row: resolved value + source, and an edit control for the
 * preset's own scope (org/project/user). Locked and array presets render
 * read-only for this first cut. */
function PresetRow({
  def,
  resolved,
  explicit,
  onChange,
}: {
  def: PresetDefinition;
  resolved: PresetValue;
  explicit: PresetValue | undefined;
  onChange: (value: PresetValue | undefined) => void;
}) {
  const source = explicit !== undefined ? def.scope : (resolved !== def.default ? "derived" : "default");
  const sourceIsOverride = source === "org" || source === "project" || source === "user";

  let control: React.ReactNode;
  if (def.locked) {
    control = (
      <span style={{ color: theme.color.text.muted }}>
        {formatValue(resolved)} <em>locked</em>
      </span>
    );
  } else if (Array.isArray(def.default)) {
    control = <span style={{ color: theme.color.text.muted }}>{formatValue(resolved)}</span>;
  } else if (def.allowed) {
    control = (
      <select
        value={explicit !== undefined ? String(explicit) : "__default__"}
        onChange={(e) => onChange(e.target.value === "__default__" ? undefined : e.target.value)}
        style={{ fontSize: theme.fontSize.md }}
      >
        <option value="__default__">(default)</option>
        {def.allowed.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (typeof def.default === "number") {
    control = (
      <input
        type="number"
        value={Number(resolved)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 90, fontSize: theme.fontSize.md }}
      />
    );
  } else {
    control = (
      <input
        type="text"
        value={String(explicit ?? resolved)}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: theme.fontSize.md }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `${theme.space.sm}px 0`,
        borderBottom: `1px solid ${theme.color.borderLight}`,
        gap: theme.space.lg,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: theme.fontSize.base, fontWeight: 500 }}>{def.label}</div>
        <div style={{ fontSize: theme.fontSize.xs, color: theme.color.text.muted }}>
          {def.key}
          {sourceIsOverride ? ` — overridden (${source})` : ` — ${source}`}
        </div>
      </div>
      {control}
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [overrides, setOverrides] = useState<Overrides>(() => loadOverrides());
  const resolved = resolvePresets(PRESETS, overrides);

  const update = (def: PresetDefinition, value: PresetValue | undefined) => {
    setOverrides((prev) => {
      const next: Overrides = {
        org: { ...prev.org },
        project: { ...prev.project },
        user: { ...prev.user },
      };
      if (value === undefined) delete next[def.scope][def.key];
      else next[def.scope][def.key] = value;
      saveOverrides(next);
      return next;
    });
  };

  const groups = Array.from(new Set(PRESETS.map((p) => p.group)));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, overflowY: "auto" }}>
      <div
        style={{
          maxWidth: 640,
          margin: "40px auto",
          background: theme.color.surface,
          borderRadius: theme.radius.md,
          boxShadow: theme.shadow.md,
          padding: theme.space.xl,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.space.xl }}>
          <h3 style={{ margin: 0 }}>EUnomia — Settings</h3>
          <Button onClick={onClose}>Close</Button>
        </div>
        <p style={{ color: theme.color.text.muted, fontSize: theme.fontSize.md, marginTop: 0 }}>
          Opinionated defaults with overrides. Changes persist to this browser and resolve immediately.
        </p>

        {groups.map((group) => (
          <section key={group} style={{ marginBottom: theme.space.xl }}>
            <h4 style={{ margin: `${theme.space.xl}px 0 ${theme.space.sm}px`, fontSize: theme.fontSize.md, color: theme.color.text.subtle }}>
              {GROUP_LABELS[group]}
            </h4>
            {PRESETS.filter((p) => p.group === group).map((def) => (
              <PresetRow
                key={def.key}
                def={def}
                resolved={resolved[def.key].value}
                explicit={overrides[def.scope][def.key]}
                onChange={(value) => update(def, value)}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
