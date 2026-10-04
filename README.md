# p5.penplotter

![From a p5 sketch to a planned drawing on paper](docs/images/animations/overview.gif)

**[Open site](https://seb-prjcts-be.github.io/p5.penplotter/)** · **[Setup](https://seb-prjcts-be.github.io/p5.penplotter/docs/setup.html)** · **[Examples](https://seb-prjcts-be.github.io/p5.penplotter/docs/examples.html)** · **[vanilla.penplotter](https://github.com/seb-prjcts-be/vanilla.penplotter)**

You sketch in p5.js the way you always do. Write `plot.line()` instead of `line()` and the same line is drawn on the canvas and remembered in millimetres.

Call `plot.go()` when the drawing is ready, then click the drawing to start plotting. No intermediate SVG is required for direct plotting.

## Two ways to work

Draw everything and plot once. Or draw and plot one object, wait until it finishes, then make the next. With separate `go()` calls, use `plot.clear()` before a new object; otherwise earlier objects are plotted again. `plot.sequence()` clears automatically before asking for the next object. Clear does not remove ink. The [Guide](https://seb-prjcts-be.github.io/p5.penplotter/docs/guide.html#werkwijzen) shows both ways.

## Which library?

**p5.penplotter** connects the engine to p5.js. Use it when you want to draw with supported p5 shapes and send them to the pen with `plot.go()`.

**[vanilla.penplotter](https://github.com/seb-prjcts-be/vanilla.penplotter)** is the engine. Use it for your own JavaScript, arrays of points or supported SVG geometry. It has no dependencies and works without p5.js.

Each job is prepared before plotting. `plot.sequence()` calculates one object, plots it and waits before preparing the next. Live streaming is not implemented; [live drawing notes](https://seb-prjcts-be.github.io/vanilla.penplotter/docs/live.html) describe the proposed direction.

## Install

This development branch prepares the v0.2.5-rc.1 browser bundle. The published adapter v0.2.2 remains unchanged. Candidate CDN URLs become available once the corresponding candidate tag has been pushed.

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.js"></script>
<script type="module">
  import { install } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v0.2.5-rc.1/dist/p5.penplotter.js";
  install(p5);
</script>
<script src="sketch.js"></script>
```

The browser bundle contains the adapter, core and EBB driver from one tested source combination. It performs no GitHub lookup and loads no separate core modules. p5.js stays separate. The CDN URL uses a fixed release tag; keep that tag to preserve a sketch. This branch is the `0.2.5-rc.1` candidate; v0.2.2 remains unchanged.

Preview and export work without connecting a plotter. Web Serial is opened only after a user gesture. The original `installP5Penplotter(p5, PlotterEngine, { driver })` API remains available from the root adapter module for explicit integrations.

All four ways of wiring a sketch, with the load-order timeline behind them, are on the [Setup](https://seb-prjcts-be.github.io/p5.penplotter/docs/setup.html) page.

## Quick start

A plain global-mode sketch, with the `<script>` tags above in `index.html`:

```js
let plot;

function setup() {
  createCanvas(400, 250);
  // an 80 mm wide drawing, centred on A4 paper
  plot = createPlot({ paper: "A4", margin: 12, width: 80 });
  noLoop();
}

function draw() {
  background(255);          // screen only: no `plot.` prefix, so it is not recorded
  plot.clear();             // new frame, new job
  plot.rect(10, 10, 380, 230);
  plot.line(30, 125, 370, 125);
  plot.go();                // the drawing is ready: click it to plot, click again to stop
}
```

### Click to plot

<p align="center">
  <img src="docs/images/animations/starting-plot-p5.gif" alt="The drawing waits for a click, asks for a port when needed, then plots; a second click requests a stop" width="480">
</p>

`plot.go()` waits for a click when called from `setup()` or `draw()`. Check the machine, then click the drawing. The browser asks for a serial port when needed. A click while plotting requests a stop.

Park the carriage in the home corner by hand first; the machine has no home position of its own.

See [the physical starting corner in Setup](https://seb-prjcts-be.github.io/p5.penplotter/docs/setup.html#machine-origin). Moving the carriage to another corner does not reverse the motor directions.

The plot contains the shape calls recorded since the last `plot.clear()`. Clear at the start of `draw()` to replace each frame, and use `noLoop()` for a stable drawing. Screen transforms and styling are not recorded.

Tested on one machine: iDraw HSE / A2 (EBB firmware 3.0.2) on 2026-09-21. Plotted from the p5.js Web Editor on 2026-10-01.

## Requirements

The shared source-library contract below also records the retained v0.2.2 workflow. This candidate’s browser examples use the bundled core; only building and source-level integration tests need the sibling checkout.

<!-- vereisten:start -->
| component | requires | note |
|---|---|---|
| `vanilla.penplotter` | nothing | no dependencies; works without p5.js. Node ≥ 18 only to run the tests |
| `p5.penplotter` | vanilla.penplotter ≥ 0.2.0 | the adapter contains no plotting or machine code; with a driver attached it refuses an older core with a clear message |
| `p5.penplotter` | p5.js ≥ 2.2.2 | tested with 2.2.2, in global and instance mode |
| direct plotting | Chrome or Edge, on `localhost` or https | Web Serial; the browser shows its port list only after a click or keypress |
| direct plotting | iDraw HSE / A2 with EBB firmware 3.0.2 | the only physically tested profile (`idraw-hse-a2`) |
| examples | wave formulas, vanilla.waves (pinned commit) | examples only; neither library depends on them |

Tested together: `vanilla.penplotter` 0.3.1 with `p5.penplotter` 0.2.2.

Publishing: always `vanilla.penplotter` first, then `p5.penplotter`. The examples of
`p5.penplotter` load the core as a sibling folder (`../vanilla.penplotter/`), locally under
`htdocs` and online on GitHub Pages. They therefore always get the latest core, not a
pinned one; the version check refuses a core below the required minimum.
<!-- vereisten:end -->

## Instance mode

```js
import { install } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v0.2.5-rc.1/dist/p5.penplotter.js";
install(p5);

new p5(function sketch(p) {
  let plot;
  p.setup = function setup() {
    p.createCanvas(600, 600);
    plot = p.createPlot({ paper: "A2", margin: 12, width: 300 });
    plot.circle(300, 300, 400);
    plot.go();   // click the drawing to plot
    p.noLoop();
  };
});
```

## Shapes and fills

`plot.…` supports these p5 shapes, using their p5 arguments: `point`,
`line`, `circle`, `ellipse`, `arc`, `rect`, `square`, `triangle`, `quad`.
Points for `polyline` and `polygon` may be `[x, y]` or `{ x, y }`.
Angles follow `angleMode()`.

```js
plot.point(20, 20);
plot.square(30, 10, 40);
plot.triangle(80, 50, 120, 10, 160, 50);
plot.ellipse(260, 30, 60, 30);
plot.arc(330, 30, 40, 40, 0, HALF_PI, PIE);
plot.polygon([[0, 0], [40, 0], [40, 40]]);
```

`point()` is recorded as a short dash, about a quarter of a millimetre. An ellipse is recorded as a polyline with 96 segments.

Fills come from the engine and are drawn back onto the canvas, so screen and paper show the same hatching. The spacing is in millimetres on the bed, not in pixels:

```js
let square = [[20, 80], [120, 80], [120, 180], [20, 180]];
plot.hatch(square, 3, PI / 4);   // spacing in mm, angle
plot.crossHatch(square, 4);      // second direction perpendicular to the first
plot.stipple(square, 150, 3);    // count, seed: same seed, same dots
```

## Sampling a wave

`Math.sin()` returns a number. Build ordinary points with it and pass them on:

```js
const points = [];
for (let x = 40; x <= 760; x += 4) {
  points.push({
    x,
    y: 400 + 80 * Math.sin(x * 0.04)
  });
}
plot.polyline(points);
```

## Examples

Each one is a standalone page under `examples/`; the [examples page](https://seb-prjcts-be.github.io/p5.penplotter/docs/examples.html) shows them live.

Start with the two ways to work:

- `direct_plot` - draw everything, then click to plot with `plot.go()`
- `chaos_game` - calculate one point, plot it and wait before the next with `plot.sequence()`

Then vary the drawing:

- `molnar_grid` - nested squares that drift and turn a little more with every row
- `calibration_sheet` - ruler, tone scales, circles and line spacing: what your pen does on your paper
- `wave_field` - streamlines through a sampled direction field; a seed chooses the field
- `spirograph` - three hypotrochoids, each one unbroken polyline

To inspect a planned route on screen, without connecting a plotter:

- `first_plot` (Plot preview) - a hatched polygon and a circle
- `wave_plot` (Wave plot preview) - 24 rows sampled from a wave formula

## Related work

See [About](https://seb-prjcts-be.github.io/p5.penplotter/docs/about.html#related-work) for p5.plotSvg, p5.plotterControl and the sister libraries.

## Public API

- `installP5Penplotter(p5, PlotterEngine, { driver })`: connects the adapter to p5.js and the core engine; `driver` is optional and only needed for `plot.go()`.
- `createPlot(options)`: creates a `P5Plot` that draws supported shapes on screen and records them in millimetres. Its `engine` is the underlying `PlotterEngine`.
- `createPlotterEngine(options)`: creates a bare engine with, by default, the current canvas size and `px` as unit.
- `drawRoute(plan, options)`: draws the route: the plan as the machine will draw it, via p5.js. Also `drawPlotPlan()`.
- `plot.sequence(prepare, options)`: one click starts successive jobs. Before each job, clears the recording and calls `prepare(index)`. Draw one object and return `true`; return `false` when finished. The carriage returns home after the last object. A click while running stops the sequence.
- `plot.showBed([canvas])`: shows the bed, paper and planned strokes with a small red cross at the origin. Without a canvas, it creates a separate preview and reuses it on redraw. Call it after recording the drawing.
- `plot.drawBed(canvas, { sheet })`: draws the planned strokes on the bed. Optional `sheet` describes actual paper with `x`, `y`, `width` and `height` in millimetres. By default it uses `plot.paper` when paper was selected, otherwise the mapped canvas area. Preview never scales or moves the drawing.
- `drawPlanWithP5(p, plan, options)`: the same renderer without the prototype helper.

`createPlot()` options: `paper`, `margin`, `orientation`, `paperX`, `paperY`, `width` or `mmPerPixel`, `x`, `y`, `profile`, `confirm`, `log`. Start with a paper format and margin; add a width when the drawing needs a fixed physical size. Use `clear()`, `plan()`, `connect()`, `go()` and `stop()` to control the job.

The [Guide](https://seb-prjcts-be.github.io/p5.penplotter/docs/guide.html#paper) explains paper formats, orientation and placement.

The browser candidate targets p5.js 2.2.2. The core and hardware status are determined solely by `vanilla.penplotter`.

## Test

```powershell
npm test
npm run docs
npm run manifest
```

`npm test` checks the adapter against a fake p5 and against the real engine in the sibling folder `../vanilla.penplotter` (or `VANILLA_PLOTTER_ROOT`), every local link on the site, that every example is in the gallery and the manifest, and that the generated architecture page is current.

## How this was made

Written with AI assistance, under the direction of Sebastien Vanblaere. Physical plotting tests use the iDraw HSE / A2. See [About](https://seb-prjcts-be.github.io/p5.penplotter/docs/about.html).

MIT License.

Sebastien Vanblaere

## Build and validate the browser bundle

See [the bundle workflow](docs/cdn-bundle.md). The build pins its core commit in `browser/core-source.json`. Use Node 22 or newer and `npm ci --legacy-peer-deps`; the core is supplied by its sibling Git checkout rather than the npm registry.
