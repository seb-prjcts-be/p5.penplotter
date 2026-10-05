import assert from "node:assert/strict";
import { P5Plot } from "../p5.penplotter.js";
import { PlotterEngine } from "../../vanilla.penplotter/vanilla.penplotter.js";
import * as Driver from "../../vanilla.penplotter/src/driver/index.js";

const bytes = new TextEncoder();
const sent = [];
let input;
const port = {
  readable: new ReadableStream({ start(controller) { input = controller; } }),
  writable: new WritableStream({ write(data) {
    const command = new TextDecoder().decode(data);
    sent.push(command);
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
  await plot.transport.close();
} finally {
  if (previous) Object.defineProperty(globalThis, "navigator", previous);
  else delete globalThis.navigator;
}
console.log("p5 DrawCore: automatic selection, A3 placement, plot.go() and GRBL commands verified with simulated Web Serial.");
