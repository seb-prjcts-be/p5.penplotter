// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = async function () {
  await sketchSetup();
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
  document.querySelector("#paths").textContent = String(plotPlan.stats.paths);
  document.querySelector("#draw").textContent = `${plotPlan.stats.drawDistance.toFixed(1)} px`;
  document.querySelector("#travel").textContent = `${plotPlan.stats.travelDistance.toFixed(1)} px`;
};

draw = function () {
  sketchDraw();

};
