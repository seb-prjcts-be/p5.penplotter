"""Correct the point close-up label from 0.25 mm to 0.24 mm, as recorded by
plot.point() (POINT_RADIUS_MM = 0.12). Repaints one glyph in place; every
other pixel and every frame duration is kept."""
from pathlib import Path
from PIL import Image

GIF = Path(__file__).resolve().parents[2] / 'docs/images/animations/point-closeup.gif'
CYAN = (85, 255, 255)
FIVE, FOUR, TWO = '111100111001111', '101101111001001', '111001111100111'
X5, X2, Y, CELL = 64, 48, 348, 4

def read(px, x0):
    return ''.join('1' if px[x0 + c * CELL + 1, Y + r * CELL + 1] == CYAN else '0' for r in range(5) for c in range(3))

source = Image.open(GIF)
frames, durations, patched = [], [], 0
for index in range(source.n_frames):
    source.seek(index)
    durations.append(source.info['duration'])
    frame = source.convert('RGB')
    px = frame.load()
    if read(px, X5) == FIVE and read(px, X2) == TWO:
        background = px[X5 + 1 * CELL + 1, Y + 1 * CELL + 1]
        for r in range(5):
            for c in range(3):
                color = CYAN if FOUR[r * 3 + c] == '1' else background
                for dy in range(CELL):
                    for dx in range(CELL):
                        px[X5 + c * CELL + dx, Y + r * CELL + dy] = color
        patched += 1
    frames.append(frame)
if patched == 0:
    raise SystemExit(f'{GIF.name}: no frame reads 0.25 mm; nothing to change')
colors = sorted({c for f in frames for _, c in f.getcolors(1 << 20)})
assert len(colors) <= 4, colors
palette = [v for c in colors for v in c] + [0] * (768 - 3 * len(colors))
sample = Image.new('P', (1, 1)); sample.putpalette(palette)
out = [f.quantize(palette=sample, dither=Image.Dither.NONE) for f in frames]
out[0].save(GIF, save_all=True, append_images=out[1:], duration=durations, loop=0)
print(f'{GIF.name}: {patched} of {len(frames)} frames now read 0.24 mm')
