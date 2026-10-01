// Chaos game. One point and three corners. Every step the point jumps halfway
// to a corner chosen at random, and leaves a dot. After a few hundred dots
// the Sierpinski triangle is there; nobody drew it.
// The plan keeps the order of the game, so on paper the triangle appears the
// way it appears here: dot by dot, out of nothing. That is the point.
let plot;
let corners;
let p;
let dots = 0;
const DOTS = 1500;   // about half an hour on the iDraw

function setup() {
  createCanvas(600, 520).parent("p5-preview");
  plot = createPlot({ x: 147, y: 100, width: 300, log: say });   // 300 mm wide on the A2 bed
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
  document.querySelector("#dots").textContent = String(dots);
  const minutes = plot.plan({ strategy: "drawn" }).stats.estimatedSeconds / 60;
  document.querySelector("#time").textContent = Math.round(minutes) + " min";
  if (dots >= DOTS) {
    noLoop();
    plot.go({ plan: { strategy: "drawn" } });   // in the order of the game; click the drawing to start
  }
}

function say(text) {
  document.querySelector("#status").textContent = text;
}
