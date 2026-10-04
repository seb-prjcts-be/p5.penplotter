# Pixel animations for the first steps

Three CGA animations for Setup and the Guide, and a label correction for the point close-up.

| File | Page | What it shows |
| --- | --- | --- |
| `first-circle.gif` | Setup | The Setup sketch, the click, the port list and the 75 mm circle on A2 |
| `plot-prefix.gif` | Guide, section 1 | `line()` stays on screen; `plot.line()` is also recorded for paper |
| `no-loop.gif` | Guide, Redraw a sketch | A looping `draw()` keeps recording; `noLoop()` records one picture |
| `point-closeup.gif` | Guide, Other shapes | Label corrected from 0.25 mm to 0.24 mm, the dash `plot.point()` records |

Palette: black `#000000`, cyan `#00ffff`, magenta `#ff00ff`, white `#ffffff`. Each new animation is 600 × 400, loops in 12 seconds and uses the 3 × 5 pixel font.

## Numbers

`build-data.mjs` imports the released bundle in `dist/` and writes `scene-data.json`. It uses the Setup options `{ paper: "A2", paperX: 0, paperY: 0, width: 100 }` on a 400 × 400 canvas:

- circle: 75 mm diameter, about 23 s on the `idraw-hse-a2` profile
- `plot.line(80, 200, 320, 200)`: 60 mm
- 300 frames with a 60-pixel circle at a random place: 300 recorded paths, about 10 minutes. The same circle drawn 300 times in one place is merged into one path by `plan()`; the script checks both.

Times are the driver's compiled estimates, not stopwatch measurements. The pen speed in the animations is schematic. The bed view follows Setup: rails running away from you, origin bottom left.

## Regenerate

```sh
node tools/pixel_animations/build-data.mjs
node tools/pixel_animations/export-gifs.cjs python3
python3 tools/pixel_animations/fix-point-label.py
```

The export needs Python with Pillow. The encoder refuses a GIF that is not 600 × 400, uses another colour or does not last 12 seconds. `fix-point-label.py` only changes frames that still read 0.25.
