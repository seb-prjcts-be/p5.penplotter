let plotPlan;

function setup() {
  createCanvas(640, 760);

  pixelDensity(1);

  const plot = createPlotterEngine();
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

  noLoop();
}

function draw() {
  background("#ffffff");
  drawRoute(plotPlan, {
    strokeWeight: 1
  });
}
