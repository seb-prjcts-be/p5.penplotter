// U: pen up. D: pen down. No XY movement or servo calibration writes.
let plot;
let busy = false;

function setup() {
  createCanvas(400, 180);
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
  plot = createPlot({ paper: "A4", margin: 12, width: 80, log: console.log });
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
    if (plot.driver.identity?.protocol === "drawcore") throw new Error("This example sends EBB pen commands. Use the A3 H test page for DrawCore.");
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
