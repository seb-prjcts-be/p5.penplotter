import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drawPlanWithP5, installP5Penplotter, P5Penplotter } from "../p5.penplotter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function FakeEngine(options) {
  this.options = options;
}

function FakeP5() {
  this.width = 640;
  this.height = 480;
  this.calls = [];
}

for (const name of ["push", "noFill", "beginShape", "endShape", "pop"]) {
  FakeP5.prototype[name] = function recordCall() {
    this.calls.push([name]);
  };
}
FakeP5.prototype.stroke = function stroke(value) {
  this.calls.push(["stroke", value]);
};
FakeP5.prototype.strokeWeight = function strokeWeight(value) {
  this.calls.push(["strokeWeight", value]);
};
FakeP5.prototype.vertex = function vertex(x, y) {
  this.calls.push(["vertex", x, y]);
};

installP5Penplotter(FakeP5, FakeEngine);
const instance = new FakeP5();
const engine = instance.createPlotterEngine({ margin: 12 });
assert.equal(engine.options.units, "px");
assert.deepEqual(engine.options.page, { width: 640, height: 480, margin: 12 });

const plan = {
  schema: "vanilla.penplotter/plan@1",
  tools: [{ id: "blue", color: "#245188", width: 0.3 }],
  routes: [{
    toolId: "blue",
    path: { points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }
  }]
};

drawPlanWithP5(instance, plan, { strokeWeight: 2 });
assert.equal(Object.getPrototypeOf(instance).drawRoute, Object.getPrototypeOf(instance).drawPlotPlan, "drawRoute is the word people use for drawPlotPlan");
assert.deepEqual(instance.calls, [
  ["push"],
  ["noFill"],
  ["stroke", "#245188"],
  ["strokeWeight", 2],
  ["beginShape"],
  ["vertex", 1, 2],
  ["vertex", 3, 4],
  ["endShape"],
  ["pop"]
]);
assert.equal(P5Penplotter.version, "0.2.1");
assert.throws(() => drawPlanWithP5(instance, { routes: [] }), /vanilla.penplotter plan/);

const files = [
  "index.html",
  "docs/setup.html",
  "docs/guide.html",
  "docs/examples.html",
  "docs/about.html",
  "docs/handbook.html",
  "docs/architecture.html",
  ...fs.readdirSync(path.join(root, "examples"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `examples/${entry.name}/index.html`)
];
for (const relative of files) {
  const full = path.join(root, relative);
  assert.equal(fs.existsSync(full), true, `Missing ${relative}`);
  const html = fs.readFileSync(full, "utf8");
  const pageMarkup = html.replace(/<pre[\s\S]*?<\/pre>/g, "");
  for (const match of pageMarkup.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(full), target.split(/[#?]/)[0]);
    assert.equal(fs.existsSync(resolved), true, `Broken link ${target} in ${relative}`);
  }
}

// Every example must be listed in the gallery and the manifest.
const gallery = fs.readFileSync(path.join(root, "docs", "examples.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "docs", "p5.penplotter.manifest.json"), "utf8"));
for (const relative of files.filter((name) => name.startsWith("examples/"))) {
  const slug = relative.split("/")[1];
  assert.ok(gallery.includes(`../examples/${slug}/index.html`), `${slug} is listed in docs/examples.html`);
  assert.ok(manifest.examples.includes(slug), `${slug} is in the manifest`);
}

// docs/architecture.html is rendered from Markdown; a stale page fails here,
// not on GitHub Pages.
const { buildDocs } = await import("../tools/build-docs.js");
assert.deepEqual(buildDocs(false), [], "run `npm run docs` and commit the result");

console.log("p5.penplotter snapshot: ok");
