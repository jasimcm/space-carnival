"""Cut the crayon mouse into layers so its arms and legs can move.

Usage (from the repo root):  python3 tools/mouse_parts.py
Reads assets/carnival/mouse.webp and writes assets/carnival/mouse/{body,arm-up,arm-low,leg-l,leg-r}.webp,
each on the full 600x589 canvas so they stack exactly. Prints each part's pivot as a percentage for CSS.
"""
import numpy as np
from PIL import Image, ImageDraw

SRC = 'assets/carnival/mouse.webp'
OUT = 'assets/carnival/mouse/'

# outlines in source pixels, and the joint each part turns around
PARTS = {
    'arm-up':  ([(305, 88), (350, 82), (378, 128), (402, 145), (405, 190), (378, 208), (358, 250),
                 (322, 252), (318, 238), (345, 180), (330, 150), (303, 118)], (337, 246)),
    'arm-low': ([(341, 291), (412, 316), (422, 280), (422, 245), (450, 236), (476, 250), (471, 296),
                 (452, 340), (446, 362), (405, 363), (342, 331)], (347, 312)),
    'leg-l':   ([(286, 397), (346, 397), (352, 468), (372, 500), (373, 541), (318, 547), (271, 545),
                 (284, 468)], (318, 398)),
    'leg-r':   ([(346, 397), (412, 393), (422, 418), (472, 428), (485, 455), (450, 482), (442, 517),
                 (420, 517), (392, 486), (378, 470), (356, 464), (347, 420)], (362, 400)),
}

im = Image.open(SRC).convert('RGBA')
W, H = im.size
src = np.asarray(im).astype(np.float32)
body = src.copy()
hole = np.zeros((H, W), bool)


def mask_of(poly):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.asarray(m) > 127


def yellow(px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    return (r > 200) & (g > 150) & (b < 120) & (r - b > 110)


for name, (poly, (px, py)) in PARTS.items():
    m = mask_of(poly)
    part = np.zeros_like(src)
    part[m] = src[m]
    if name.startswith('arm'):
        # the yellow disk behind the arms stays on the body
        part[yellow(part) & m, 3] = 0
        keep = m & (part[..., 3] > 0)
        hole |= keep
    else:
        # legs sit behind the body, so the body just drops them
        body[m] = 0
    Image.fromarray(part.astype(np.uint8)).save(OUT + name + '.webp', quality=88, method=6)
    print(f'{name}: transform-origin {px / W * 100:.1f}% {py / H * 100:.1f}%')

# behind the arms is mostly the yellow disc (a circle): rebuild it by copying the disc's own crayon
# texture and outline from another angle at the same radius
CX, CY, R_IN, R_OUT = 418.5, 291.9, 80.0, 90.0
yy, xx = np.mgrid[0:H, 0:W]
rad = np.hypot(xx - CX, yy - CY)
ang = np.arctan2(yy - CY, xx - CX)
disc_src = (yellow(src) & (src[..., 3] > 200)) | ((rad > R_IN - 2) & (rad < R_OUT + 3) & (src[..., :3].max(-1) < 90))
todo = hole & (rad < R_OUT + 1)
for k in [3, -3, 4, -4, 5, -5, 2, -2, 6, 1, -1]:
    if not todo.any():
        break
    t = ang[todo] + k * np.pi / 6
    sx = np.clip(np.round(CX + rad[todo] * np.cos(t)).astype(int), 0, W - 1)
    sy = np.clip(np.round(CY + rad[todo] * np.sin(t)).astype(int), 0, H - 1)
    ok = disc_src[sy, sx] & ~hole[sy, sx]
    ty, tx = np.nonzero(todo)
    body[ty[ok], tx[ok]] = src[sy[ok], sx[ok]]
    done = np.zeros_like(todo)
    done[ty[ok], tx[ok]] = True
    todo &= ~done
hole = todo | (hole & (rad >= R_OUT + 1))

# whatever is left (bits of robe and sky): grow the surrounding colours inward (premultiplied, so edges stay soft)
body[hole] = 0
pm = body.copy()
pm[..., :3] *= pm[..., 3:4] / 255
known = ~hole
for _ in range(80):
    if known.all():
        break
    acc = np.zeros_like(pm)
    cnt = np.zeros((H, W), np.float32)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        k = np.roll(np.roll(known, dy, 0), dx, 1)
        v = np.roll(np.roll(pm, dy, 0), dx, 1)
        acc += v * k[..., None]
        cnt += k
    grow = ~known & (cnt > 0)
    pm[grow] = acc[grow] / cnt[grow][:, None]
    known |= grow
a = pm[..., 3:4]
pm[..., :3] = np.where(a > 0, pm[..., :3] * 255 / np.maximum(a, 1e-3), 0)
Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8)).save(OUT + 'body.webp', quality=88, method=6)
print('body written')
