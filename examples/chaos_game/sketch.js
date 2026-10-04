// Chaos game: calculate one point, plot it, then calculate the next.
let plot;
let corners;
let p;
let dots = 0;
const DOTS = 1500;

function setup() {
  createCanvas(600, 520);
  plot = createPlot({ paper: "A2", paperX: 0, paperY: 0, margin: 12, width: 300, log: say });
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
