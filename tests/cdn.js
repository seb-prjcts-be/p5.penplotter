import assert from "node:assert/strict";
import fs from "node:fs";
import { extractModule } from "../examples/code.js";

const page = fs.readFileSync(new URL("../examples/spirograph/index_cdn.html", import.meta.url), "utf8");
const snippet = page.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction("fetch", "load", "window", "p5", "console", snippet.replaceAll("import(", "load("));

for (const example of ["direct_plot", "molnar_grid", "spirograph", "wave_field", "calibration_sheet", "chaos_game", "first_plot", "wave_plot", "pen_up_down"]) {
  const folder = new URL(`../examples/${example}/`, import.meta.url);
  const index = fs.readFileSync(new URL("index.html", folder), "utf8");
  const cdn = fs.readFileSync(new URL("index_cdn.html", folder), "utf8");
  assert.ok(index.includes('data-src="index_cdn.html"'), `${example}: show the actual CDN file`);
  assert.ok(index.includes('data-src="index_cdn.html" data-part="module"'), `${example}: show only the module block`);
  assert.equal(extractModule(cdn), `<script type="module">${snippet}</script>`);
  assert.equal(cdn.match(/<script type="module">([\s\S]*?)<\/script>/)[1], snippet, `${example}: same tested startup`);
}
assert.throws(() => extractModule('<script src="sketch.js"></script>'), /No.*module/);

async function checkLoad(coreSha, adapterSha) {
  const urls = [];
  const requests = [];
  let installed = false;
  let setupCalls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const p5 = {};
  const engine = class {};
  const driver = {};
  const target = {};
  const window = { setup(value) {
    assert.equal(installed, true, "setup must wait for adapter installation");
    assert.equal(this, target);
    setupCalls++;
    return value;
  } };
  const loading = run(async (url, options) => {
    requests.push(url);
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => ({ sha: url.includes("/vanilla.penplotter/") ? coreSha : adapterSha }) };
  }, async url => {
    urls.push(url);
    await gate;
    if (url.endsWith("/vanilla.penplotter.js")) return { PlotterEngine: engine };
    if (url.endsWith("/src/driver/ebb.js")) return driver;
    return { installP5Penplotter(actualP5, actualEngine, options) {
      assert.equal(actualP5, p5);
      assert.equal(actualEngine, engine);
      assert.equal(options.driver, driver);
      installed = true;
    } };
  }, window, p5, { info() {} });
  const setup = window.setup.call(target, 42);
  await Promise.resolve();
  assert.equal(setupCalls, 0);
  release();
  await loading;
  assert.equal(await setup, 42);
  assert.equal(setupCalls, 1);
  assert.equal(requests.length, 2);
  assert.deepEqual(urls, [
    `https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@${coreSha}/vanilla.penplotter.js`,
    `https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@${coreSha}/src/driver/ebb.js`,
    `https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@${adapterSha}/p5.penplotter.js`
  ]);
  assert.equal(new URL("./src/core/model.js", urls[0]).pathname.includes(`@${coreSha}/`), true);
  return urls;
}

const first = await checkLoad("a".repeat(40), "b".repeat(40));
const second = await checkLoad("c".repeat(40), "d".repeat(40));
assert.notDeepEqual(first, second, "a new start must use updated main commits");

for (const response of [
  { ok: false, status: 403 },
  { ok: true, json: async () => ({ sha: "main" }) }
]) {
  let imports = 0;
  await assert.rejects(run(async () => response, async () => { imports++; }, {}, {}, { info() {} }), /Cannot resolve|Invalid commit/);
  assert.equal(imports, 0, "lookup failure must not import stale code");
}
console.log("p5.penplotter CDN: new commits, consistent core/driver, setup ordering and lookup failures ok");
