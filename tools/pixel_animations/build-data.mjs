// Numbers for the first-steps pixel animations, from the released browser
// bundle (adapter + core + EBB driver). Writes scene-data.json next to this file.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { P5Plot, PlotterEngine, Ebb, metadata } from "../../dist/p5.penplotter.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function sketch(width, height) {
  const p = { width, height, recorded: 0 };
  for (const name of ["point", "line", "circle", "ellipse", "arc", "rect", "triangle", "quad", "push", "pop", "noFill", "beginShape", "vertex", "endShape"]) p[name] = () => {};
  p.angleMode = () => "radians";
  return p;
}

function summary(plot) {
  const plan = plot.plan();
  const compiled = Ebb.compileEbbPlan(plan, { profile: "idraw-hse-a2" });
  return {
    paths: plan.stats.paths,
    drawMm: Math.round(plan.stats.drawDistance),
    travelMm: Math.round(plan.stats.travelDistance),
    penLifts: plan.stats.penLifts,
    seconds: Math.round(compiled.stats.durationMs / 1000),
    paths_mm: plan.routes.map((route) => route.path.points.map((point) => [point.x, point.y]))
  };
}

// The Setup sketch: createPlot({ paper: "A2", paperX: 0, paperY: 0, width: 100 }).
const options = { driver: Ebb, paper: "A2", paperX: 0, paperY: 0, width: 100 };

// Setup: the first circle.
const p1 = sketch(400, 400);
const first = new P5Plot(p1, PlotterEngine, options);
first.circle(200, 200, 300);
const circle = summary(first);
const scale = first.scale;
const paper = first.paper;
assert.equal(paper.format, "A2");
assert.equal(circle.paths, 1);

// line() against plot.line(): only the second call reaches the recording.
const p2 = sketch(400, 400);
const linePlot = new P5Plot(p2, PlotterEngine, options);
p2.line(80, 200, 320, 200);
const before = linePlot.engine.plan().stats.paths;
linePlot.line(80, 200, 320, 200);
const line = summary(linePlot);
assert.equal(before, 0);
assert.equal(line.paths, 1);

// draw() without noLoop(): five seconds at 60 frames per second, each frame
// a circle at a random place. plan() merges identical paths, so a drawing
// that does not change would collapse to one path; a changing one does not.
const p3 = sketch(400, 400);
const looping = new P5Plot(p3, PlotterEngine, options);
const frames = 300;
let seed = 7;
const random = (max) => (seed = (seed * 16807) % 2147483647) / 2147483647 * max;
const randomCircles = [];
for (let frame = 0; frame < frames; frame++) {
  const c = [40 + random(320), 40 + random(320), 60];
  randomCircles.push(c);
  looping.circle(...c);
}
const loop = summary(looping);
assert.equal(loop.paths, frames);

const p4 = sketch(400, 400);
const still = new P5Plot(p4, PlotterEngine, options);
for (let frame = 0; frame < frames; frame++) still.circle(200, 200, 300);
assert.equal(still.plan().stats.paths, 1, "identical circles are merged by plan()");

const p5 = sketch(400, 400);
const once = new P5Plot(p5, PlotterEngine, options);
once.circle(...randomCircles[0]);
const single = summary(once);

const data = {
  source: { adapter: metadata.version, coreVersion: metadata.coreVersion, coreCommit: metadata.coreCommit },
  paper, scale,
  bed: Ebb.EBB_PROFILES["idraw-hse-a2"].travel,
  pointDashMm: 0.24,
  circle: { diameterMm: Math.round(300 * scale), ...circle },
  line: { lengthMm: Math.round(240 * scale), ...line },
  loop: { frames, ...loop, paths_mm: undefined, circles: randomCircles },
  once: { ...single, paths_mm: undefined }
};
fs.writeFileSync(path.join(here, "scene-data.json"), JSON.stringify(data, null, 1) + "\n");
console.log(JSON.stringify({ ...data, circle: { ...data.circle, paths_mm: `${circle.paths_mm[0].length} points` }, line: { ...data.line, paths_mm: undefined } }, null, 1));
