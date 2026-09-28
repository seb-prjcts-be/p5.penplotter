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
assert.equal(P5Penplotter.version, "0.2.0");
assert.throws(() => drawPlanWithP5(instance, { routes: [] }), /vanilla.penplotter plan/);

const files = [
  "index.html",
  "docs/setup.html",
  "docs/guide.html",
  "docs/examples.html",
  "examples/first_plot/index.html",
  "examples/wave_plot/index.html",
  "examples/direct_plot/index.html",
  "examples/molnar_grid/index.html"
];
for (const relative of files) {
  const full = path.join(root, relative);
  assert.equal(fs.existsSync(full), true, `Missing ${relative}`);
  const html = fs.readFileSync(full, "utf8");
  const pageMarkup = html.replace(/<pre[\s\S]*?<\/pre>/g, "");
  for (const match of pageMarkup.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(full), target.split("#")[0]);
    assert.equal(fs.existsSync(resolved), true, `Broken link ${target} in ${relative}`);
  }
}

console.log("p5.penplotter snapshot: ok");
