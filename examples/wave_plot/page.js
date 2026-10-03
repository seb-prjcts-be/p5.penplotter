// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = async function () {
  await sketchSetup();
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));

};

draw = function () {
  sketchDraw();

  document.querySelector("#paths").textContent = String(plotPlan.stats.paths);
  document.querySelector("#lifts").textContent = String(plotPlan.stats.penLifts);
  document.querySelector("#travel").textContent = `${plotPlan.stats.travelDistance.toFixed(1)} px`;

};

document.querySelector("#reroll").addEventListener("click", function rerollWave() {
  waveSeed = Math.floor(Math.random() * 34);
  plotPlan = buildPlan();

  redraw();
});
