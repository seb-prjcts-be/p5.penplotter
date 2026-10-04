// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = function () {
  sketchSetup();
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
};

draw = function () {
  sketchDraw();
  document.querySelector("#paths").textContent = String(plotPlan.stats.paths);
  document.querySelector("#draw").textContent = plotPlan.stats.drawDistance.toFixed(1) + " mm";
  document.querySelector("#travel").textContent = plotPlan.stats.travelDistance.toFixed(1) + " mm";
};
