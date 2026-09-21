import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installP5Penplotter, P5Penplotter, REQUIRES } from "../p5.penplotter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8").replace(/\r\n/g, "\n");
const packageData = JSON.parse(read("package.json"));
const BLOCK = /<!-- vereisten:start -->\n([\s\S]*?)<!-- vereisten:end -->/;

function FakeP5() {}

function engineWithVersion(version) {
  function Engine() {}
  if (version !== undefined) Engine.version = version;
  return Engine;
}

const kit = { EBB_PROFILES: {}, EbbDriver: class {}, createWebSerialTransport() {} };

// Every place that states the contract has to say the same thing.
function testOneContractEverywhere() {
  assert.equal(P5Penplotter.version, packageData.version);
  assert.equal(packageData.peerDependencies["vanilla.penplotter"], `>=${REQUIRES.core}`);
  assert.equal(packageData.peerDependencies.p5, `>=${REQUIRES.p5}`);

  const manifest = JSON.parse(read("docs/p5.penplotter.manifest.json"));
  assert.equal(manifest.version, packageData.version);
  assert.equal(manifest.core, `vanilla.penplotter@>=${REQUIRES.core}`);

  const block = read("README.md").match(BLOCK);
  assert.ok(block, "README.md needs the shared vereisten block");
  assert.ok(block[1].includes(`vanilla.penplotter ≥ ${REQUIRES.core}`), "README states the required core version");
  assert.ok(block[1].includes(`p5.js ≥ ${REQUIRES.p5}`), "README states the required p5.js version");
  assert.ok(read("index.html").includes(`v${packageData.version}`), "landing page shows the current version");
}

// Direct plotting needs a core that has the driver. Say so in plain words.
function testInstallRefusesAnOlderCore() {
  assert.throws(
    () => installP5Penplotter(FakeP5, engineWithVersion(undefined), { driver: kit }),
    new RegExp(`vanilla\\.penplotter ${REQUIRES.core.replace(/\./g, "\\.")} or newer`)
  );
  assert.throws(() => installP5Penplotter(FakeP5, engineWithVersion("0.1.9"), { driver: kit }), /or newer/);
  assert.throws(
    () => installP5Penplotter(FakeP5, engineWithVersion(REQUIRES.core), { driver: { EbbDriver: class {} } }),
    /createWebSerialTransport/
  );
  installP5Penplotter(FakeP5, engineWithVersion(REQUIRES.core), { driver: kit });
  installP5Penplotter(FakeP5, engineWithVersion("0.10.0"), { driver: kit });
  installP5Penplotter(FakeP5, engineWithVersion("1.0.0"), { driver: kit });
  // Without a driver the 0.1 features still work with any core.
  installP5Penplotter(FakeP5, engineWithVersion(undefined));
}

// With the sibling checkout at hand: the real core satisfies the contract and
// both READMEs carry the identical block.
async function testAgainstSiblingCore() {
  const core = process.env.VANILLA_PLOTTER_ROOT || path.resolve(root, "..", "vanilla.penplotter");
  if (!fs.existsSync(path.join(core, "vanilla.penplotter.js"))) {
    console.log("p5.penplotter requirements: sibling check skipped (no vanilla.penplotter checkout found)");
    return;
  }
  const { PlotterEngine } = await import(pathToFileURL(path.join(core, "vanilla.penplotter.js")));
  const Ebb = await import(pathToFileURL(path.join(core, "src", "driver", "ebb.js")));
  installP5Penplotter(FakeP5, PlotterEngine, { driver: Ebb });

  const corePackage = JSON.parse(fs.readFileSync(path.join(core, "package.json"), "utf8"));
  assert.equal(PlotterEngine.version, corePackage.version);
  const theirs = fs.readFileSync(path.join(core, "README.md"), "utf8").replace(/\r\n/g, "\n").match(BLOCK);
  assert.ok(theirs, "vanilla.penplotter README needs the shared vereisten block");
  assert.equal(theirs[1], read("README.md").match(BLOCK)[1], "both READMEs carry the same vereisten block");
  console.log(`p5.penplotter requirements: sibling core ${corePackage.version} ok`);
}

testOneContractEverywhere();
testInstallRefusesAnOlderCore();
await testAgainstSiblingCore();
console.log("p5.penplotter requirements: ok");
