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

  // go() written at the end of the sketch, no key: it waits for one click on
  // the drawing, that click is the confirmation, and a second go() while
  // waiting does not queue a second plot.
  installP5Penplotter(FakeP5, FakeEngine, { driver: fakeKit(log) });
  const said = [];
  let click = null;
  const fromSetup = new FakeP5().createPlot({
    gesture: () => false,
    click: () => new Promise((resolve) => { click = resolve; }),
    confirm: () => { throw new Error("no dialog after a click"); },
    log: (message) => said.push(message)
  });
  fromSetup.line(0, 0, 10, 10);
  const first = fromSetup.go();
  const second = fromSetup.go();
  assert.match(said[0], /Click the drawing to start/);
  assert.equal(said.length, 1, "the second go() while waiting says nothing new");
  const runs = log.filter((entry) => entry[0] === "run").length;
  click();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.status, "complete");
  assert.equal(b.status, "complete");
  assert.equal(log.filter((entry) => entry[0] === "run").length, runs + 1, "one click, one plot, however often go() was written");
  assert.match(said[said.length - 1], /plot complete/);
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
  const sequence = new FakeP5().createPlot({ paper: "A2", margin: 12, gesture: () => true, confirm: () => true, log() {} });
  sequence.transport = Ebb.createLogTransport();
  sequence.driver = new Ebb.EbbDriver({ transport: sequence.transport, profile: "idraw-hse-a2" });
  const origins = [];
  const sequencePlan = sequence.plan.bind(sequence);
  sequence.plan = options => { origins.push(options.origin); return sequencePlan(options); };
  const sequenceResult = await sequence.sequence(index => {
    if (index === 3) return false;
    sequence.point(40 + index * 20, 40);
    return true;
  }, { plan: { strategy: "drawn" } });
  assert.equal(sequenceResult.batches, 3);
  assert.deepEqual(origins[0], { x: 0, y: 0 });
  assert(origins[1].x > 0 && origins[1].y > 0, "the next object starts from the previous position");
  assert(origins[2].x > origins[1].x, "position carries through the sequence");
  assert.equal(sequenceResult.status, "complete");
  assert.equal(sequence.transport.log.filter(command => command === "V").length, 4);
  assert.equal(sequence.transport.log.filter(command => command === "EM,1,1").length, 1);
  assert.equal(sequence.transport.log.filter(command => command === "EM,0,0").length, 1, "only the completed sequence releases the motors");
  assert.equal(sequence.transport.log.filter(command => command.startsWith("SP,0,")).length, 3, "each object records only its new point");
  assert.equal(sequence.transport.log.filter(command => command.startsWith("ES")).length, 0);
  const a2 = new FakeP5().createPlot({ paper: "A2", margin: 12 });
  const userCanvas = new FakeP5();
  userCanvas.height = 250;
  const userPlot = userCanvas.createPlot({ paper: "A2", margin: 12 });
  assert.equal(userPlot.scale, 1.425);
  assert.deepEqual(userPlot.offset, { x: 12, y: 37.875 });
  userPlot.rect(10, 10, 380, 230);
  userPlot.line(30, 125, 370, 125);
  Ebb.compileEbbPlan(userPlot.plan());
  const a4Starter = userCanvas.createPlot({ paper: "A4", margin: 12, width: 120 });
  assert.equal(a4Starter.paper.orientation, "landscape");
  assert.deepEqual(a4Starter.paper, { x: 148.5, y: 111, width: 297, height: 210, margin: 12, format: "A4", orientation: "landscape" });
  assert.deepEqual(a4Starter.offset, { x: 237, y: 178.5 });
  a4Starter.rect(10, 10, 380, 230);
  Ebb.compileEbbPlan(a4Starter.plan());
  const movedPaper = userCanvas.createPlot({ paper: "A4", margin: 12, width: 80, paperX: 50, paperY: 100 });
  assert.deepEqual(movedPaper.offset, { x: 158.5, y: 180 }, "moving paper keeps a fixed-size drawing centred on it");
  movedPaper.line(10, 10, 390, 240);
  Ebb.compileEbbPlan(movedPaper.plan());
  const a3 = userCanvas.createPlot({ paper: "A3", margin: 12 });
  assert.equal(a3.paper.format, "A3");
  assert.deepEqual(a3.offset, { x: 99, y: 92.25 });
  assert.deepEqual(a2.paper, { x: 0, y: 6, width: 594, height: 420, margin: 12, format: "A2", orientation: "landscape" });
  assert.equal(a2.scale, 396 / 300, "canvas fits proportionally between paper margins");
  assert.deepEqual(a2.offset, { x: 33, y: 18 });
  assert.throws(() => new FakeP5().createPlot({ paper: "A2", orientation: "portrait" }), /paper.*bed/i);
  assert.throws(() => new FakeP5().createPlot({ paper: "A0" }), /paper.*bed/i);
  assert.throws(() => new FakeP5().createPlot({ paper: "A2", width: 600 }), /drawing.*paper/i);
  assert.throws(() => new FakeP5().createPlot({ paper: "A4", margin: -1 }), /margin/i);
  assert.throws(() => new FakeP5().createPlot({ paper: "A42" }), /Unknown paper format/);
  a2.line(0, 0, 400, 300);
  Ebb.compileEbbPlan(a2.plan());
  a2.line(-100, 0, 400, 300);
  assert.throws(() => a2.plan(), /outside.*paper/i);
  await assert.rejects(() => a2.go(), /outside.*paper/i, "paper check runs before any serial connection");
  a2.clear();
  a2.rect(10, 10, 380, 280);
  const a2Commands = Ebb.compileEbbPlan(a2.plan());
  const logOnly = Ebb.createLogTransport();
  const a2Result = await new Ebb.EbbDriver({ transport: logOnly }).run(a2Commands, { confirmed: true });
  assert.equal(a2Result.status, "complete", "A2 job completes through log-only transport");
  const portraitCanvas = new FakeP5();
  portraitCanvas.width = 250;
  portraitCanvas.height = 400;
  assert.equal(portraitCanvas.createPlot({ paper: "A2" }).paper.orientation, "landscape", "auto fits this bed even for a portrait canvas");
  assert.throws(() => new FakeP5().createPlot({ paper: "A2", paperX: 1 }), /paper.*bed/i);
  assert.throws(() => new FakeP5().createPlot({ paper: "A2", margin: 210 }), /margin/i);
  installP5Penplotter(FakeP5, PlotterEngine);
  const portable = new FakeP5().createPlot({ paper: "A4", orientation: "portrait", width: 80 });
  assert.equal(portable.paper.width, 210);
  assert.equal(portable.paper.height, 297);
  assert.equal(portable.scale, 0.2);
  assert.deepEqual(portable.offset, { x: 65, y: 118.5 });
  installP5Penplotter(FakeP5, PlotterEngine, { driver: Ebb });
  const plot = new FakeP5().createPlot({ x: 80, y: 70, width: 200 });
  plot.line(0, 0, 80, 0); // 80 px -> 40 mm along X
  const beforePreview = JSON.stringify(plot.plan());
  const rectangles = [];
  const context = {
    canvas: { width: 594, height: 432 }, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, fillText() {}, translate() {}, rotate() {}, stroke() {}, strokeRect() {}, clearRect() {}, save() {}, restore() {},
    fillRect: (...args) => rectangles.push(args)
  };
  plot.drawBed(context, { sheet: { x: 60, y: 50, width: 297, height: 210 } });
  assert.deepEqual(rectangles[1], [60, 50, 297, 210], "real core renders the separately supplied A4 sheet");
  rectangles.length = 0;
  a2.drawBed(context);
  assert.deepEqual(rectangles[1], [0, 6, 594, 420], "paper-aware preview uses the selected A2 sheet automatically");
  assert.equal(JSON.stringify(plot.plan()), beforePreview, "preview preserves the actual machine plan");
  const compiled = Ebb.compileEbbPlan(plot.plan({ strategy: "input" }), { drawSpeed: 10 });
  // One pen-down stroke, whatever the core splits it into: constant-speed SM
  // moves (core 0.2) or accelerating LM phases (core 0.3+).
  const stepsOf = (cmd) => {
    const parts = cmd.split(",").map(Number);
    return cmd.startsWith("LM,") ? [parts[2], parts[5]] : [parts[2], parts[3]];
  };
  const draws = compiled.commands.filter((entry) => entry.kind === "draw");
  const steps = draws.reduce((sum, entry) => sum.map((value, axis) => value + stepsOf(entry.cmd)[axis]), [0, 0]);
  assert.deepEqual(steps, [3200, 3200], "40 mm is 3200 steps on both motors");

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
// A canvas area is not the paper: show the sheet independently without
// changing the geometry that will be sent to the core.
{
  installP5Penplotter(FakeP5, FakeEngine, { driver: fakeKit([]) });
  const plot = new FakeP5().createPlot({ x: 80, y: 70, width: 200 });
  let preview;
  plot.engine.drawBed = (context, options) => { preview = options; };
  const sheet = { x: 60, y: 50, width: 297, height: 210 };
  plot.drawBed({ canvas: {} }, { sheet });
  assert.deepEqual(preview.sheet, sheet, "actual paper has its own size and position");
  assert.deepEqual(plot.toMm(0, 0), { x: 80, y: 70 }, "paper preview does not move the drawing");
  plot.drawBed({ canvas: {} });
  assert.deepEqual(preview.sheet, { x: 80, y: 70, width: 200, height: 150 }, "existing canvas-area preview stays compatible");
}
testShapes();
{
  installP5Penplotter(FakeP5, FakeEngine, { driver: fakeKit([]) });
  const added = [];
  const calls = [];
  const context = Object.fromEntries(["clearRect", "drawImage", "beginPath", "moveTo", "lineTo", "stroke"].map(name => [name, (...args) => calls.push([name, ...args])]));
  const document = {
    createElement() { return { style: {}, setAttribute() {}, getContext() { return context; } }; },
    body: { appendChild(canvas) { added.push(canvas); } }
  };
  const p = new FakeP5();
  p.canvas = { ownerDocument: document, parentNode: document.body };
  const plot = p.createPlot({ x: 80, y: 70, width: 200 });
  plot.engine.drawBed = () => {};
  assert.equal(plot.showBed(), plot);
  const preview = plot.bedPreview;
  plot.showBed();
  assert.equal(added.length, 1, "redraw reuses the automatic preview");
  assert.equal(plot.bedPreview, preview);
  assert.equal(context.strokeStyle, "#d32f2f");
  assert(calls.some(([name, x, y]) => name === "moveTo" && x === 6 && y === 6));
  const supplied = document.createElement("canvas");
  supplied.width = 594;
  supplied.height = 432;
  plot.showBed(supplied);
  plot.showBed();
  assert.equal(plot.bedPreview, supplied, "a page can supply its own preview canvas");
  assert.equal(added.length, 1);
  assert.deepEqual(plot.toMm(0, 0), { x: 80, y: 70 }, "preview leaves plot placement unchanged");
}
testDegrees();
testDefaultsToOneMillimetrePerPixel();
await testGo();
await testAgainstRealCore();

async function testSequence() {
  installP5Penplotter(FakeP5, FakeEngine, { driver: fakeKit([]) });
  const plot = new FakeP5().createPlot({ gesture: () => true, confirm: () => true, log() {} });
  plot.transport = {};
  let release;
  let prepared = 0;
  const jobs = [];
  plot.driver = {
    async session(prepare, options) {
      assert.equal(options.confirmed, true);
      await prepare({ position: { x: 0, y: 0 }, run: (plan, jobOptions) => this.run(plan, jobOptions) });
      return { status: "complete" };
    },
    async run(plan, options) {
      jobs.push(plan.engine.calls.slice());
      assert.deepEqual(plan.planOptions.origin, { x: 0, y: 0 });
      await new Promise(resolve => { release = resolve; });
      return { status: "complete" };
    },
    abort() { release?.(); }
  };
  const operation = plot.sequence(() => {
    if (prepared === 2) return false;
    plot.line(prepared * 10, 0, prepared * 10 + 5, 0);
    prepared++;
    return true;
  });
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(prepared, 1, "next object is not calculated while the machine is drawing");
  assert.equal((await plot.sequence(() => true)).status, "busy");
  release(); release = null;
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(prepared, 2);
  assert.equal(jobs[1].length, 1, "clear prevents replotting the first object");
  release();
  assert.deepEqual(await operation, { status: "complete", batches: 2 });
  assert.equal(plot.pending, null);
  assert.equal(plot.busy, false);

  prepared = 0;
  plot.driver.run = async () => { plot.stop(); return { status: "aborted" }; };
  const stopped = await plot.sequence(() => { prepared++; plot.line(0, 0, 5, 5); return true; });
  assert.equal(stopped.status, "aborted");
  assert.equal(prepared, 1, "stop prevents the next calculation");
  plot.options.confirm = () => false;
  assert.equal((await plot.sequence(() => { throw Error("must not prepare"); })).status, "cancelled");
  assert.equal(plot.pending, null);
  plot.options.confirm = () => true;
  let safelyStopped = false;
  plot.driver.safeStop = async () => { safelyStopped = true; };
  await assert.rejects(plot.sequence(() => { throw Error("calculation failed"); }), /calculation failed/);
  assert(safelyStopped);
  assert.equal(plot.busy, false);
  await assert.rejects(plot.sequence(() => true, { returnHome: false }), /return home/);
  delete plot.driver.session;
  await assert.rejects(plot.sequence(() => { throw Error("must not prepare"); }), /core driver with session/);
}
await testSequence();
console.log("p5.penplotter plot: ok");
