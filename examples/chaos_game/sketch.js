// Chaos game. One point and three corners. Every step the point jumps halfway
// to a corner chosen at random, and leaves a dot. After a few hundred dots
// the Sierpinski triangle is there; nobody drew it.
// The plan keeps the order of the game, so on paper the triangle appears the
// way it appears here: dot by dot, out of nothing. That is the point.
let plot;
let bedPreview;
let bedDrawing;
let corners;
let p;
let dots = 0;
const DOTS = 1500;   // about half an hour on the iDraw

function setup() {
  createCanvas(600, 520);
  plot = createPlot({ paper: "A2", margin: 12, width: 300, log: say });   // 300 mm wide on A2 paper
  corners = [[300, 35], [40, 485], [560, 485]];
  p = { x: 300, y: 35 };
  background(255);
  stroke(0);
  strokeWeight(2);
}

function draw() {
  for (let i = 0; i < 10 && dots < DOTS; i++) {
    const c = random(corners);
    p.x = (p.x + c[0]) / 2;
    p.y = (p.y + c[1]) / 2;
    plot.point(p.x, p.y);
    dots++;
  }
  showBed();
  if (dots >= DOTS) {
    noLoop();
    plot.go({ plan: { strategy: "drawn" } });   // in the order of the game; click the drawing to start
  }
}

function say(text) {
  console.log(text);
}

// A separate bed preview; the red cross marks the machine origin, not the drawing corner.
function showBed() {
  if (!bedPreview) {
    bedPreview = select("#bed");
    if (!bedPreview) {
      createP("Bed coordinates: red x = machine (0,0). Match the axes to your physical setup.");
      bedPreview = createElement("canvas");
      bedPreview.style("display", "block");
      bedPreview.style("width", "420px");
      bedPreview.style("max-width", "100%");
      bedPreview.style("height", "auto");
    }
    bedPreview.elt.width = 614;
    bedPreview.elt.height = 452;
    bedDrawing = document.createElement("canvas");
    bedDrawing.width = 594;
    bedDrawing.height = 432;
  }
  plot.drawBed(bedDrawing);
  const context = bedPreview.elt.getContext("2d");
  context.clearRect(0, 0, 614, 452);
  context.drawImage(bedDrawing, 10, 10);
  context.strokeStyle = "#d32f2f";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(6, 6);
  context.lineTo(14, 14);
  context.moveTo(6, 14);
  context.lineTo(14, 6);
  context.stroke();
}
