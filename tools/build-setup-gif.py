"""Build the low-resolution CGA setup animation with Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/images/animations/setup-plotter.gif'
PALETTE = [0,0,0, 85,255,255, 255,85,255, 255,255,255,
           255,85,85, 170,0,0] + [0] * (768 - 18)
frames = []
# One machine at 320 x 240. Bed scale: one pixel per four millimetres.
# Physical bed: 432 across, 594 along the rails; rounding error < 1 pixel.
for tick in range(8):
    im = Image.new('P', (320,240), 0)
    im.putpalette(PALETTE)
    d = ImageDraw.Draw(im)
    d.rectangle((92,12,224,220), outline=1)
    d.rectangle((106,20,213,168), fill=3)
    for x in (96,100,219,223):
        d.line((x,15,x,205), fill=1)
    # H gantry, parked at the lower end of the rails.
    d.rectangle((90,167,226,176), fill=0, outline=1)
    d.line((94,171,222,171), fill=3)
    for x in range(95,223,5):
        d.point((x,174),fill=2)
    for x in (94,218):
        d.rectangle((x,165,x+8,179),fill=0,outline=2)
    # Pen at the bottom-left bed corner.
    d.rectangle((102,163,111,180),fill=0,outline=2)
    d.rectangle((105,154,108,171),fill=3)
    d.polygon([(105,172),(108,172),(106,176)],fill=2)
    d.line((102,182,110,190),fill=4)
    d.line((102,190,110,182),fill=4)
    # Actual card-sized controller mounted below the gantry, in the frame.
    d.line((108,180,108,205,145,205),fill=2)
    d.rectangle((145,189,174,211),fill=0,outline=1)
    d.rectangle((150,194,157,204),outline=3)
    for y in (195,198,201,204):
        d.point((148,y),fill=1)
        d.point((159,y),fill=1)
    d.rectangle((162,195,166,199),fill=4 if tick%2==0 else 5)
    d.rectangle((155,209,161,214),outline=3)
    d.line((158,214,158,232,177,232),fill=3)
    frames.append(im.resize((640,480),Image.Resampling.NEAREST))
frames[0].save(OUT,save_all=True,append_images=frames[1:],
               duration=500,loop=0,optimize=False,disposal=2)
print(OUT)
