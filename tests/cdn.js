import assert from "node:assert/strict";
import fs from "node:fs";
import { extractModule } from "../examples/code.js";
const examples = {
  "direct_plot": [
    "Dg_A0U_c-",
    "AeNqN2ZIQ"
  ],
  "chaos_game": [
    "mQsWr-3t7",
    "WVJbMxMph"
  ],
  "molnar_grid": [
    "GpWenl56I",
    "9MrEswkWu"
  ],
  "calibration_sheet": [
    "4ajgW73ky",
    "O5rbfSNiU"
  ],
  "wave_field": [
    "unSunym_F",
    "wngvRvgvb"
  ],
  "spirograph": [
    "V1YYrzLST",
    "JxCfFpDpG"
  ],
  "first_plot": [
    "diEjAtLEB",
    "q7FKX8z5i"
  ],
  "wave_plot": [
    "MtTjqsybD",
    "MftL0THXh"
  ],
  "pen_up_down": [
    "NqgGpx1N2",
    "PvTDYl1Gd"
  ]
};
const { version } = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
const expected = "<script type=\"module\">\n    import { install } from \"https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v" + version + "/dist/p5.penplotter.js\";\n    install(p5);\n  </script>";
for (const [example, [oldId, newId]] of Object.entries(examples)) {
  const folder = new URL('../examples/' + example + '/', import.meta.url);
  const page = fs.readFileSync(new URL('index.html', folder), 'utf8');
  const cdn = fs.readFileSync(new URL('index_cdn.html', folder), 'utf8');
  assert.equal(extractModule(cdn).replaceAll('\r\n', '\n'), expected);
  assert.equal(page.match(/<script type="module">[\s\S]*?<\/script>/)[0].replaceAll('\r\n', '\n'), expected);
  assert.ok(page.includes('data-src="index_cdn.html" data-part="module"'));
  const link = 'https://editor.p5js.org/seb_prjcts.be/sketches/' + newId;
  assert.ok(page.includes('href="' + link + '"'));
  assert.ok(fs.readFileSync(new URL('../docs/examples.html', import.meta.url), 'utf8').includes('href="' + link + '"'));
  assert.ok(!page.includes('/sketches/' + oldId));
}
assert.throws(() => extractModule('<script src="sketch.js"></script>'), /No.*module/);
console.log(`p5.penplotter CDN: all nine examples use the v${version} bundle and matching editor links`);
