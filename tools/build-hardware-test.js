import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.env.PENPLOTTER_BUILD_DIR || path.join(root, "node_modules/.drawcore-test"));
execFileSync(process.execPath, ["tools/build-browser.js", "--development"], {
  cwd: root, env: { ...process.env, PENPLOTTER_BUILD_DIR: output }, stdio: "inherit"
});
fs.copyFileSync(path.join(root, "tools/drawcore-test.html"), path.join(output, "index.html"));
fs.copyFileSync(path.join(root, "node_modules/p5/lib/p5.min.js"), path.join(output, "p5.min.js"));
const inline = file => fs.readFileSync(path.join(output, file), "utf8").replace(/<\/script/gi, "<\\/script");
const standalone = fs.readFileSync(path.join(output, "index.html"), "utf8")
  .replace('<script src="p5.min.js"></script>', () => `<script>${inline("p5.min.js")}</script>\n<script>${inline("p5.penplotter.browser.js")}</script>`)
  .replace("import { install, Driver, P5Plot, PlotterEngine, metadata } from './p5.penplotter.js';", "const { install, Driver, P5Plot, PlotterEngine, metadata } = P5PenplotterBundle;");
fs.writeFileSync(path.join(output, "drawcore-test.html"), standalone);
fs.writeFileSync(path.join(output, "START.txt"), `DrawCore ontwikkeltest\n\nOpen drawcore-test.html in Chrome of Edge. Alle JavaScript is ingebouwd; Inkscape is niet nodig.\nBegin met Verbinden en Status uitlezen. Dat beweegt de machine niet.\nVolg daarna pen omhoog, XY-nulpunt instellen, de pen-op-richtingstests van 1 mm, en de lijn van 10 mm.\nDownload en deel het testlog. Deze versie is alleen gesimuleerd getest; geen fysieke plottertest voltooid.\n\nAls lokale bestandsrechten Web Serial blokkeren, start in deze map:\npython -m http.server 8000 (Windows alternatief: py -m http.server 8000)\nOpen daarna in Chrome of Edge: http://localhost:8000\n\nStop vraagt feed-hold aan; geen automatische reset, hervatting of penlift.\nDe huidige controller kan nog gepauzeerde bewegingen bevatten.\n`);
console.log(`Local hardware test written to ${output}.`);
