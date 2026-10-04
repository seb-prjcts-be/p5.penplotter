import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { installP5Penplotter } from "../p5.penplotter.js";
import { PlotterEngine } from "../../vanilla.penplotter/vanilla.penplotter.js";
import * as Ebb from "../../vanilla.penplotter/src/driver/ebb.js";
import * as bundle from "../dist/p5.penplotter.js";

const execute = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "browser/core-source.json")));
assert.equal(bundle.metadata.coreCommit, source.commit);
assert.equal(bundle.metadata.version, JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version);

function fakeP5() {
  function P5() { this.width = 600; this.height = 600; }
  P5.VERSION = "2.2.2";
  for (const name of ["push", "pop", "noFill", "beginShape", "endShape", "vertex", "line", "point", "rect", "circle", "ellipse", "arc", "triangle", "quad"]) P5.prototype[name] = () => {};
  return P5;
}
const normalize = value => JSON.parse(JSON.stringify(value, (key, entry) => key === "pathId" || (key === "id" && /^path_/.test(entry)) ? "path" : entry));
const { stdout: reference } = await execute("git", ["show", "v0.2.2:p5.penplotter.js"], { cwd: root });
const baseline = await import(`data:text/javascript;base64,${Buffer.from(reference).toString("base64")}`);

for (const variant of [0, 1, 2]) {
  const constructors = [fakeP5(), fakeP5(), fakeP5()];
  baseline.installP5Penplotter(constructors[0], PlotterEngine, { driver: Ebb });
  installP5Penplotter(constructors[1], PlotterEngine, { driver: Ebb });
  bundle.install(constructors[2]);
  const plots = constructors.map(P5 => new P5().createPlot({ paper: "A2", margin: 12, width: 300 }));
  for (const plot of plots) {
    plot.rect(20, 20, 560, 560);
    plot.circle(300, 300, 140);
    plot.ellipse(110, 120, 90, 40);
    plot.polyline(Array.from({ length: 200 }, (_, i) => [40 + i * 2.5, 250 + 30 * Math.sin(i * .13 + variant)]));
    plot.hatch([[50, 50], [180, 50], [180, 180], [50, 180]], 3, Math.PI / 6);
    plot.stipple([[350, 350], [450, 350], [450, 450], [350, 450]], 20, 7);
  }
  for (let i = 1; i < plots.length; i++) {
    assert.deepEqual(normalize(plots[i].plan()), normalize(plots[0].plan()), "same geometry, route, timing and stats as v0.2.2");
    const svg = plot => plot.engine.exportSVG().replace(/data-path="path_\d+"/g, 'data-path="path"');
    assert.equal(svg(plots[i]), svg(plots[0]), "same SVG after normalizing generated IDs only");
    const compiler = i === 2 ? bundle.Ebb.compileEbbPlan : Ebb.compileEbbPlan;
    assert.deepEqual(compiler(plots[i].plan()).commands, Ebb.compileEbbPlan(plots[0].plan()).commands);
  }
}
const P5 = fakeP5();
assert.equal(bundle.install(P5), P5);
const method = P5.prototype.createPlot;
bundle.install(P5);
assert.equal(P5.prototype.createPlot, method, "reinstallation preserves methods");
const fresh = await import(pathToFileURL(path.join(root, "dist/p5.penplotter.js")).href + "?second-copy");
fresh.install(P5);
assert.equal(P5.prototype.createPlot, method, "loading another copy of this bundle is harmless");
assert.throws(() => bundle.install(undefined), /Load p5/);
const oldP5 = fakeP5(); oldP5.VERSION = "2.2.1";
assert.throws(() => bundle.install(oldP5), /2.2.2 or newer/);
const conflict = fakeP5();
Object.defineProperty(conflict, Symbol.for("p5.penplotter.installation"), { value: { version: "other", coreCommit: "other" } });
assert.throws(() => bundle.install(conflict), /different.*bundle/);
const explicit = fakeP5(); installP5Penplotter(explicit, PlotterEngine);
assert.throws(() => bundle.install(explicit), /outside this bundle/);

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "penplotter-build-"));
try {
  await execute(process.execPath, ["tools/build-browser.js"], { cwd: root, env: { ...process.env, PENPLOTTER_BUILD_DIR: directory } });
  for (const file of ["p5.penplotter.js", "p5.penplotter.browser.js"]) {
    assert.deepEqual(fs.readFileSync(path.join(directory, file)), fs.readFileSync(path.join(root, "dist", file)), "repeatable build bytes");
  }
  const queueTest = fs.readFileSync(path.resolve(root, "../vanilla.penplotter/tests/ebb-queue.js"), "utf8")
    .replace('import { PlotterEngine } from "../vanilla.penplotter.js";', `import { PlotterEngine } from ${JSON.stringify(pathToFileURL(path.join(root, "dist/p5.penplotter.js")).href)};`)
    .replace('import { EbbDriver, compileEbbPlan } from "../src/driver/ebb.js";', `import { Ebb } from ${JSON.stringify(pathToFileURL(path.join(root, "dist/p5.penplotter.js")).href)}; const { EbbDriver, compileEbbPlan } = Ebb;`);
  const queueFile = path.join(directory, "bundled-queue-test.mjs");
  fs.writeFileSync(queueFile, queueTest + "\nexport const completed = true;\n");
  const regression = await import(pathToFileURL(queueFile).href);
  assert.equal(regression.completed, true, "the bundled FIFO regression actually completed");
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
console.log("p5.penplotter bundle: v0.2.2 equivalence, command equality, installation and repeatability ok");
