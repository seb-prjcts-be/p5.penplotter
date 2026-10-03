let plot;
let seed = 1;

function setup() {
  createCanvas(600, 600);
  // 300 x 300 mm, centred on A2 paper
  plot = createPlot({ paper: "A2", margin: 12, width: 300, log: melding });
  noLoop();
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  noFill();
  randomSeed(seed);
  plot.clear();

  let n = 10;
  let cel = width / n;
  for (let rij = 0; rij < n; rij++) {
    let wanorde = rij / (n - 1);
    for (let kolom = 0; kolom < n; kolom++) {
      let cx = kolom * cel + cel / 2;
      let cy = rij * cel + cel / 2;
      for (let k = 1; k <= 4; k++) {
        let straal = (cel * 0.42 * k) / 4;
        let hoek = random(-1, 1) * wanorde * QUARTER_PI;
        let dx = random(-1, 1) * wanorde * cel * 0.2;
        let dy = random(-1, 1) * wanorde * cel * 0.2;
        vierkant(cx + dx, cy + dy, straal, hoek);
      }
    }
  }

  plot.go();   // ready: click the drawing to plot, click again to stop
}

function vierkant(cx, cy, straal, hoek) {
  let punten = [];
  for (let i = 0; i < 4; i++) {
    let a = hoek + QUARTER_PI + HALF_PI * i;
    punten.push([cx + cos(a) * straal, cy + sin(a) * straal]);
  }
  plot.polygon(punten);
}

function keyPressed() {
  if (key === "r" || key === "R") {
    seed = seed + 1;
    redraw();
  }
}

function melding(tekst) {
  console.log(tekst);
}
