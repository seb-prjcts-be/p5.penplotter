"""Build the CGA-style setup illustration with Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/images/animations/setup-plotter.gif'
# CGA cyan/magenta/white, with CGA red for the controller button.
PALETTE = [0, 0, 0, 85, 255, 255, 255, 85, 255, 255, 255, 255,
           255, 85, 85, 170, 0, 0] + [0] * (768 - 18)
try:
    FONT = ImageFont.truetype('C:/Windows/Fonts/courbd.ttf', 16)
except OSError:
    FONT = ImageFont.load_default()

frames = []
for tick in range(8):
    im = Image.new('P', (600, 400), 0)
    im.putpalette(PALETTE)
    d = ImageDraw.Draw(im)
    d.text((24, 18), 'p5.penplotter', font=FONT, fill=3)
    # Portrait machine, seen from the same side as the user's photograph.
    d.rectangle((78, 54, 328, 342), outline=1, width=3)
    d.rectangle((108, 65, 300, 304), fill=3)
    for x in (84, 94, 310, 320):
        d.line((x, 60, x, 326), fill=1, width=2)
    # Horizontal gantry and belt form the H frame.
    d.rectangle((70, 307, 336, 326), fill=0, outline=1, width=2)
    d.line((75, 315, 332, 315), fill=3, width=1)
    for x in range(78, 330, 8):
        d.line((x, 320, x + 3, 320), fill=2)
    for x in (80, 311):
        d.rectangle((x, 306, x + 17, 329), fill=0, outline=2, width=2)
    # Pen carriage stays at the physical starting corner.
    d.rectangle((95, 300, 119, 333), fill=0, outline=2, width=2)
    d.rectangle((103, 283, 111, 322), fill=3, outline=2)
    d.polygon([(103, 322), (111, 322), (107, 330)], fill=2)
    d.line((98, 337, 116, 355), fill=4, width=2)
    d.line((98, 355, 116, 337), fill=4, width=2)
    d.text((130, 342), 'Pen at the start', font=FONT, fill=3)
    # Controller card below/right of the machine, USB and motor cables.
    d.line((330, 318, 369, 318, 369, 191, 405, 191), fill=1, width=2)
    d.rectangle((405, 121, 559, 244), fill=0, outline=1, width=3)
    d.rectangle((418, 139, 449, 181), outline=3, width=2)
    for y in range(142, 180, 6):
        d.line((414, y, 418, y), fill=1)
        d.line((449, y, 453, y), fill=1)
    d.rectangle((461, 203, 497, 233), outline=2, width=2)
    d.line((479, 234, 479, 281, 550, 281), fill=3, width=2)
    d.text((475, 290), 'USB', font=FONT, fill=3)
    d.ellipse((510, 141, 540, 171), fill=4 if tick % 2 == 0 else 5)
    d.text((414, 92), 'Controller', font=FONT, fill=3)
    for x in range(420, 552, 10):
        d.rectangle((x, 187, x + 4, 191), fill=1)
    frames.append(im)
frames[0].save(OUT, save_all=True, append_images=frames[1:],
               duration=500, loop=0, optimize=False, disposal=2)
print(OUT)
