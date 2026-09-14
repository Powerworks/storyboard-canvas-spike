#!/usr/bin/env node
// Stakeholder digest exporter — third sibling of export-specifications.mjs
// and export-billing-snapshot.mjs, reading the same ExampleMapBoard shape.
//
// Purpose: the smallest honest slice of "keep stakeholders informed between
// workshop sessions" that doesn't require a backend. Surfaces currently-open
// Question nodes (things needing stakeholder input) and recently-answered
// ones (so stakeholders see their input was actually used, not a one-way
// ask list) as a shareable Markdown status view. NOT a notification system,
// NOT live/bidirectional — a human still shares this file/link manually,
// and answers are still entered back via the "Mark Answered" button in
// ExampleMapView.tsx, not captured automatically from a stakeholder's reply.
//
// A Question's status/answer/answeredAt live on its own node.data
// (ExampleMapNode.tsx's ExampleMapNodeData) — status missing/undefined is
// treated as "open" throughout, so boards saved before this field existed
// need no migration.
//
// Two freshness modes, a per-project choice (not hardcoded):
//   --mode always-current (default) — overwrites one fixed file every run.
//     Matches "check progress anytime": one reliable link, not "which file
//     is newest".
//   --mode versioned — never overwrites (same numbered-suffix mechanism as
//     export-billing-snapshot.mjs's writeVersioned), for clients where an
//     audit trail of "what was visible on what date" matters.
//
// Usage:
//   node scripts/export-stakeholder-digest.mjs \
//     --boards-dir <dir> --slice-ids <id1,id2,...> --project "<name>" \
//     [--mode always-current|versioned] [--recently-answered-days <n>] \
//     [--out-dir <dir>]

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadResolvedPresets } from "./presets.mjs";

function parseArgs(argv) {
  const args = {
    boardsDir: null,
    sliceIds: null,
    project: null,
    mode: null,
    recentlyAnsweredDays: 14,
    outDir: "./digests",
    presets: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = () => argv[++i];
    if (flag === "--boards-dir") args.boardsDir = val();
    else if (flag === "--slice-ids") args.sliceIds = val().split(",").map((s) => s.trim());
    else if (flag === "--project") args.project = val();
    else if (flag === "--mode") args.mode = val();
    else if (flag === "--recently-answered-days") args.recentlyAnsweredDays = Number(val());
    else if (flag === "--out-dir") args.outDir = val();
    else if (flag === "--presets") args.presets = val();
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
 * @param {number} recentlyAnsweredDays
 */
function loadDigestData(boardsDir, sliceIds, recentlyAnsweredDays) {
  const now = Date.now();
  const cutoffMs = recentlyAnsweredDays * 24 * 60 * 60 * 1000;

  return sliceIds.map((sliceId) => {
    const path = join(boardsDir, `${sliceId}-example-map.json`);
    if (!existsSync(path)) {
      throw new Error(`Missing board file for slice "${sliceId}": expected ${path}`);
    }
    const board = JSON.parse(readFileSync(path, "utf8"));
    const questionNodes = board.nodes.filter((n) => n.data?.nodeType === "question");

    const open = [];
    const recentlyAnswered = [];
    for (const q of questionNodes) {
      const status = q.data.status ?? "open";
      if (status === "open") {
        open.push(q);
        continue;
      }
      // status === "answered"
      const answeredAt = q.data.answeredAt ? Date.parse(q.data.answeredAt) : NaN;
      if (!Number.isNaN(answeredAt) && now - answeredAt <= cutoffMs) {
        recentlyAnswered.push(q);
      }
      // else: answered but outside the recency window — omitted entirely,
      // not old news worth showing as "progress".
    }

    const sliceTitle = board.sliceTitle ?? sliceId;
    return { sliceId, sliceTitle, open, recentlyAnswered };
  });
}

function renderMarkdown({ project, date, slices }) {
  const totalOpen = slices.reduce((sum, s) => sum + s.open.length, 0);
  const totalAnswered = slices.reduce((sum, s) => sum + s.recentlyAnswered.length, 0);

  const lines = [];
  lines.push(`# ${project} — Stakeholder Digest`);
  lines.push("");
  lines.push(`**Generated:** ${date}          **Slices covered:** ${slices.length}`);
  lines.push("");
  lines.push(`## Open — needs your input (${totalOpen})`);
  lines.push("");
  if (totalOpen === 0) {
    lines.push("No open questions right now.");
    lines.push("");
  } else {
    for (const slice of slices) {
      if (slice.open.length === 0) continue;
      lines.push(`### ${slice.sliceTitle}`);
      for (const q of slice.open) {
        lines.push(`- ${q.data.label}`);
      }
      lines.push("");
    }
  }
  lines.push(`## Recently answered (${totalAnswered})`);
  lines.push("");
  if (totalAnswered === 0) {
    lines.push("Nothing answered recently.");
    lines.push("");
  } else {
    for (const slice of slices) {
      if (slice.recentlyAnswered.length === 0) continue;
      lines.push(`### ${slice.sliceTitle}`);
      for (const q of slice.recentlyAnswered) {
        const answeredDate = q.data.answeredAt ? q.data.answeredAt.slice(0, 10) : "unknown date";
        lines.push(`- ${q.data.label}`);
        lines.push(`  **Answer:** ${q.data.answer} _(answered ${answeredDate})_`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function writeAlwaysCurrent(outDir, baseName, content) {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${baseName}.md`);
  writeFileSync(path, content);
  return path;
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

// Presets (Phase 4): the freshness mode defaults from communication.digestMode
// unless overridden on the command line.
let presets;
try {
  presets = loadResolvedPresets(args.presets);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const mode = args.mode ?? presets["communication.digestMode"] ?? "always-current";

const missing = ["boardsDir", "sliceIds", "project"].filter((k) => !args[k]);
if (missing.length > 0) {
  console.error(
    'Usage: node export-stakeholder-digest.mjs --boards-dir <dir> --slice-ids <id1,id2,...> --project "<name>" [--mode always-current|versioned] [--recently-answered-days <n>] [--out-dir <dir>] [--presets <file>]',
  );
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}
if (mode !== "always-current" && mode !== "versioned") {
  console.error(`Invalid --mode "${mode}" — must be "always-current" or "versioned".`);
  process.exit(1);
}

let slices;
try {
  slices = loadDigestData(args.boardsDir, args.sliceIds, args.recentlyAnsweredDays);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const markdown = renderMarkdown({ project: args.project, date, slices });

const slug = slugify(args.project);
const written =
  mode === "always-current"
    ? writeAlwaysCurrent(args.outDir, `${slug}-digest`, markdown)
    : writeVersioned(args.outDir, `${date}-${slug}-digest`, markdown);

console.error(`[stakeholder-digest] wrote ${written} (mode: ${mode})`);
console.error(
  `[stakeholder-digest] ${slices.reduce((s, sl) => s + sl.open.length, 0)} open, ${slices.reduce((s, sl) => s + sl.recentlyAnswered.length, 0)} recently answered`,
);
