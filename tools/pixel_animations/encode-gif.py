"""Encode 240 raw 300 x 200 RGB frames as a 600 x 400 GIF and verify it."""
from PIL import Image
from pathlib import Path
import sys

source, target, colors = sys.argv[1:4]
preview = sys.argv[4] if len(sys.argv) > 4 else ''
colors = colors.split(',')
palette = []
for color in colors:
    palette += [int(color[i:i+2], 16) for i in (0, 2, 4)]
palette += [0, 0, 0] * (256 - len(colors))
sample = Image.new('P', (1, 1))
sample.putpalette(palette)
raw = Path(source).read_bytes()
assert len(raw) == 240 * 300 * 200 * 3
frames = []
for i in range(240):
    rgb = Image.frombytes('RGB', (300, 200), raw[i*180000:(i+1)*180000])
    frames.append(rgb.resize((600, 400), Image.Resampling.NEAREST).quantize(palette=sample, dither=Image.Dither.NONE))
if preview:
    Path(preview).mkdir(parents=True, exist_ok=True)
    for second in (2, 3, 4, 7, 11):
        frames[second * 20].convert('RGB').save(str(Path(preview) / f'{Path(target).stem}-{second:02d}s.png'))
frames[0].save(target, save_all=True, append_images=frames[1:], duration=50, loop=0, optimize=False, disposal=1)
with Image.open(target) as gif:
    assert gif.size == (600, 400)
    assert gif.info['loop'] == 0
    allowed = {tuple(int(c[i:i+2], 16) for i in (0, 2, 4)) for c in colors}
    duration = 0
    for i in range(gif.n_frames):
        gif.seek(i)
        duration += gif.info['duration']
        assert {c for _, c in gif.convert('RGB').getcolors(240000)} <= allowed
    assert duration == 12000
    print(f'{Path(target).name}: 600 x 400, {gif.n_frames} frames, {duration} ms, {len(colors)}-color palette verified')
