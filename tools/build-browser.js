import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const core = path.resolve(root, "..", "vanilla.penplotter");
const source = JSON.parse(fs.readFileSync(path.join(root, "browser/core-source.json"), "utf8"));
const execute = promisify(execFile);
const development = process.argv.includes("--development");
const head = (await execute("git", ["-C", core, "rev-parse", "HEAD"])).stdout.trim();
if (!development && head !== source.commit) throw new Error(`Build needs core ${source.commit}; found ${head}.`);
const changed = (await execute("git", ["-C", core, "status", "--porcelain", "--untracked-files=all", "--", "src", "vanilla.penplotter.js"])).stdout.trim();
if (changed && !development) throw new Error("Build needs unchanged core source files.");
const output = process.env.PENPLOTTER_BUILD_DIR || path.join(root, development ? "node_modules/.development-bundle" : "dist");
if (development && path.resolve(output) === path.join(root, "dist")) throw new Error("Development builds must not overwrite release dist files.");
const common = {
  absWorkingDir: root,
  bundle: true,
  platform: "browser",
  target: "es2022",
  charset: "utf8",
  legalComments: "inline",
  define: { __PENPLOTTER_CORE_COMMIT__: JSON.stringify(head), __PENPLOTTER_DEVELOPMENT__: String(development) },
  banner: { js: "/*! p5.penplotter + vanilla.penplotter — MIT License — Sebastien Vanblaere */" },
  metafile: true
};
for (const [entry, filename, format] of [
  ["browser/entry.js", "p5.penplotter.js", "esm"],
  ["browser/classic.js", "p5.penplotter.browser.js", "iife"]
]) {
  const result = await build({ ...common, entryPoints: [entry], outfile: path.join(output, filename), format, ...(format === "iife" ? { globalName: "P5PenplotterBundle" } : {}) });
  for (const value of Object.values(result.metafile.outputs)) {
    if (value.imports.length) throw new Error("Browser bundle must contain all its modules.");
  }
}
console.log(`${development ? "Development browser" : "Browser"} bundles built with core ${head}${development ? " plus working-tree changes" : ""}.`);
