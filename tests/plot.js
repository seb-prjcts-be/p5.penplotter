import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { installP5Penplotter } from "../p5.penplotter.js";

function FakeP5() {
  this.width = 400;
  this.height = 300;
  this.calls = [];
}
for (const name of ["push", "pop", "noFill", "beginShape", "endShape", "line", "circle", "rect", "vertex", "point", "ellipse", "arc", "triangle", "quad"]) {
  FakeP5.prototype[name] = function record(...args) {
    this.calls.push([name, ...args]);
  };
}

function FakeEngine(options) {
  this.options = options;
  this.calls = [];
  for (const name of ["line", "circle", "rect", "polyline", "polygon"]) {
    this[name] = (...args) => this.calls.push([name, ...args]);
  }
  this.plan = (planOptions) => ({ schema: "vanilla.penplotter/plan@1", planOptions, engine: this });
}
FakeEngine.version = "0.2.0";

function fakeKit(log) {
  return {
    EBB_PROFILES: { "idraw-hse-a2": { travel: { width: 594, height: 432 } } },
    createWebSerialTransport(port, options) {
      log.push(["transport", port, options]);
      return { async open() { log.push(["open"]); }, async close() { log.push(["close"]); } };
    },
    EbbDriver: class {
      constructor(options) { log.push(["driver", options.profile]); }
      async run(plan, options) { log.push(["run", plan.schema, options.confirmed]); return { status: "complete" }; }
      abort() { log.push(["abort"]); }
    }
  };
}

function testDrawsAndRecords() {
  installP5Penplotter(FakeP5, FakeEngine, { driver: fakeKit([]) });
  const p = new FakeP5();
  // The 400 px wide canvas lands 200 mm wide on the bed, 80 / 70 mm from home.
  const plot = p.createPlot({ x: 80, y: 70, width: 200 });
  assert.equal(plot.engine.options.units, "mm");
  assert.deepEqual(plot.engine.options.page, { width: 594, height: 432 });

  plot.line(0, 0, 400, 300);
  plot.circle(200, 150, 100); // p5 takes a diameter, the engine a radius
  plot.rect(20, 40, 100, 60);
  plot.polyline([{ x: 0, y: 0 }, [40, 20]]);

  assert.deepEqual(p.calls.slice(0, 3), [
    ["line", 0, 0, 400, 300],
    ["circle", 200, 150, 100],
    ["rect", 20, 40, 100, 60]
  ]);
  assert.deepEqual(p.calls.slice(3), [
    ["push"], ["noFill"], ["beginShape"], ["vertex", 0, 0], ["vertex", 40, 20], ["endShape"], ["pop"]
  ]);
  assert.deepEqual(plot.engine.calls, [
    ["line", 80, 70, 280, 220],
    ["circle", 180, 145, 25],
    ["rect", 90, 90, 50, 30],
    ["polyline", [{ x: 80, y: 70 }, { x: 100, y: 80 }]]
  ]);

  const first = plot.engine;
  plot.clear();
  assert.notEqual(plot.engine, first, "clear() starts an empty job for the next frame");
  assert.equal(plot.engine.calls.length, 0);
}

function testDefaultsToOneMillimetrePerPixel() {
  installP5Penplotter(FakeP5, FakeEngine);
  const plot = new FakeP5().createPlot();
  plot.line(10, 20, 30, 40);
  assert.deepEqual(plot.engine.calls, [["line", 10, 20, 30, 40]]);
  assert.deepEqual(plot.engine.options.page, { width: 400, height: 300 });
}

async function testGo() {
  const log = [];
  installP5Penplotter(FakeP5, FakeEngine, { driver: fakeKit(log) });
  const plot = new FakeP5().createPlot({ confirm: () => true, log: () => {} });
  plot.line(0, 0, 10, 10);
  const result = await plot.go();
  assert.equal(result.status, "complete");
  assert.deepEqual(log.map((entry) => entry[0]), ["transport", "open", "driver", "run"]);
  assert.deepEqual(log[3], ["run", "vanilla.penplotter/plan@1", true]);

  await plot.go();
  assert.equal(log.filter((entry) => entry[0] === "open").length, 1, "the connection is reused");

  const declined = new FakeP5().createPlot({ confirm: () => false, log: () => {} });
  declined.line(0, 0, 10, 10);
  const before = log.length;
  assert.equal((await declined.go()).status, "cancelled");
  assert.equal(log.filter((entry) => entry[0] === "run").length, 2, "nothing runs without confirmation");
  assert.ok(log.length >= before);

  installP5Penplotter(FakeP5, FakeEngine);
  const noDriver = new FakeP5().createPlot({ confirm: () => true, log: () => {} });
  await assert.rejects(() => noDriver.go(), /driver/);
}

// Real consumer: the actual core and its EBB driver, when a checkout is at hand.
async function testAgainstRealCore() {
  const root = process.env.VANILLA_PLOTTER_ROOT || path.resolve("..", "vanilla.penplotter");
  if (!fs.existsSync(path.join(root, "src", "driver", "ebb.js"))) {
    console.log("p5.penplotter plot: real-core check skipped (no vanilla.penplotter with src/driver/ebb.js found)");
    return;
  }
  const { PlotterEngine } = await import(pathToFileURL(path.join(root, "vanilla.penplotter.js")));
  const Ebb = await import(pathToFileURL(path.join(root, "src", "driver", "ebb.js")));
  installP5Penplotter(FakeP5, PlotterEngine, { driver: Ebb });
  const plot = new FakeP5().createPlot({ x: 80, y: 70, width: 200 });
  plot.line(0, 0, 80, 0); // 80 px -> 40 mm along X
  const compiled = Ebb.compileEbbPlan(plot.plan({ strategy: "input" }), { drawSpeed: 10 });
  const draw = compiled.commands.find((entry) => entry.kind === "draw");
  assert.equal(draw.cmd, "SM,4000,3200,3200", "40 mm is 3200 steps on both motors");

  // Fills come from the core and are drawn back on the canvas.
  const filled = new FakeP5().createPlot({ x: 80, y: 70, width: 200 });
  filled.hatch([[0, 0], [80, 0], [80, 80], [0, 80]], 5); // 40 x 40 mm, 5 mm spacing
  const hatchLines = filled.p.calls.filter((call) => call[0] === "line").length;
  assert.ok(hatchLines >= 8 && hatchLines <= 12, `hatch draws its lines on the canvas (${hatchLines})`);
  assert.equal(filled.plan().stats.paths, hatchLines, "the same lines go to the plotter");
  const dotted = new FakeP5().createPlot({ x: 80, y: 70, width: 200 });
  dotted.stipple([[0, 0], [80, 0], [80, 80], [0, 80]], 30, 7);
  const again = new FakeP5().createPlot({ x: 80, y: 70, width: 200 });
  again.stipple([[0, 0], [80, 0], [80, 80], [0, 80]], 30, 7);
  assert.equal(dotted.p.calls.filter((call) => call[0] === "point").length, 30);
  assert.deepEqual(dotted.p.calls, again.p.calls, "the same seed gives the same dots");

  const outside = new FakeP5().createPlot({ x: 500, y: 70, width: 200 });
  outside.line(0, 0, 400, 0);
  assert.throws(() => Ebb.compileEbbPlan(outside.plan()), /outside the machine travel/);
  console.log("p5.penplotter plot: real-core check ok");
}

// The other p5 primitives: same call on the canvas, same shape in millimetres.
function testShapes() {
  installP5Penplotter(FakeP5, FakeEngine);
  const p = new FakeP5();
  const plot = p.createPlot({ x: 10, y: 20, width: 200 }); // 0.5 mm per pixel

  plot.point(100, 100);
  plot.square(0, 0, 40);
  plot.triangle(0, 0, 40, 0, 0, 40);
  plot.quad(0, 0, 40, 0, 40, 40, 0, 40);
  plot.ellipse(100, 100, 80);
  plot.ellipse(100, 100, 80, 40);
  plot.arc(100, 100, 80, 80, 0, Math.PI / 2);
  plot.arc(100, 100, 80, 80, 0, Math.PI / 2, "pie");
  plot.polygon([[0, 0], [40, 0], [40, 40]]);

  assert.deepEqual(p.calls.slice(0, 7), [
    ["point", 100, 100],
    ["rect", 0, 0, 40, 40],
    ["triangle", 0, 0, 40, 0, 0, 40],
    ["quad", 0, 0, 40, 0, 40, 40, 0, 40],
    ["ellipse", 100, 100, 80, 80],
    ["ellipse", 100, 100, 80, 40],
    ["arc", 100, 100, 80, 80, 0, Math.PI / 2, undefined]
  ]);

  const calls = plot.engine.calls;
  assert.deepEqual(calls[0], ["line", 60 - 0.12, 70, 60 + 0.12, 70], "a point is a quarter-millimetre dash");
  assert.deepEqual(calls[1], ["rect", 10, 20, 20, 20]);
  assert.deepEqual(calls[2], ["polygon", [{ x: 10, y: 20 }, { x: 30, y: 20 }, { x: 10, y: 40 }]]);
  assert.deepEqual(calls[3], ["polygon", [{ x: 10, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 40 }, { x: 10, y: 40 }]]);
  assert.deepEqual(calls[4], ["circle", 60, 70, 20], "a round ellipse stays a circle");
  assert.equal(calls[5][0], "polygon");
  assert.equal(calls[5][1].length, 96, "an oval is flattened like the engine flattens a circle");
  assert.equal(calls[6][0], "polyline", "an open arc is a polyline");
  assert.equal(calls[6][1].length, 25);
  const first = calls[6][1][0];
  const last = calls[6][1][24];
  assert.ok(Math.abs(first.x - 80) < 1e-9 && Math.abs(first.y - 70) < 1e-9, "arc starts on the right");
  assert.ok(Math.abs(last.x - 60) < 1e-9 && Math.abs(last.y - 90) < 1e-9, "arc ends at the bottom");
  assert.equal(calls[7][0], "polygon", "a pie arc closes through the centre");
  assert.deepEqual(calls[7][1][25], { x: 60, y: 70 });
  assert.deepEqual(calls[8], ["polygon", [{ x: 10, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 40 }]], "[x, y] pairs work");
}

// angleMode(DEGREES) in the sketch never reaches the engine as degrees.
function testDegrees() {
  installP5Penplotter(FakeP5, FakeEngine);
  const p = new FakeP5();
  p.angleMode = () => "degrees";
  const plot = p.createPlot();
  plot.arc(0, 0, 20, 20, 0, 90);
  const points = plot.engine.calls[0][1];
  const last = points[points.length - 1];
  assert.ok(Math.abs(last.x) < 1e-9 && Math.abs(last.y - 10) < 1e-9, "90 degrees is a quarter turn");
}

testDrawsAndRecords();
testShapes();
testDegrees();
testDefaultsToOneMillimetrePerPixel();
await testGo();
await testAgainstRealCore();
console.log("p5.penplotter plot: ok");
