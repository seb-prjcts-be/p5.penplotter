import assert from "node:assert/strict";
import fs from "node:fs";
import { extractModule } from "../examples/code.js";

const { version } = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
let reference;
for (const name of ["direct_plot", "molnar_grid", "spirograph", "wave_field", "calibration_sheet", "chaos_game", "first_plot", "wave_plot", "pen_up_down"]) {
  const root = new URL(`../examples/${name}/`, import.meta.url);
  const page = fs.readFileSync(new URL("index.html", root), "utf8");
  const cdn = fs.readFileSync(new URL("index_cdn.html", root), "utf8");
  assert.ok(page.includes('data-src="index_cdn.html" data-part="module"'), `${name}: display module only`);
  const module = extractModule(cdn);
  reference ||= module;
  assert.equal(module, reference, `${name}: same release setup`);
  assert.ok(module.includes(`@v${version}/dist/p5.penplotter.js`));
  assert.ok(!/api\.github\.com|commits\/main|window\.setup|Date\.now|fetch\(/.test(module), "no runtime lookup or setup wrapper");
  assert.ok(page.includes('from "../../dist/p5.penplotter.js"'), `${name}: local example uses the same built bundle`);
}
assert.throws(() => extractModule('<script src="sketch.js"></script>'), /No.*module/);
console.log("p5.penplotter CDN: nine consistent fixed-release module snippets, no lookup or setup wrapper");
