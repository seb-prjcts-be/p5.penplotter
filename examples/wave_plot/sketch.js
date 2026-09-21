import { PlotterEngine } from "https://seb-prjcts-be.github.io/vanilla.penplotter/vanilla.penplotter.js";
import { installP5Penplotter } from "../../p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine);

let waveSeed = Math.floor(Math.random() * 34);

new p5(function wavePlotSketch(p) {
  let plotPlan;

  function buildPlan() {
    const plot = p.createPlotterEngine();

    for (let row = 0; row < 24; row += 1) {
      const points = [];
      for (let x = 38; x <= 602; x += 4) {
        const waveY = Waves.wave(x + row * 7, {
          wave: waveSeed,
          t: 0,
          amplitude: 22 + row * 0.35,
          frequency: 0.045
        });
        points.push({
          x,
          y: 86 + row * 24 + waveY
        });
      }
      plot.polyline(points);
    }

    plot.optimize({
      simplifyTolerance: 0.3,
      mergeTolerance: 0.05
    });
    return plot.plan({
      strategy: "nearest",
      drawSpeed: 120,
      travelSpeed: 260
    });
  }

  function updateStats() {
    document.querySelector("#paths").textContent = String(plotPlan.stats.paths);
    document.querySelector("#lifts").textContent = String(plotPlan.stats.penLifts);
    document.querySelector("#travel").textContent = `${plotPlan.stats.travelDistance.toFixed(1)} px`;
  }

  p.setup = function setup() {
    const canvas = p.createCanvas(640, 760);
    canvas.parent("p5-preview");
    p.pixelDensity(1);
    plotPlan = buildPlan();
    updateStats();
    p.noLoop();
  };

  p.draw = function draw() {
    p.background("#fffdf6");
    p.drawPlotPlan(plotPlan, {
      strokeWeight: 1
    });
  };

  document.querySelector("#reroll").addEventListener("click", function rerollWave() {
    waveSeed = Math.floor(Math.random() * 34);
    plotPlan = buildPlan();
    updateStats();
    p.redraw();
  });
});
