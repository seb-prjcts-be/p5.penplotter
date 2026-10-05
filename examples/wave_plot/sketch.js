let waveSeed = Math.floor(Math.random() * 35);

let plot;
let plotPlan;

function buildPlan() {
  plot.clear();

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

  plot.engine.optimize({
    simplifyTolerance: 0.3,
    mergeTolerance: 0.05
  });
  return plot.plan({
    strategy: "nearest"
  });
}

async function setup() {
  // Load the wave sampler used by this sketch.
  await import("https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.4.0/p5.waves.min.js");
  createCanvas(640, 760);

  pixelDensity(1);
  // Change paper to "A3" or "A2"; the drawing fits the chosen sheet.
  // Add width: 120 for a fixed drawing width in mm (it must fit the margins).
  // Add paperX: 0, paperY: 0 to place the sheet at the machine origin.
  // For an A3 H with DrawCore, add these explicit machine settings:
  // drawcore: {
  //   travel: { width: 420, height: 297 },
  //   axes: { swapXY: true, xDirection: -1, yDirection: -1 },
  //   penUp: 0.5, penDown: 5, penFeed: 1000,
  //   drawFeed: 600, travelFeed: 900
  // }
  plot = createPlot({ paper: "A4", margin: 12 });

  noLoop();
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  strokeWeight(1);
  noFill();
  plotPlan = buildPlan();
  plot.showBed();
  plot.go();
}
