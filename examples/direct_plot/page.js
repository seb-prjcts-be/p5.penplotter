// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = async function () {
  await sketchSetup();
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
  document.querySelector("#size").textContent = `${(width * plot.scale).toFixed(1)} × ${(height * plot.scale).toFixed(1)} mm`;
  document.querySelector("#place").textContent = `${plot.offset.x.toFixed(1)} / ${plot.offset.y.toFixed(1)} mm`;
  document.querySelector("#paper").textContent = `${plot.paper.format} · ${plot.paper.width} × ${plot.paper.height} mm, at X ${plot.paper.x} / Y ${plot.paper.y} mm`;
};

draw = function () {
  sketchDraw();
  document.querySelector("#paths").textContent = String(plot.plan().stats.paths);
};

say = function (text) {
  document.querySelector("#status").textContent = text;
};

document.querySelector("#reroll").addEventListener("click", () => {
  waveSeed = Math.floor(Math.random() * 34);
  redraw();
});
