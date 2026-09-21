import { PlotterEngine } from "https://seb-prjcts-be.github.io/vanilla.penplotter/vanilla.penplotter.js";
import { installP5Penplotter } from "../p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine);

new p5(function heroSketch(p) {
  let plotPlan;
  const waveSeed = Math.floor(Math.random() * 34);

  p.setup = function setup() {
    const canvas = p.createCanvas(720, 720);
    canvas.parent("hero-plot");
    p.pixelDensity(1);

    const plot = p.createPlotterEngine({
      width: 720,
      height: 720
    });

    for (let row = 0; row < 22; row += 1) {
      const points = [];
      for (let x = 42; x <= 678; x += 4) {
        const waveY = Waves.wave(x + row * 8, {
          wave: waveSeed,
          t: 0,
          amplitude: 19 + row * 0.55,
          frequency: 0.046
        });
        points.push({
          x,
          y: 92 + row * 25 + waveY
        });
      }
      plot.polyline(points);
    }

    plot.optimize({
      simplifyTolerance: 0.3,
      mergeTolerance: 0.05
    });
    plotPlan = plot.plan({
      drawSpeed: 120,
      travelSpeed: 260
    });

    document.querySelector("#stat-paths").textContent = String(plotPlan.stats.paths);
    document.querySelector("#stat-lifts").textContent = String(plotPlan.stats.penLifts);
    document.querySelector("#stat-travel").textContent = plotPlan.stats.travelDistance.toFixed(1);
    p.noLoop();
  };

  p.draw = function draw() {
    p.background("#fffdf6");
    p.drawPlotPlan(plotPlan, {
      strokeWeight: 1
    });
  };
});

document.querySelector(".menu").addEventListener("click", function toggleMenu() {
  document.querySelector(".nav").classList.toggle("nav-open");
});
