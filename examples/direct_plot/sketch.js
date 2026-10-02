// The core is a sibling of this repository, both on localhost and on GitHub Pages.
import { PlotterEngine } from "../../../vanilla.penplotter/vanilla.penplotter.js";
import * as Ebb from "../../../vanilla.penplotter/src/driver/ebb.js";
import { installP5Penplotter } from "../../p5.penplotter.js";

try {
  installP5Penplotter(p5, PlotterEngine, { driver: Ebb });
} catch (error) {
  // A browser that still holds an older vanilla.penplotter lands here.
  document.querySelector("#status").textContent =
    `${error.message} If you just updated, reload with Ctrl+F5 to drop the browser's old copy.`;
  throw error;
}

// Fit the canvas on A2, with a 12 mm paper margin.
const PLACE = { paper: "A2", margin: 12 };

let waveSeed = Math.floor(Math.random() * 34);

new p5(function directPlotSketch(p) {
  let plot;

  p.setup = function setup() {
    const canvas = p.createCanvas(400, 250);
    canvas.parent("p5-preview");
    plot = p.createPlot({
      ...PLACE,
      log: (message) => { document.querySelector("#status").textContent = message; }
    });
    document.querySelector("#size").textContent = `${(p.width * plot.scale).toFixed(1)} × ${(p.height * plot.scale).toFixed(1)} mm`;
    document.querySelector("#place").textContent = `${plot.offset.x.toFixed(1)} / ${plot.offset.y.toFixed(1)} mm`;
    document.querySelector("#paper").textContent = `${plot.paper.format} · ${plot.paper.width} × ${plot.paper.height} mm, at X ${plot.paper.x} / Y ${plot.paper.y} mm`;
    p.noLoop();
  };

  p.draw = function draw() {
    p.background("#ffffff"); // screen only: no plot. in front of it
    p.stroke("#111111");
    p.noFill();

    plot.clear();
    plot.rect(10, 10, 380, 230);
    for (let row = 0; row < 5; row += 1) {
      const points = [];
      for (let x = 30; x <= 370; x += 4) {
        const waveY = Waves.wave(x + row * 9, {
          wave: waveSeed,
          t: 0,
          amplitude: 14,
          frequency: 0.5
        });
        points.push({ x, y: 50 + row * 38 + waveY });
      }
      plot.polyline(points);
    }
    document.querySelector("#paths").textContent = String(plot.plan().stats.paths);
    plot.drawBed(document.querySelector("#bed"));
    plot.go();   // ready: click the drawing to plot, click again to stop
  };

  document.querySelector("#reroll").addEventListener("click", () => {
    waveSeed = Math.floor(Math.random() * 34);
    p.redraw();
  });
});
