// Chaos game: calculate a group of dots, plot it, then calculate the next.
let plot;
let corners;
let p;
let dots = 0;
const DOTS = 1500;
const BATCH = 25;

function setup() {
  createCanvas(600, 520);
  plot = createPlot({ paper: "A2", margin: 12, width: 300, log: say });
  corners = [[300, 35], [40, 485], [560, 485]];
  p = { x: 300, y: 35 };
  noLoop();
}

function draw() {
  background(255);
  stroke(0);
  strokeWeight(2);
  plot.showBed();
  plot.sequence(nextDots, { plan: { strategy: "drawn" } }).catch(error => say(error.message));
}

function nextDots() {
  if (dots >= DOTS) return false;
  for (let i = 0; i < BATCH && dots < DOTS; i++) {
    const c = random(corners);
    p.x = (p.x + c[0]) / 2;
    p.y = (p.y + c[1]) / 2;
    plot.point(p.x, p.y);
    dots++;
  }
  plot.showBed();
  return true;
}

function say(text) {
  console.log(text);
}
