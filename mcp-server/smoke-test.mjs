// Manual smoke test: spawns the MCP server as a child process and drives
// it over stdio JSON-RPC directly, without depending on any external
// harness being available to test against.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const proc = spawn("node", [join(__dirname, "index.mjs")], { stdio: ["pipe", "pipe", "pipe"] });

let buffer = "";
const pending = new Map();
let nextId = 1;

proc.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});
proc.stderr.on("data", (chunk) => process.stderr.write(`[server stderr] ${chunk}`));

function send(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

async function main() {
  const init = await send("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "0.0.1" },
  });
  console.log("=== initialize ===");
  console.log(JSON.stringify(init.result?.serverInfo, null, 2));
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const list = await send("tools/list", {});
  console.log("\n=== tools/list ===");
  console.log((list.result?.tools ?? []).map((t) => t.name));

  const arcs = await send("tools/call", { name: "list_story_arcs", arguments: {} });
  console.log("\n=== list_story_arcs (first 200 chars) ===");
  console.log(arcs.result?.content?.[0]?.text?.slice(0, 200));

  const arc = await send("tools/call", { name: "get_story_arc", arguments: { specId: "002a-member-registration" } });
  const arcData = JSON.parse(arc.result?.content?.[0]?.text ?? "{}");
  console.log("\n=== get_story_arc(002a-member-registration) ===");
  console.log("nodes:", arcData.nodes?.length, "edges:", arcData.edges?.length);

  const badArc = await send("tools/call", { name: "get_story_arc", arguments: { specId: "does-not-exist" } });
  console.log("\n=== get_story_arc(does-not-exist) — expect isError ===");
  console.log("isError:", badArc.result?.isError, "text:", badArc.result?.content?.[0]?.text);

  const search = await send("tools/call", { name: "search_elements", arguments: { query: "membership" } });
  const searchResults = JSON.parse(search.result?.content?.[0]?.text ?? "[]");
  console.log("\n=== search_elements('membership') ===");
  console.log("matches:", searchResults.length, searchResults.slice(0, 3).map((n) => n.label));

  const slices = await send("tools/call", { name: "list_slices", arguments: { specId: "002a-member-registration" } });
  const sliceData = JSON.parse(slices.result?.content?.[0]?.text ?? "[]");
  console.log("\n=== list_slices(002a-member-registration) ===");
  console.log("count:", sliceData.length, "first:", JSON.stringify(sliceData[0]));
  const withMap = sliceData.find((s) => s.hasExampleMap);
  console.log("first with hasExampleMap:", withMap?.sliceId);

  if (withMap) {
    const em = await send("tools/call", { name: "get_example_map", arguments: { sliceId: withMap.sliceId } });
    const emData = JSON.parse(em.result?.content?.[0]?.text ?? "{}");
    console.log("\n=== get_example_map ===");
    console.log("nodes:", emData.nodes?.length, "edges:", emData.edges?.length, "nodeTypes:", emData.nodes?.map((n) => n.data?.nodeType));

    const specs = await send("tools/call", { name: "export_specifications", arguments: { sliceId: withMap.sliceId } });
    const specData = JSON.parse(specs.result?.content?.[0]?.text ?? "{}");
    console.log("\n=== export_specifications ===");
    console.log("specifications:", specData.specifications?.length, "warnings:", specData.warnings?.length);
  }

  const badMap = await send("tools/call", { name: "get_example_map", arguments: { sliceId: "does-not-exist" } });
  console.log("\n=== get_example_map(does-not-exist) — expect isError ===");
  console.log("isError:", badMap.result?.isError);

  proc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  proc.kill();
  process.exit(1);
});
