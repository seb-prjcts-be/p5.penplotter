let waveSeed = Math.floor(Math.random() * 34);

let plotPlan;

function buildPlan() {
  const plot = createPlotterEngine();

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

async function setup() {
  // Load the wave sampler used by this sketch.
  await import("https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.4.0/p5.waves.min.js");
  createCanvas(640, 760);

  pixelDensity(1);
  plotPlan = buildPlan();

  noLoop();
}

function draw() {
  background("#ffffff");
  drawRoute(plotPlan, {
    strokeWeight: 1
  });
}

function keyPressed() {
  if (key === "r" || key === "R") {
    waveSeed = Math.floor(Math.random() * 34);
    plotPlan = buildPlan();
    redraw();
  }
}
