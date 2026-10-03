"""Build the two CGA workflow GIFs with Pillow: python tools/build-workflow-gifs.py."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/images/animations'
PALETTE = [0, 0, 0, 85, 255, 255, 255, 85, 255, 255, 255, 255] + [0] * (768 - 12)
def font(size):
    for name in ('C:/Windows/Fonts/cour.ttf', 'DejaVuSansMono.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)

FONT = font(15)
SMALL = font(13)
# Canvas coordinates are mapped to the same paper position in both diagrams.
SHAPES = [
    [(40, 80), (90, 80), (90, 130), (40, 130), (40, 80)],
    [(145 + 27 * math.cos(i * math.tau / 40), 105 + 27 * math.sin(i * math.tau / 40)) for i in range(41)],
    [(205, 130), (232, 78), (257, 130), (205, 130)],
]
# Shapes fit the actual 594 x 432 mm coordinate proportions.
def canvas(p): return (22 + p[0] * .87, 107 + p[1] * .87)
def bed(p): return (307 + (120 + p[0]) * .44, 105 + (95 + p[1]) * .44)
HOME = (307, 105)


def build(name, sequential):
    screen, ink, frames = [], [], []
    head = HOME
    completed = 0

    def frame(message, duration=100, extra_screen=None, extra_ink=None):
        im = Image.new('P', (600, 400), 0)
        im.putpalette(PALETTE)
        d = ImageDraw.Draw(im)
        d.text((18, 17), 'p5.penplotter', font=FONT, fill=3)
        d.text((18, 42), 'Draw, plot, wait, then the next' if sequential else 'Draw everything, then plot', font=FONT, fill=3)
        d.text((18, 76), 'p5.js canvas', font=SMALL, fill=1)
        d.text((307, 76), 'Bed coordinates (mm)', font=SMALL, fill=1)
        d.rectangle((18, 103, 266, 302), outline=1, width=2)
        d.rectangle((22, 107, 262, 298), fill=3)
        d.rectangle((307, 105, 568, 295), fill=3, outline=1, width=2)
        d.text((303, 91), '(0,0)', font=SMALL, fill=1)
        d.text((502, 91), '+X', font=SMALL, fill=1)
        d.text((575, 185), '+Y', font=SMALL, fill=1)
        for path in screen + ([extra_screen] if extra_screen else []):
            if len(path) >= 2: d.line([canvas(p) for p in path], fill=2, width=2)
        for path in ink + ([extra_ink] if extra_ink else []):
            if len(path) >= 2: d.line([bed(p) for p in path], fill=2, width=2)
        hx, hy = head
        d.ellipse((hx - 4, hy - 4, hx + 4, hy + 4), fill=0, outline=1, width=2)
        d.line((303, 101, 311, 109), fill=2, width=1)
        d.line((303, 109, 311, 101), fill=2, width=1)
        d.text((18, 324), message, font=FONT, fill=1)
        d.text((18, 353), f'Screen: {len(screen)}/3   Paper: {completed}/3', font=SMALL, fill=3)
        d.text((18, 377), 'plot.sequence(nextObject)' if sequential else 'plot.go()', font=SMALL, fill=2)
        frames.append((im, duration))

    def move(destination, message):
        nonlocal head
        start = head
        for step in range(1, 7):
            t = step / 6
            head = (start[0] + (destination[0] - start[0]) * t, start[1] + (destination[1] - start[1]) * t)
            frame(message)

    def draw_on_screen(path, index):
        for n in range(2, len(path) + 1):
            frame(f'Draw object {index + 1}', 80, extra_screen=path[:n])
        screen.append(path)
        frame(f'Object {index + 1} recorded', 250)

    def plot(path, index):
        nonlocal head, completed
        move(bed(path[0]), 'Move with the pen up')
        # Sample every edge to make all three objects visibly take time.
        sampled = [path[0]]
        for a, b in zip(path, path[1:]):
            steps = max(1, math.ceil(math.dist(a, b) / 7))
            for n in range(1, steps + 1):
                sampled.append((a[0] + (b[0] - a[0]) * n / steps, a[1] + (b[1] - a[1]) * n / steps))
        for n in range(2, len(sampled) + 1):
            head = bed(sampled[n - 1])
            frame(f'Plot object {index + 1}', 80, extra_ink=sampled[:n])
        ink.append(path)
        completed += 1
        if sequential or index == len(SHAPES) - 1:
            frame('Wait until the machine is idle', 600)

    if sequential:
        frame('Click to start the sequence', 1000)
        for index, path in enumerate(SHAPES):
            draw_on_screen(path, index)
            plot(path, index)
    else:
        frame('Prepare the drawing', 400)
        for index, path in enumerate(SHAPES): draw_on_screen(path, index)
        frame('Click to plot the complete drawing', 1000)
        for index, path in enumerate(SHAPES): plot(path, index)
    move(HOME, 'Return home after the last object')
    # Keep both loops the same length for the comparison.
    frame('Complete', 1600 if sequential else 2400)
    images, durations = zip(*frames)
    target = OUT / name
    images[0].save(target, save_all=True, append_images=images[1:], duration=durations, loop=0, optimize=False, disposal=2)
    print(f'{target.name}: {len(frames)} frames, {target.stat().st_size} bytes')


if __name__ == '__main__':
    build('workflow-draw-then-plot.gif', False)
    build('workflow-object-by-object.gif', True)
