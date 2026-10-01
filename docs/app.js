// The landing page's hero: a p5 sketch of 22 wave rows, planned by the
// engine and drawn behind the title the way the machine would draw it, path
// by path, then again from the start.
// The core is a sibling of this repository, both on localhost and on GitHub Pages.
import { PlotterEngine } from "../../vanilla.penplotter/vanilla.penplotter.js";
import { installP5Penplotter } from "../p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine);

const CYCLE_MS = 40000; // the whole sheet, then a pause, then again
const HOLD_MS = 6000;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

new p5(function heroSketch(p) {
  let plot;
  let started;
  const waveSeed = Math.floor(Math.random() * 34);
  const hero = document.querySelector("#hero-canvas");

  p.setup = function setup() {
    const canvas = p.createCanvas(hero.clientWidth, hero.clientHeight);
    canvas.parent("hero-canvas");
    // drawPreview paints on the raw 2D context; p5's density scaling would
    // double everything, so the canvas is one pixel per CSS pixel here.
    p.pixelDensity(1);

    plot = p.createPlotterEngine({ width: 720, height: 720 });
    for (let row = 0; row < 22; row += 1) {
      const points = [];
      for (let x = 42; x <= 678; x += 4) {
        const waveY = Waves.wave(x + row * 8, { wave: waveSeed, t: 0, amplitude: 19 + row * 0.55, frequency: 0.046 });
        points.push({ x, y: 92 + row * 25 + waveY });
      }
      plot.polyline(points);
    }
    plot.optimize({ simplifyTolerance: 0.3, mergeTolerance: 0.05 });
    plot.plan({ drawSpeed: 120, travelSpeed: 260 });
    started = p.millis();
    if (reduced) p.noLoop();
  };

  p.windowResized = function windowResized() {
    p.resizeCanvas(hero.clientWidth, hero.clientHeight);
    started = p.millis();
  };

  p.draw = function draw() {
    const elapsed = (p.millis() - started) % (CYCLE_MS + HOLD_MS);
    const progress = reduced ? 1 : Math.min(1, elapsed / CYCLE_MS);
    plot.drawPreview(p.drawingContext, { showTravel: false, padding: 40, paper: "#ffffff", progress });
  };
});
