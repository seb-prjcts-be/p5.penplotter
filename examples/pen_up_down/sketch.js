// U: pen up. D: pen down. No XY movement or servo calibration writes.
let plot;
let busy = false;

function setup() {
  createCanvas(400, 180);
  plot = createPlot({ x: 100, y: 100, width: 80, log: console.log });
  noLoop();
}

function draw() {
  background(255);
  fill(30);
  noStroke();
  textSize(16);
  text("U: pen up", 20, 45);
  text("D: pen down", 20, 80);
  text("No XY movement.", 20, 120);
}

async function keyPressed() {
  if (busy) return;
  const pressed = key.toLowerCase();
  if (pressed !== "u" && pressed !== "d") return;
  busy = true;
  try {
    await plot.connect();
    const up = pressed === "u";
    const command = up ? "SP,1,300" : "SP,0,300";
    console.log(up ? "Pen up." : "Pen down.");
    const reply = await plot.transport.send(command, { timeoutMs: 2000 });
    if (reply.trim().startsWith("!")) throw new Error(reply);
    console.log("Command accepted; check the physical pen height.");
  } catch (error) {
    console.error(error);
  } finally {
    busy = false;
  }
}
