import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Test the generated drawings, including refresh seeds that approach the edges.
for (const name of ['spirograph', 'molnar_grid']) {
  const source = fs.readFileSync(new URL(`../examples/${name}/sketch.js`, import.meta.url), 'utf8');
  for (let seed = 0; seed < 300; seed++) {
    let state = seed + 1;
    let vertices = 0;
    const check = points => {
      for (const [x, y] of points) {
        assert(Number.isFinite(x) && Number.isFinite(y), `${name}: finite coordinates`);
        assert(x >= 0 && x <= 600 && y >= 0 && y <= 600, `${name}, seed ${seed}: clipped point ${x},${y}`);
        vertices++;
      }
    };
    const context = vm.createContext({
      width: 600, height: 600, TWO_PI: Math.PI * 2, HALF_PI: Math.PI / 2, QUARTER_PI: Math.PI / 4,
      cos: Math.cos, sin: Math.sin, floor: Math.floor, console,
      createCanvas() {}, noLoop() {}, background() {}, stroke() {}, noFill() {}, randomSeed() {},
      random(a, b) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const fraction = state / 4294967296;
        return b === undefined ? fraction * a : a + fraction * (b - a);
      },
      createPlot: () => ({ clear() {}, polyline: check, polygon: check, showBed() {}, go() {} })
    });
    vm.runInContext(source + '\nsetup(); draw();', context);
    assert(vertices > 0);
  }
  console.log(`p5.penplotter examples: ${name}, 300 seeds within canvas`);
}
