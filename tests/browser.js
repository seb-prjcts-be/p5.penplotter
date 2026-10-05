import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
const core = path.resolve(root, "..", "vanilla.penplotter");
const bundleDirectory = process.env.PENPLOTTER_TEST_BUNDLE_DIR || path.join(root, "dist");
const { stdout: baseline } = await promisify(execFile)("git", ["show", "v0.2.2:p5.penplotter.js"], { cwd: root });
const baselineSetup = `<script type="module">
import { PlotterEngine } from "/core/vanilla.penplotter.js";
import * as Ebb from "/core/src/driver/ebb.js";
import { installP5Penplotter } from "/baseline-adapter.js";
installP5Penplotter(p5, PlotterEngine, { driver: Ebb });
</script>`;
const contentType = file => file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".html") ? "text/html" : "application/octet-stream";
const server = http.createServer((request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (["/dist/p5.penplotter.js", "/dist/p5.penplotter.browser.js"].includes(url.pathname)) {
      response.setHeader("Content-Type", "text/javascript");
      response.end(fs.readFileSync(path.join(bundleDirectory, path.basename(url.pathname))));
      return;
    }
    if (url.pathname === "/baseline-adapter.js") { response.setHeader("Content-Type", "text/javascript"); response.end(baseline); return; }
    if (url.pathname === "/fixture.html") {
      const mode = url.searchParams.get("mode");
      const install = mode === "classic" ? '<script src="/dist/p5.penplotter.browser.js"></script>' : '<script type="module">import {install} from "/dist/p5.penplotter.js"; install(p5);</script>';
      const sketch = mode === "instance" ? '<script type="module">import {install} from "/dist/p5.penplotter.js"; install(p5); new p5(p => { p.setup=()=>{p.createCanvas(80,80); p.createPlot().line(1,1,20,20); p.noLoop(); window.fixtureReady=true;}; });</script>' : '<script>function setup(){createCanvas(80,80); createPlot().line(1,1,20,20); noLoop(); window.fixtureReady=true;}</script>';
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html><head><meta charset="utf-8"><script src="/node_modules/p5/lib/p5.min.js"></script>${mode === "instance" ? "" : install}${sketch}</head><body></body></html>`);
      return;
    }
    const base = url.pathname.startsWith("/core/") ? core : root;
    const relative = base === core ? url.pathname.slice(6) : url.pathname.slice(1);
    const file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) { response.writeHead(403).end(); return; }
    let data = fs.readFileSync(file);
    if (file.endsWith("index.html") && url.searchParams.has("baseline")) {
      data = Buffer.from(data.toString().replace(/<script type="module">\s*import \{ install \} from "(?:\.\.\/\.\.\/dist\/p5\.penplotter\.js|https:\/\/cdn\.jsdelivr\.net\/gh\/seb-prjcts-be\/p5\.penplotter@v[0-9.]+\/dist\/p5\.penplotter\.js)";\s*install\(p5\);\s*<\/script>/, baselineSetup));
    }
    response.setHeader("Content-Type", contentType(file) + "; charset=utf-8");
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const executablePath = process.env.PENPLOTTER_CHROMIUM || (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const names = ["first_plot", "wave_plot", "direct_plot", "pen_up_down", "chaos_game", "molnar_grid", "spirograph", "wave_field", "calibration_sheet"];
  for (const name of names) {
    const snapshots = [];
    for (const baselineMode of [true, false]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      const requests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => requests.push(request.url()));
      // Real dependencies, served from verified package/fixture files; no
      // network is needed for these local browser equivalence checks.
      await page.route("https://**/*", async route => {
        const url = route.request().url();
        if (url === `https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v${version}/dist/p5.penplotter.js`) return route.fulfill({ path: path.join(bundleDirectory, "p5.penplotter.js"), contentType: "text/javascript" });
        if (url.includes("/npm/p5@2.2.2/")) return route.fulfill({ path: path.join(root, "node_modules/p5/lib/p5.min.js"), contentType: "text/javascript" });
        if (url.includes("/p5.waves@v3.4.0/")) return route.fulfill({ path: path.join(root, "tests/fixtures/p5.waves-3.4.0.min.js"), contentType: "text/javascript" });
        if (url.includes("prismjs")) return route.fulfill({ body: "", contentType: "text/javascript" });
        if (url.includes("fonts.googleapis.com")) return route.fulfill({ body: "", contentType: "text/css" });
        return route.abort();
      });
      await page.addInitScript(() => {
        let seed = 1;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
        Date.now = () => 1;
      });
      await page.goto(`${origin}/examples/${name}/index.html${baselineMode ? "?baseline=1" : ""}`);
      await page.waitForFunction(() => window.frameCount >= 1 && document.querySelector("canvas.p5Canvas"), { timeout: 10000 });
      assert.deepEqual(errors, [], `${name}: no browser exceptions`);
      assert.ok(!requests.some(url => url.includes("api.github.com")), "no runtime GitHub lookup");
      if (!baselineMode) assert.ok(!requests.some(url => url.includes("/core/") || url.includes("/vanilla.penplotter/")), "no external core modules");
      const snapshot = await page.evaluate(async baselineMode => {
        const plan = typeof plotPlan !== "undefined" ? plotPlan : plot.plan();
        const kit = baselineMode ? await import("/core/src/driver/ebb.js") : (await import("/dist/p5.penplotter.js")).Ebb;
        const commands = ["mm", "cm", "in"].includes(plan.units) ? kit.compileEbbPlan(plan).commands : null;
        const engine = typeof plot !== "undefined" && plot.engine ? plot.engine : null;
        const svg = engine ? engine.exportSVG().replace(/data-path="path_\d+"/g, 'data-path="path"') : null;
        return JSON.parse(JSON.stringify({ plan, commands, svg, waitingForClick: typeof plot !== "undefined" ? !!plot.pending : false }, (key, value) => key === "pathId" || (key === "id" && /^path_/.test(value)) ? "path" : value));
      }, baselineMode);
      assert.equal(snapshot.plan.units, "mm", `${name}: physical plot units`);
      if (["first_plot", "wave_plot"].includes(name)) assert.equal(snapshot.waitingForClick, true, `${name}: waits for click before connecting`);
      if (name === "wave_plot") {
        const frame = await page.evaluate(() => frameCount);
        await page.locator("#reroll").click();
        await page.waitForFunction(before => frameCount > before, frame);
        const state = await page.evaluate(() => ({ paths: plotPlan.stats.paths, pending: !!plot.pending, previewCount: document.querySelectorAll("canvas.p5Canvas").length, travel: document.querySelector("#travel").textContent }));
        assert.equal(state.paths, 24);
        assert.equal(state.pending, true);
        assert.equal(state.previewCount, 1);
        assert.match(state.travel, /mm$/);
        assert.deepEqual(errors, [], "wave selection redraws without errors");
      }
      if (name === "chaos_game") assert.equal(snapshot.waitingForClick, true, "sequence waits for the user");
      else if (name !== "pen_up_down") assert.ok(snapshot.plan.stats.paths > 0, "actual drawing generated");
      snapshots.push(snapshot);
      await context.close();
    }
    assert.deepEqual(snapshots[1], snapshots[0], `${name}: browser plan/export/commands match v0.2.2`);
    console.log(`Browser ${name}: ready; v0.2.2 equivalence verified.`);
  }
  for (const mode of ["module", "classic", "instance"]) {
    const page = await browser.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/fixture.html?mode=${mode}`);
    try {
      await page.waitForFunction(() => window.fixtureReady === true, { timeout: 10000 });
    } catch {
      const state = await page.evaluate(() => ({ p5: typeof p5, setup: typeof setup, body: !!document.body, ready: document.readyState }));
      throw new Error(`Browser ${mode} did not start: ${JSON.stringify({ errors, state })}`);
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Browser ${mode}: actual p5 setup completed.`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
console.log("Browser tests passed; no physical plot was performed.");
