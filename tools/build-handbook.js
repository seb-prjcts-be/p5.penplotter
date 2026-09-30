// Prints docs/handbook.html to docs/<name>-handbook.pdf with a headless
// Chrome or Edge found on this machine. The HTML is the source; the PDF is
// committed so the handbook can be read without a browser: `npm run handbook`.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).name;
const source = path.join(root, "docs", "handbook.html");
const target = path.join(root, "docs", `${name}-handbook.pdf`);

const candidates = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);
const browser = candidates.find((candidate) => fs.existsSync(candidate));
if (!browser) {
  console.error("No Chrome or Edge found; set CHROME to the browser executable.");
  process.exit(1);
}

const profile = path.join(os.tmpdir(), "penplotter-handbook-profile");
fs.mkdirSync(profile, { recursive: true });
const result = spawnSync(browser, [
  "--headless=new",
  "--disable-gpu",
  `--user-data-dir=${profile}`,
  "--no-pdf-header-footer",
  "--virtual-time-budget=10000",
  `--print-to-pdf=${target}`,
  pathToFileURL(source).href
], { stdio: "ignore" });
if (result.status !== 0 || !fs.existsSync(target)) {
  console.error(`Printing failed (exit ${result.status}).`);
  process.exit(1);
}
const pages = (fs.readFileSync(target).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`handbook: ${path.relative(root, target)} (${pages} pages, ${Math.round(fs.statSync(target).size / 1024)} kB)`);
