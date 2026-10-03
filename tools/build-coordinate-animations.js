// Coordinate diagrams use the driver's 594 x 432 mm bed, never a camera view.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = {
  overview: "Draw, record, click, plot",
  "draw-bed": "Paper and drawing on the bed",
  "home-and-stop": "Start at the known machine origin",
  "plot-go": "Click the drawing to plot",
  "last-frame": "One recorded drawing",
  shapes: "Shapes recorded for the pen",
  fills: "Fill strokes recorded for the pen",
  waves: "Wave lines recorded for the pen",
  "chaos-game": "Points recorded in drawing order"
};
for (const [name, title] of Object.entries(names)) {
  let points = [];
  if (["overview", "last-frame", "home-and-stop", "plot-go", "draw-bed"].includes(name)) {
    for (let i = 0; i <= 240; i++) {
      const a = i / 240 * Math.PI * 8;
      points.push([100 + 65 * Math.cos(a) + 23 * Math.cos(3 * a), 100 + 65 * Math.sin(a) - 23 * Math.sin(3 * a)]);
    }
  } else if (name === "chaos-game") {
    let x = 100, y = 20, seed = 3;
    const corners = [[100, 15], [15, 185], [185, 185]];
    for (let i = 0; i < 180; i++) {
      seed = (seed * 16807) % 2147483647;
      const c = corners[seed % 3]; x = (x + c[0]) / 2; y = (y + c[1]) / 2;
      points.push([x, y]);
    }
  } else if (name === "shapes") {
    points = [[30,30],[170,30],[170,170],[30,170],[30,30]];
  } else {
    for (let row = 0; row < 8; row++) for (let i = 0; i <= 50; i++) {
      const x = row % 2 ? 180 - i * 3.2 : 20 + i * 3.2;
      points.push([x, 25 + row * 21 + (name === "waves" ? 8 * Math.sin(x * .07) : 0)]);
    }
  }
  const d = points.map(([x,y],i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const motionPoints = name === "home-and-stop" ? points.slice(0, Math.ceil(points.length / 2)) : points;
  const motion = "M302,100 " + motionPoints.map(([x,y]) => `L${(370.65+x*.65).toFixed(2)},${(129.7+y*.65).toFixed(2)}`).join(" ") + (name === "home-and-stop" ? "" : " L302,100");
  const endNote = name === "home-and-stop" ? "After a stop, repark at the known origin before a new job." : "Start at its known origin. A different corner changes the job.";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">A coordinate diagram, not a view of the physical machine. The origin is at the diagram's top left; positive X follows the 594 mm rail and positive Y spans 432 mm. Paper and drawing are placed within those coordinates. The physical starting corner must match the driver's motor directions.</desc>
  <rect width="600" height="400" fill="#000"/>
  <g font-family="monospace" fill="#fff"><text x="18" y="26" font-size="17">p5.penplotter</text><text x="18" y="50" font-size="13">${title}</text></g>
  <rect x="18" y="85" width="225" height="235" fill="none" stroke="#00ffff" stroke-width="3"/>
  <text x="30" y="105" font-family="monospace" font-size="13" fill="#00ffff">p5.js canvas</text>
  <rect x="30" y="115" width="200" height="200" fill="#fff"/>
  <g transform="translate(30 115)">${name === "chaos-game" ? points.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#ff00ff"/>`).join("") : `<path d="${d}" fill="none" stroke="#ff00ff" stroke-width="1.2"/>`}</g>
  <text x="257" y="218" fill="#00ffff" font-family="monospace" font-size="16">→</text>
  <text x="314" y="75" fill="#fff" font-family="monospace" font-size="12">BED COORDINATES</text>
  <rect x="302" y="100" width="267.3" height="194.4" fill="#fff" stroke="#00ffff" stroke-width="2"/>
  <rect x="302" y="102.7" width="267.3" height="189" fill="#eee" stroke="#777"/>
  <text x="467" y="119" font-family="monospace" font-size="11">A2 paper</text>
  <path d="${name === "chaos-game" ? points.map(([x,y]) => `M${x},${y}h.8`).join(" ") : d}" transform="translate(370.65 129.7) scale(.65)" fill="none" stroke="#ff00ff" stroke-width="1.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" values="1;1;${name === "home-and-stop" ? ".5;.5" : "0;0"}" keyTimes="0;.2;.85;1" dur="8s" repeatCount="indefinite"/></path>
  <circle r="3.5" fill="#000" stroke="#00ffff" stroke-width="2"><animateMotion path="${motion}" dur="8s" repeatCount="indefinite"/></circle>
  <path d="M298 96 l8 8 m-8 0 l8 -8" fill="none" stroke="#ff3333" stroke-width="2"/>
  <g font-family="monospace" font-size="11" fill="#00ffff"><text x="290" y="91">(0,0)</text><text x="407" y="91">+X · 594 mm →</text><text x="574" y="176">+Y</text><text x="574" y="193">↓</text><text x="403" y="313">Y span: 432 mm</text></g>
  <g font-family="monospace" font-size="12" fill="#fff"><text x="18" y="348">Coordinate view. Match X and Y to the real machine.</text><text x="18" y="370">${endNote}</text></g>
</svg>\n`;
  fs.writeFileSync(path.join(root, "docs/images/animations", `${name}.svg`), svg);
}
