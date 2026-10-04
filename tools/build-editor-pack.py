"""Package separate candidate editor files; never modify hosted sketches."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import json

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
args = parser.parse_args()
version = json.loads((root / "package.json").read_text())["version"]
names = ["first_plot", "wave_plot", "direct_plot", "pen_up_down", "chaos_game", "molnar_grid", "spirograph", "wave_field", "calibration_sheet"]
args.output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(args.output, "w", ZIP_DEFLATED) as archive:
    for name in names:
        archive.write(root / "examples" / name / "index_cdn.html", name + "/index.html")
        archive.write(root / "examples" / name / "sketch.js", name + "/sketch.js")
    archive.writestr("README.txt", f"p5.penplotter {version} candidate editor copies\n\nCreate separate copies of the retained v0.2.2 sketches. Copy each folder's index.html and sketch.js into the matching new sketch. Keep the original sketches unchanged. The index files require the candidate version tag to exist on the CDN.\n\nNine local browser previews were validated. The cloud task has not edited the hosted editor sketches or performed physical plots. Chaos Game waits for a click before its sequence.\n")
print(f"Packaged {len(names)} separate editor examples: {args.output}")
