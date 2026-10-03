import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageData = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const examples = fs.readdirSync(path.join(root, "examples"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const manifest = {
  version: packageData.version,
  p5js_target: "2.2.2",
  core: "vanilla.penplotter@>=0.2.0",
  core_plan_schema: "vanilla.penplotter/plan@1",
  methods: ["createPlotterEngine", "createPlot", "drawPlotPlan"],
  examples
};
fs.writeFileSync(
  path.join(root, "docs", "p5.penplotter.manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);
console.log(`manifest ${manifest.version}: ${examples.length} examples`);
