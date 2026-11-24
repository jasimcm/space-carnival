# Crop the ticket machine render into assets/carnival and print where its ticket slot lands.
import json
from PIL import Image
import numpy as np
def soften(im):
    a=np.asarray(im).copy(); al=a[...,3].astype(float)
    sh = al < 200
    al[sh] = np.where(al[sh] < 40, 0, (al[sh]-40) * .45)
    a[...,3]=al.clip(0,255).astype('uint8'); return Image.fromarray(a)
SITE = '../../assets/carnival/'  # run from tools/blender

# ticket machine: crop and report the slot as fractions of the cropped image
m = Image.open('out/machine.png').convert('RGBA'); mj = json.load(open('out/machine.json'))
b = m.getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
b = (max(0, b[0]-30), max(0, b[1]-20), min(m.width, b[2]+40), min(m.height, b[3]+40))
c = soften(m.crop(b)); c.save(SITE + 'machine.webp', quality=90, method=6)
fx = lambda p: round((p[0]-b[0]) / c.width * 100, 2); fy = lambda p: round((p[1]-b[1]) / c.height * 100, 2)
print('machine', c.size, 'slot left%', fx(mj['slot_l']), 'right%', fx(mj['slot_r']), 'y%', fy(mj['slot_c']))
