import assert from "node:assert/strict";
import { P5Plot } from "../p5.penplotter.js";
import { PlotterEngine } from "../../vanilla.penplotter/vanilla.penplotter.js";
import * as Driver from "../../vanilla.penplotter/src/driver/index.js";

const bytes = new TextEncoder();
const sent = [];
let input;
let stopPlot;
let draining = 0;
const port = {
  readable: new ReadableStream({ start(controller) { input = controller; } }),
  writable: new WritableStream({ write(data) {
    const command = new TextDecoder().decode(data);
    sent.push(command);
    if (stopPlot && command === "G1 Z5 F1000\r") {
      stopPlot.stop();
      stopPlot = null;
      draining = 2;
    }
    if (command === "?" && draining-- > 0) {
      input.enqueue(bytes.encode("<Run|WPos:0,0,5>\r\n"));
      return;
    }
    input.enqueue(bytes.encode(command === "V\r" ? "DrawCore V2.09\r\n" : command === "?" ? "<Idle|WPos:0,0,0>\r\n" : "ok\r\n"));
  } }),
  async close() {}
};
const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serial: { async getPorts() { return [port]; } } } });
try {
  const p = { width: 600, height: 600, line() {} };
  const plot = new P5Plot(p, PlotterEngine, {
    driver: Driver, paper: "A3", margin: 12,
    drawcore: { travel: { width: 420, height: 297 }, penUp: 0.5, penDown: 5, axes: { swapXY: true, xDirection: -1, yDirection: -1 } },
    confirm: () => true, log() {}
  });
  assert.deepEqual(plot.engine.document.page.width, 420);
  assert.equal(plot.paper.x, 0);
  assert.equal(plot.paper.y, 0);
  plot.line(20, 20, 40, 20);
  assert.equal((await plot.go()).status, "complete");
  assert.equal(plot.driver.identity.protocol, "drawcore");
  assert(sent.includes("G1 Z5 F1000\r"));
  assert(!sent.some(command => /^(SP|SM|LM|EM|ES)/.test(command)));
  const beforeStop = sent.length;
  stopPlot = plot;
  assert.deepEqual(await plot.go(), { status: "aborted", penRaised: true });
  const stopped = sent.slice(beforeStop);
  assert(!stopped.includes("!"), "ordinary Stop does not hold the penlift");
  assert(!stopped.slice(stopped.indexOf("G1 Z5 F1000\r") + 1).some(command => /^G1 X/.test(command)), "no further drawing commands after Stop");
  assert.equal(stopped.at(-2), "G1 Z0.5 F1000\r");
  assert.equal(stopped.at(-1), "?");
  await plot.transport.close();
} finally {
  if (previous) Object.defineProperty(globalThis, "navigator", previous);
  else delete globalThis.navigator;
}
console.log("p5 DrawCore: automatic selection, A3 placement, plot.go() and GRBL commands verified with simulated Web Serial.");

// Controller selection can replace a provisional bed after strokes are recorded.
const p = { width: 600, height: 600, line() {} };
const options = { driver: Driver, paper: "A4", width: 80,
  drawcore: { travel: { width: 420, height: 297 } } };
const placed = new P5Plot(p, PlotterEngine, options);
placed.line(0, 0, 600, 600);
const old = { ...placed.offset };
placed.driver = { identity: { protocol: "ebb" } };
placed.updatePlacement();
assert.deepEqual(placed.paper, { x: 148.5, y: 111, width: 297, height: 210, margin: 12, format: "A4", orientation: "landscape" });
assert.equal(placed.scale, 80 / 600);
const first = placed.engine.document.layers.flatMap(layer => layer.paths)[0].points[0];
assert.deepEqual(first, placed.offset);
assert.notDeepEqual(old, placed.offset);
assert.equal(placed.engine.document.page.width, 594);
const manual = new P5Plot(p, PlotterEngine, { ...options, paperX: 20, paperY: 20, x: 40, y: 40 });
manual.driver = { identity: { protocol: "ebb" } };
manual.updatePlacement();
assert.deepEqual(manual.offset, { x: 40, y: 40 });
assert.equal(manual.paper.x, 20);
assert.equal(manual.paper.y, 20);
console.log("p5 placement: detected bed recentres recorded geometry without scaling; manual offsets retained.");

let connectedPlan;
const changingKit = { ...Driver,
  createAutoSerialTransport: () => ({ async open() {}, async close() {} }),
  async detectDriver() { return { identity: { protocol: "ebb" },
    async run(plan) { connectedPlan = plan; return { status: "complete" }; } }; }
};
const connecting = new P5Plot(p, PlotterEngine, { ...options, driver: changingKit, gesture: () => true, confirm: () => true, log() {} });
connecting.line(0, 0, 600, 600);
await connecting.go();
assert.equal(connecting.paper.x, 148.5);
const drawn = connectedPlan.moves.find(move => move.type === "draw").points;
assert(drawn.every(point => point.x >= connecting.offset.x && point.y >= connecting.offset.y));
assert.equal(Math.max(...drawn.map(point => point.x)) - Math.min(...drawn.map(point => point.x)), 80);
console.log("p5 connection: final plan uses the detected bed placement and keeps physical width.");
