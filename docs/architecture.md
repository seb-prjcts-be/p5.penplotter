# Architectuur van p5.penplotter

`p5.penplotter` is een adapter, geen tweede engine.

## Verantwoordelijkheden

- de `PlotterEngine`-class expliciet aan p5.js koppelen;
- canvasmaten als handige defaults gebruiken;
- een `PlotPlan` met p5.js tekenen;
- met `createPlot()` één aanroep zowel op het canvas tekenen als in mm opnemen, en die opdracht doorgeven aan de aangereikte driver;
- global en instance mode ondersteunen;
- p5.waves-voorbeelden tonen.

## Niet hier

Geometry, SVG-import, hatch, stippling, optimalisatie, routeplanning, exports,
machineprofielen en drivers blijven uitsluitend in `vanilla.penplotter`. Een bugfix
in die pipeline mag nooit naar deze repository worden gekopieerd.

## Installatiecontract

Automatische detectie van globale scripts lijkt eenvoudig maar maakt laadvolgorde
en versies impliciet. Daarom is installatie expliciet:

```js
installP5Penplotter(p5, PlotterEngine);
```

Dit werkt met browser-ESM, import maps en toekomstige package managers. De
adapter valideert ieder plan op schema `vanilla.penplotter/plan@1` voordat het wordt
getekend.

## Drivercontract

`plot.go()` bevat geen protocol-, stap- of machinekennis. De adapter krijgt de
driver-module van `vanilla.penplotter` aangereikt:

```js
installP5Penplotter(p5, PlotterEngine, { driver: Ebb });
```

en gebruikt daarvan alleen `EBB_PROFILES` (werkveld voor de paginamaat),
`createWebSerialTransport()` en `EbbDriver`. Omrekenen van pixels naar
millimeters is wél adapterwerk: dat is de vertaling van canvas naar bed.
Grenscontrole, snelheden, veilig stoppen en de bevestigingseis blijven in de
core; de adapter vraagt daarbovenop zelf een bevestiging aan de gebruiker.

## Versiecontract

De afhankelijkheid loopt in één richting: `p5.penplotter` gebruikt `vanilla.penplotter`,
nooit omgekeerd. Wat de adapter nodig heeft, staat één keer in de code, als
`REQUIRES` in `p5.penplotter.js`. `package.json`, het manifest en de tabel
*Vereisten* in de README worden daartegen getest, en die tabel staat letterlijk
gelijk in de README van `vanilla.penplotter`.

Wordt er een driver aangereikt, dan leest de adapter `PlotterEngine.version` en
weigert hij een core ouder dan `REQUIRES.core` met een gewone zin in plaats van
een onbegrijpelijke fout later. Zonder driver blijven `createPlotterEngine()` en
`drawPlotPlan()` met elke core werken.

De voorbeelden op deze site laden de core bewust als buurmap, zodat site en core
samen bewegen; ze krijgen dus de recentste versie, geen vastgepinde. De
versiecontrole is daar de vangrail, en bij publiceren geldt: eerst
`vanilla.penplotter`, dan `p5.penplotter`. Wie in een eigen project een vaste
versie wil, laadt beide libraries via jsDelivr op een tag, bijvoorbeeld
`https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@v0.2.0/vanilla.penplotter.js`.

## Weergavecontract

`drawPlotPlan()` tekent `plan.routes`, niet het oorspronkelijke artwork. Preview,
SVG en hardware laten daardoor dezelfde geplande geometrie en padomkering zien.
Pen-up travel blijft een core-previewfunctie en wordt niet dubbel geïmplementeerd.
