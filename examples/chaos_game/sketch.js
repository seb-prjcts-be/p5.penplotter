// EBB only: DrawCore does not support object-by-object sessions.
// Chaos game: calculate one point, plot it, then calculate the next.
let plot;
let corners;
let p;
let dots = 0;
const DOTS = 1500;

function setup() {
  createCanvas(600, 520);
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
  plot = createPlot({ paper: "A4", margin: 12, log: say });
  corners = [[300, 35], [40, 485], [560, 485]];
  p = { x: 300, y: 35 };
  noLoop();
}

function draw() {
  background(255);
  stroke(0);
  strokeWeight(2);
  plot.showBed();
  plot.sequence(nextPoint).catch(error => say(error.message));
}

function nextPoint() {
  if (dots >= DOTS) return false;
  const c = random(corners);
  p.x = (p.x + c[0]) / 2;
  p.y = (p.y + c[1]) / 2;
  plot.point(p.x, p.y);
  dots++;
  plot.showBed();
  return true;
}

function say(text) {
  console.log(text);
}
