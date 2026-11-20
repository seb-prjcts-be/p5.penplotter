let plot;
let plotPlan;

function setup() {
  createCanvas(640, 760);
  pixelDensity(1);
  // Change paper to "A3" or "A2"; the drawing fits the chosen sheet.
  // Add width: 120 for a fixed drawing width in mm (it must fit the margins).
  // paperX: 0, paperY: 0 puts the sheet in the starting corner of the machine.
  // Leave both out to centre the sheet on the bed; showBed() shows where it lies.
  // For an A3 H with DrawCore, add these explicit machine settings:
  // drawcore: {
  //   travel: { width: 420, height: 297 },
  //   axes: { swapXY: true, xDirection: -1, yDirection: -1 },
  //   penUp: 0.5, penDown: 5, penFeed: 1000,
  //   drawFeed: 600, travelFeed: 900
  // }
  plot = createPlot({ paper: "A4", paperX: 0, paperY: 0, margin: 12 });
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
