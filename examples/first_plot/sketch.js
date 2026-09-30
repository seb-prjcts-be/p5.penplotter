// The core is a sibling of this repository, both on localhost and on GitHub Pages.
import { PlotterEngine } from "../../../vanilla.penplotter/vanilla.penplotter.js";
import { installP5Penplotter } from "../../p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine);

new p5(function firstPlotSketch(p) {
  let plotPlan;

  p.setup = function setup() {
    const canvas = p.createCanvas(640, 760);
    canvas.parent("p5-preview");
    p.pixelDensity(1);

    const plot = p.createPlotterEngine();
    const boundary = [
      { x: 72, y: 88 },
      { x: 564, y: 66 },
      { x: 590, y: 608 },
      { x: 118, y: 692 },
      { x: 52, y: 420 }
    ];

    plot.hatch(boundary, {
      spacing: 14,
      angle: Math.PI / 6
    });
    plot.polygon(boundary);
    plot.circle(324, 374, 126, {
      segments: 120
    });
    plot.optimize({
      mergeTolerance: 0.05,
      simplifyTolerance: 0.2
    });
    plotPlan = plot.plan({
      drawSpeed: 120,
      travelSpeed: 260
    });

    document.querySelector("#paths").textContent = String(plotPlan.stats.paths);
    document.querySelector("#draw").textContent = `${plotPlan.stats.drawDistance.toFixed(1)} px`;
    document.querySelector("#travel").textContent = `${plotPlan.stats.travelDistance.toFixed(1)} px`;
    p.noLoop();
  };

  p.draw = function draw() {
    p.background("#ffffff");
    p.drawPlotPlan(plotPlan, {
      strokeWeight: 1
    });
  };
});
