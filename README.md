# p5.penplotter

`p5.penplotter` is de officiële p5.js-adapter voor
[`vanilla.penplotter`](https://github.com/seb-prjcts-be/vanilla.penplotter). De adapter
voegt drie methods toe aan p5.js en bevat bewust geen eigen optimizer, planner,
renderer of hardwarecode.

```text
p5.js / p5.waves
        ↓
    p5.penplotter
        ↓
 vanilla.penplotter
        ↓
 PlotPlan → export / driver
```

## Vereisten

Deze tabel staat letterlijk gelijk in de README van `vanilla.penplotter`; een test bewaakt dat.

<!-- vereisten:start -->
| onderdeel | vereist | opmerking |
|---|---|---|
| `vanilla.penplotter` | niets | geen dependencies; werkt zonder p5.js. Node ≥ 18 alleen om de tests te draaien |
| `p5.penplotter` | vanilla.penplotter ≥ 0.2.0 | de adapter bevat geen plot- of machinecode; met een driver erbij weigert hij een oudere core met een duidelijke melding |
| `p5.penplotter` | p5.js ≥ 2.2.2 | getest met 2.2.2, in global en instance mode |
| rechtstreeks plotten | Chrome of Edge, op `localhost` of https | Web Serial; de browser toont zijn poortlijst alleen na een klik of toets |
| rechtstreeks plotten | iDraw HSE / A2 met EBB-firmware 3.0.2 | het enige fysiek geteste profiel (`idraw-hse-a2`) |
| voorbeelden | p5.waves 3.4.0, vanilla.waves (vastgepinde commit) | alleen de voorbeelden; geen van beide libraries hangt ervan af |

Samen getest: `vanilla.penplotter` 0.2.0 met `p5.penplotter` 0.2.0.

Publiceren: altijd eerst `vanilla.penplotter`, dan `p5.penplotter`. De voorbeelden van
`p5.penplotter` laden de core als buurmap (`../vanilla.penplotter/`), lokaal onder `htdocs`
en online op GitHub Pages. Ze krijgen dus altijd de recentste core, geen
vastgepinde; de versiecontrole in de adapter vangt een core op die niet past.
<!-- vereisten:end -->

## Setup

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.js"></script>
<script type="module" src="sketch.js"></script>
```

```js
import { PlotterEngine } from "https://seb-prjcts-be.github.io/vanilla.penplotter/vanilla.penplotter.js";
import { installP5Penplotter } from "https://seb-prjcts-be.github.io/p5.penplotter/p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine);
```

## Global mode

Een module maakt geen globals, dus `function setup()` in een module-`sketch.js`
ziet p5 nooit. Zet voor global mode de imports in `index.html` en laat
`sketch.js` een gewoon script zijn:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.js"></script>
<script type="module">
  import { PlotterEngine } from "https://seb-prjcts-be.github.io/vanilla.penplotter/vanilla.penplotter.js";
  import { installP5Penplotter } from "https://seb-prjcts-be.github.io/p5.penplotter/p5.penplotter.js";
  installP5Penplotter(p5, PlotterEngine);
</script>
<script src="sketch.js"></script>
```

```js
let plot;

function setup() {
  createCanvas(800, 800);
  plot = createPlotterEngine();
  plot.line(40, 40, 760, 760);
  drawPlotPlan(plot.plan());
}
```

De module draait nadat de pagina gelezen is en vóór `load`, het moment waarop
p5 de sketch start. Alle vier de koppelingen, met de tijdlijn erachter, staan in
[docs/setup.html](https://seb-prjcts-be.github.io/p5.penplotter/docs/setup.html).

## Instance mode

```js
new p5(function sketch(p) {
  p.setup = function setup() {
    p.createCanvas(800, 800);
    const plot = p.createPlotterEngine();
    plot.circle(400, 400, 180);
    p.drawPlotPlan(plot.plan());
  };
});
```

## Rechtstreeks naar de pen

Geen SVG ertussen: elke `plot.…`-aanroep tekent op het canvas én onthoudt
dezelfde vorm voor de plotter. `plot.go()` stuurt het plan naar de machine.
De driver komt uit `vanilla.penplotter` en wordt bij installatie aangereikt.

```js
import { PlotterEngine } from "../vanilla.penplotter/vanilla.penplotter.js";
import * as Ebb from "../vanilla.penplotter/src/driver/ebb.js";
import { installP5Penplotter } from "./p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine, { driver: Ebb });

let plot;

function setup() {
  createCanvas(400, 250);
  // waar het canvas op het bed landt, in mm vanaf de thuishoek, en hoe breed
  plot = createPlot({ x: 80, y: 150, width: 80 });
  noLoop();
}

function draw() {
  background(255);          // alleen scherm: er staat geen plot. voor
  plot.clear();             // nieuw frame, nieuwe opdracht
  plot.rect(10, 10, 380, 230);
  plot.line(30, 125, 370, 125);
}

function keyPressed() {
  if (key === "p") plot.go();   // verbinden, bevestigen, plotten
  if (key === "s") plot.stop(); // pen omhoog, motoren uit
}
```

Gebruik Chrome of Edge (Web Serial) en roep `plot.go()` aan vanuit een toets- of
muishandler: de browser toont zijn poortlijst alleen na een gebaar van de
gebruiker. Zet de slede eerst met de hand in de thuishoek; de machine kent geen
automatische thuispositie. `draw()` loopt 60 keer per seconde, een plotter
tekent één keer: plotten is altijd de momentopname van het laatste frame.

Getest op één machine: iDraw HSE / A2 (EBB-firmware 3.0.2) op 2026-09-21.

## p5.waves

`Waves.wave()` retourneert één getal. Bouw daarmee gewone punten en geef die aan
de engine:

```js
const points = [];
for (let x = 40; x <= 760; x += 4) {
  points.push({
    x,
    y: 400 + Waves.wave(x, {
      wave: "triangle sine",
      t: 0,
      amplitude: 80,
      frequency: 0.04
    })
  });
}
plot.polyline(points);
```

## Verwant werk

[p5.plotSvg](https://github.com/golanlevin/p5.plotSvg) van Golan Levin exporteert
een plotter-vriendelijke SVG uit een p5-sketch, met `beginRecordSvg()` en
`endRecordSvg()`, en dekt veel meer p5-primitieven dan deze adapter. Het stuurt
geen machine aan. `p5.penplotter` kiest het andere pad: geen bestand, wel
`plot.go()`.

[p5.plotterControl](https://github.com/craigfahner/p5.plotterControl) (craigfahner)
stuurt GRBL-penplotters live aan vanuit p5.js. `p5.penplotter` richt zich
op EBB-machines zoals de iDraw HSE en plant de hele tekening vóór de pen beweegt.

## Publieke API

- `installP5Penplotter(p5, PlotterEngine, { driver })` — installeert de adapter expliciet; `driver` is optioneel en alleen nodig voor `plot.go()`.
- `createPlotterEngine(options)` — maakt een core-engine met standaard de huidige canvasmaat en `px` als unit.
- `createPlot(options)` — maakt een `P5Plot`: `line`, `circle`, `rect`, `polyline` en `polygon` tekenen op het canvas én nemen op in mm; `clear()`, `plan()`, `connect()`, `go()` en `stop()` sturen de opdracht. Opties: `x`, `y`, `width` (mm op het bed) of `mmPerPixel`, `profile`, `confirm`, `log`.
- `drawPlotPlan(plan, options)` — tekent het echte geplande resultaat via p5.js.
- `drawPlanWithP5(p, plan, options)` — dezelfde renderer zonder prototype-helper.

Versie 0.2.0 mikt op p5.js 2.2.2. De core en hardwarestatus worden uitsluitend
door `vanilla.penplotter` bepaald.
