let plot;
let plotPlan;

function setup() {
  createCanvas(640, 760);
  pixelDensity(1);
  plot = createPlot({ paper: "A2", margin: 12 });
  noLoop();
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  strokeWeight(1);
  noFill();
  plot.clear();

  const boundary = [
    { x: 72, y: 88 }, { x: 564, y: 66 }, { x: 590, y: 608 },
    { x: 118, y: 692 }, { x: 52, y: 420 }
  ];
  plot.hatch(boundary, 14 * plot.scale, Math.PI / 6);
  plot.polygon(boundary);
  plot.circle(324, 374, 252);
  plot.engine.optimize({ mergeTolerance: 0.05, simplifyTolerance: 0.2 });
  plotPlan = plot.plan();
  plot.showBed();
  plot.go();
}
