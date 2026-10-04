# Browser bundle for v0.2.5

The published v0.2.2 release and its tag remain unchanged. Version `0.2.5` includes the browser bundle. Existing Web Editor reference sketches are preserved.

## User setup

Load p5.js 2.2.2 before the module block. The module bundle supplies the matching adapter, core and EBB driver:

```html
<script type="module">
  import { install } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v0.2.5/dist/p5.penplotter.js";
  install(p5);
</script>
```

Use the fixed release URL above. Fixed URLs preserve the code used by a sketch. There is no GitHub API request, automatic main lookup or setup wrapper.

The classic `dist/p5.penplotter.browser.js` file is an alternative: load it with a normal script tag after p5.js and before sketch.js. It installs synchronously. Do not load the explicit adapter installation and a bundle in the same sketch. Reinstalling the same bundle is harmless; a conflicting installation throws an error.

Global and instance mode retain their existing drawing methods. The root `p5.penplotter.js` module keeps the explicit `installP5Penplotter(p5, Engine, { driver })` API. Vanilla remains separately usable. Preview and export require no connected plotter. Physical plotting still requires a user gesture, Web Serial permission and a compatible machine.

## Reproduce the build

Use Node 22 or newer. Keep the existing sibling checkouts. `browser/core-source.json` pins vanilla.penplotter to `c72ba7fb8ea60c0ea2d84f7e36dd03d161fbd7c8`. The build rejects another core HEAD or changed core source. It does not reset a user's checkout.

```sh
npm ci --legacy-peer-deps
npm run build
npm test
npm run test:bundle
npm run test:browser
```

The legacy-peer-deps installation flag is needed because development gets the private core from its sibling Git checkout rather than resolving its peer declaration through npm. p5, esbuild and playwright-core are exact development dependency versions in the lockfile. They are not downloaded at browser runtime.

The build emits two complete, non-minified files in dist and rejects remaining external module imports. Rebuilding from the same source must produce identical bytes. Bundle metadata records adapter version, core version and core commit without embedding a circular output hash.

The browser runner uses `/usr/bin/chromium` when available, `PENPLOTTER_CHROMIUM` when supplied, or a Playwright-managed Chromium. In CI, `npx playwright-core install --with-deps chromium` prepares the browser. TLS verification remains enabled. Local browser comparison serves verified dependency files; that result is distinct from live CDN validation.

## Validation and release gates

Automated checks cover v0.2.2 geometry, plan, SVG and EBB-command equivalence, double/conflicting installation, missing/old p5, deterministic build bytes and the actual bundled driver's FIFO regression. Real Chromium checks all nine repository sketches at fixed seeds against the explicit v0.2.2 adapter with the pinned core. They also check module, classic and instance startup with actual p5 2.2.2. Chaos Game must wait for a click before starting its sequence.

The gallery and example pages link to the matching Web Editor sketches. These copies use the fixed v0.2.5 CDN and the repository sketch code. All nine public previews were checked in Chrome after saving the updates; no physical plots were performed.

Physical checks specific to this bundle remain unrecorded. Record results on iDraw HSE/A2 with EBB 3.0.2: Wave Lines, Molnar Grid, Spirograph, Calibration Sheet, U/D and a short Chaos Game sequence. Check controlled stop and the next job after parking the carriage again. Preview, mock/simulation and physical outcomes remain separate.

The release is published at the maintainer’s request on the basis of automated and browser checks. This does not establish a completed physical test of the bundle. An unexplained geometry or command difference requires investigation. No existing release tag or asset is overwritten; correction after publication requires a new release.
