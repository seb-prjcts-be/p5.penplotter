import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
const names = ["first_plot", "wave_plot", "direct_plot", "pen_up_down", "chaos_game", "molnar_grid", "spirograph", "wave_field", "calibration_sheet"];
for (const name of names) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>penplotter start</title>
  <script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.js"></script>
  <script type="module">
    import { install } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v${version}/dist/p5.penplotter.js";
    install(p5);
  </script>
  <script src="sketch.js"></script>
</head>
<body>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, "examples", name, "index_cdn.html"), html);
}
console.log(`CDN examples use the bundled v${version}.`);
