# Crop the Blender renders, place them in the 1000x620 toy viewBox and emit the SVG + terminal coordinates.
import json
from PIL import Image
import numpy as np
def soften(im):
    a=np.asarray(im).copy(); al=a[...,3].astype(float)
    sh = al < 200
    al[sh] = np.where(al[sh] < 40, 0, (al[sh]-40) * .45)
    a[...,3]=al.clip(0,255).astype('uint8'); return Image.fromarray(a)
T = json.load(open('out/terminals.json'))
SITE = '../../assets/carnival/'  # run from tools/blender
# where each part sits in the viewBox: (x, y, width) ; height follows the crop's aspect
PLACE = {'battery': (6, 318, 150), 'switch-off': (150, 250, 240), 'switch-on': (150, 250, 240), 'block': (292, 486, 104)}
crop = {}
# switch on/off share one crop box so they line up exactly
def bbox(n): return Image.open(f'out/{n}.png').getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
b_on, b_off = bbox('switch-on'), bbox('switch-off')
sw = (min(b_on[0], b_off[0]), min(b_on[1], b_off[1]), max(b_on[2], b_off[2]), max(b_on[3], b_off[3]))
geo = {}
for n, (x, y, w) in PLACE.items():
    im = Image.open(f'out/{n}.png').convert('RGBA')
    b = sw if n.startswith('switch') else bbox(n)
    b = (max(0, b[0]-30), max(0, b[1]-20), min(im.width, b[2]+40), min(im.height, b[3]+40))
    c = soften(im.crop(b)); c.save(SITE + f'{n}.webp', quality=90, method=6)
    s = w / c.width; h = c.height * s
    geo[n] = (x, y, w, round(h, 1))
    pts = {k: (round(x + (px - b[0]) * s, 1), round(y + (py - b[1]) * s, 1)) for k, (px, py) in T[n].items()}
    geo[n + ':t'] = pts
    print(n, c.size, geo[n], pts)
json.dump(geo, open('geo.json', 'w'), indent=1)

# ticket machine: crop and report the slot as fractions of the cropped image
m = Image.open('out/machine.png').convert('RGBA'); mj = json.load(open('out/machine.json'))
b = m.getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
b = (max(0, b[0]-30), max(0, b[1]-20), min(m.width, b[2]+40), min(m.height, b[3]+40))
c = soften(m.crop(b)); c.save(SITE + 'machine.webp', quality=90, method=6)
fx = lambda p: round((p[0]-b[0]) / c.width * 100, 2); fy = lambda p: round((p[1]-b[1]) / c.height * 100, 2)
print('machine', c.size, 'slot left%', fx(mj['slot_l']), 'right%', fx(mj['slot_r']), 'y%', fy(mj['slot_c']))
