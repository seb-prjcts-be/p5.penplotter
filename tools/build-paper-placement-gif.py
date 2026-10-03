"""Draw paper placement at 320 x 240, enlarged with hard pixels."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
OUT=Path(__file__).resolve().parents[1]/'docs/images/animations/paper-placement.gif'
font=ImageFont.load_default(size=10)
palette=[0,0,0,85,255,255,255,85,255,255,255,255,255,85,85]+[0]*(768-15)
frames=[]
for tick in range(4):
 im=Image.new('P',(320,240),0); im.putpalette(palette); d=ImageDraw.Draw(im)
 # Physical bed at 1 pixel / 4 mm: 432 across, 594 along the rails.
 d.rectangle((184,32,291,180),fill=3)
 d.rectangle((184,32,288,180),outline=1)
 for x in (178,181,295,298): d.line((x,29,x,187),fill=1)
 d.rectangle((175,180,301,187),outline=1)
 # 400 x 250 canvas, width 80 mm: 80 along X, 50 across Y.
 d.rectangle((187,158,199,177),fill=2)
 d.line((193,161,193,175),fill=0)
 d.rectangle((181,176,188,189),fill=0,outline=2)
 d.line((181,181,187,187),fill=4 if tick%2==0 else 3)
 d.line((181,187,187,181),fill=4 if tick%2==0 else 3)
 d.line((310,178,310,40),fill=1); d.line((310,40,307,46),fill=1); d.line((310,40,313,46),fill=1)
 d.text((301,22),'X',font=font,fill=1)
 d.line((191,205,283,205),fill=1); d.line((283,205,277,202),fill=1); d.line((283,205,277,208),fill=1)
 d.text((237,211),'Y',font=font,fill=1)
 for y,label,color in [(35,'Paper: A2',1),(73,'Drawing: 80 mm',2),(111,'x: 12   y: 12',2),(149,'Start: 0,0',4)]:
  d.text((12,y),label,font=font,fill=color)
 d.line((105,45,166,45,184,55),fill=1)
 d.line((125,88,158,88,193,158),fill=2)
 d.line((116,161,152,161,181,183),fill=4)
 frames.append(im.resize((640,480),Image.Resampling.NEAREST))
frames[0].save(OUT,save_all=True,append_images=frames[1:],duration=700,loop=0,optimize=False,disposal=2)
