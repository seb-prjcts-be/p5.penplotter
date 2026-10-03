let plot;
let seed = Date.now();

function setup() {
  createCanvas(600, 600);
  // 300 x 300 mm, centred on A2 paper
  plot = createPlot({ paper: "A2", margin: 12, width: 300, log: say });
  noLoop();
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  noFill();
  randomSeed(seed);
  plot.clear();

  let n = 10;
  let cell = (width - 40) / n;
  for (let row = 0; row < n; row++) {
    let disorder = row / (n - 1);
    for (let column = 0; column < n; column++) {
      let cx = 20 + column * cell + cell / 2;
      let cy = 20 + row * cell + cell / 2;
      for (let k = 1; k <= 4; k++) {
        let radius = (cell * 0.42 * k) / 4;
        let angle = random(-1, 1) * disorder * QUARTER_PI;
        let dx = random(-1, 1) * disorder * cell * 0.2;
        let dy = random(-1, 1) * disorder * cell * 0.2;
        drawSquare(cx + dx, cy + dy, radius, angle);
      }
    }
  }

  plot.showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}

function drawSquare(cx, cy, radius, angle) {
  let points = [];
  for (let i = 0; i < 4; i++) {
    let a = angle + QUARTER_PI + HALF_PI * i;
    points.push([cx + cos(a) * radius, cy + sin(a) * radius]);
  }
  plot.polygon(points);
}

function say(text) {
  console.log(text);
}
