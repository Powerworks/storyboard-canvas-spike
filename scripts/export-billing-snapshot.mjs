#!/usr/bin/env node
// Billing/agreement snapshot exporter — turns a set of Layer 2 Example Maps
// into a priced, client-facing scope-of-work Markdown document ("N slices
// x rate = total, specification below"), mirroring eventmodelers.ai's own
// fixed-price-per-slice billing model.
//
// Sibling of export-specifications.mjs, reading the same ExampleMapBoard
// shape — but a DIFFERENT AUDIENCE (commercial sign-off, not test
// generation), so its policy differs deliberately:
//   - export-specifications.mjs REFUSES a slice with any unresolved
//     Question, because an incomplete engineering spec shouldn't silently
//     generate a test.
//   - This script INCLUDES such a slice, but flags it visibly in the
//     rendered document, because a mostly-mapped slice is still a
//     legitimate billable unit as long as the ambiguity is visible to
//     whoever is signing off on it.
//
// Input: a directory of per-slice board JSON files, each named
// "<sliceId>-example-map.json" — exactly what ExampleMapView.tsx's
// "Export Board JSON" button already produces.
//
// Versioning: output is never overwritten. Re-running with the same
// project/date produces a new, separately-numbered file — a later change
// gets a new dated snapshot, not a silently-edited old one.
//
// Usage:
//   node scripts/export-billing-snapshot.mjs \
//     --boards-dir <dir> --slice-ids <id1,id2,...> \
//     --rate <number> --currency <code> \
//     --client "<name>" --project "<name>" \
//     [--status <Proposed|Agreed|...>] [--out-dir <dir>]

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const args = {
    boardsDir: null,
    sliceIds: null,
    rate: null,
    currency: "EUR",
    client: null,
    project: null,
    status: "Proposed",
    outDir: "./snapshots",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = () => argv[++i];
    if (flag === "--boards-dir") args.boardsDir = val();
    else if (flag === "--slice-ids") args.sliceIds = val().split(",").map((s) => s.trim());
    else if (flag === "--rate") args.rate = Number(val());
    else if (flag === "--currency") args.currency = val();
    else if (flag === "--client") args.client = val();
    else if (flag === "--project") args.project = val();
    else if (flag === "--status") args.status = val();
    else if (flag === "--out-dir") args.outDir = val();
  }
  return args;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param {string} boardsDir
 * @param {string[]} sliceIds
 * @returns {{ sliceId: string, sliceTitle: string, rules: any[], openQuestions: any[] }[]}
 */
function loadSlices(boardsDir, sliceIds) {
  return sliceIds.map((sliceId) => {
    const path = join(boardsDir, `${sliceId}-example-map.json`);
    if (!existsSync(path)) {
      throw new Error(`Missing board file for slice "${sliceId}": expected ${path}`);
    }
    const board = JSON.parse(readFileSync(path, "utf8"));
    const { nodes, edges } = board;

    const ruleNodes = nodes.filter((n) => n.data?.nodeType === "rule");
    const questionNodes = nodes.filter((n) => n.data?.nodeType === "question");

    const childrenByRuleId = new Map();
    for (const edge of edges) {
      const rule = ruleNodes.find((r) => r.id === edge.source);
      if (!rule) continue;
      const child = nodes.find((n) => n.id === edge.target);
      if (!child) continue;
      if (!childrenByRuleId.has(rule.id)) childrenByRuleId.set(rule.id, []);
      childrenByRuleId.get(rule.id).push(child);
    }

    const rules = ruleNodes.map((rule) => {
      const children = childrenByRuleId.get(rule.id) ?? [];
      return {
        label: rule.data.label,
        examples: children.filter((c) => c.data?.nodeType === "example"),
      };
    });

    // Slice title: prefer the first Rule's label context isn't available here,
    // so fall back to the sliceId itself — the caller may not have a nicer
    // title on hand for a hand-authored board (matches export-specifications.mjs's
    // own "don't invent structure the source doesn't have" discipline).
    const sliceTitle = board.sliceTitle ?? sliceId;

    return { sliceId, sliceTitle, rules, openQuestions: questionNodes };
  });
}

function renderMarkdown({ project, client, status, rate, currency, date, slices }) {
  const total = slices.length * rate;
  const slicesWithQuestions = slices.filter((s) => s.openQuestions.length > 0);

  const lines = [];
  lines.push(`# ${project} — Scope of Work`);
  lines.push("");
  lines.push(`**Client:** ${client}          **Status:** ${status}`);
  lines.push(`**Date:** ${date}         **Rate:** ${rate} ${currency} / slice`);
  lines.push(`**Slices:** ${slices.length}                 **Total:** ${total} ${currency}`);
  lines.push("");
  if (slicesWithQuestions.length > 0) {
    lines.push(
      `> ⚠ ${slicesWithQuestions.length} of ${slices.length} slices below have open questions still unresolved — see callouts.`,
    );
    lines.push("");
  }
  lines.push("## Specification");
  lines.push("");

  for (const slice of slices) {
    lines.push(`### ${slice.sliceTitle}`);
    lines.push("");
    for (const rule of slice.rules) {
      lines.push(`**${rule.label}**`);
      if (rule.examples.length === 0) {
        lines.push("- _(no examples captured yet)_");
      } else {
        for (const ex of rule.examples) {
          const s = ex.data.scenario;
          lines.push(`- ${ex.data.label} — Given ${s.given}, When ${s.when}, Then ${s.then}`);
        }
      }
      lines.push("");
    }
    for (const q of slice.openQuestions) {
      lines.push(`⚠ Open question: ${q.data.label}`);
    }
    if (slice.openQuestions.length > 0) lines.push("");
  }

  lines.push("---");
  lines.push("Client sign-off: ______________________  Date: ______");
  lines.push("");
  lines.push("Version1 sign-off: ______________________  Date: ______");
  lines.push("");

  return lines.join("\n");
}

function writeVersioned(outDir, baseName, content) {
  mkdirSync(outDir, { recursive: true });
  let candidate = join(outDir, `${baseName}.md`);
  let n = 2;
  while (existsSync(candidate)) {
    candidate = join(outDir, `${baseName}-${n}.md`);
    n += 1;
  }
  writeFileSync(candidate, content);
  return candidate;
}

// --- CLI wrapper -------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const missing = ["boardsDir", "sliceIds", "rate", "client", "project"].filter((k) => !args[k]);
if (missing.length > 0) {
  console.error(
    "Usage: node export-billing-snapshot.mjs --boards-dir <dir> --slice-ids <id1,id2,...> --rate <number> --currency <code> --client \"<name>\" --project \"<name>\" [--status <status>] [--out-dir <dir>]",
  );
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}

let slices;
try {
  slices = loadSlices(args.boardsDir, args.sliceIds);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const markdown = renderMarkdown({
  project: args.project,
  client: args.client,
  status: args.status,
  rate: args.rate,
  currency: args.currency,
  date,
  slices,
});

const baseName = `${date}-${slugify(args.project)}`;
const written = writeVersioned(args.outDir, baseName, markdown);
console.error(`[billing-snapshot] wrote ${written}`);
console.error(
  `[billing-snapshot] ${slices.length} slice(s), ${slices.filter((s) => s.openQuestions.length > 0).length} with open questions`,
);
