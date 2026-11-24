import bpy, math, json, sys, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
OUT = sys.argv[sys.argv.index('--')+1]; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'
try:
    p = bpy.context.preferences.addons['cycles'].preferences; p.compute_device_type = 'METAL'; p.get_devices()
    for d in p.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print('cpu', e)
sc.cycles.samples = 200; sc.cycles.use_denoising = True
sc.render.film_transparent = True; sc.render.resolution_x = 1000; sc.render.resolution_y = 1250
sc.view_settings.view_transform = 'Standard'

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    return tuple((x/12.92) if x <= .04045 else ((x+.055)/1.055)**2.4 for x in c)
def mat(n, col, metal=0, rough=.4, coat=0, emit=None, trans=0):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = .05
    if emit: b.inputs['Emission Color'].default_value = (*emit[0], 1); b.inputs['Emission Strength'].default_value = emit[1]
    if trans: b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = 1.45
    return m
M = dict(pink=mat('pink', srgb('#ff3fae'), rough=.28, coat=.9), yellow=mat('yellow', srgb('#fde900'), rough=.3, coat=.6),
         chrome=mat('chrome', (.93,.93,.95), metal=1, rough=.07), red=mat('red', srgb('#e11d2e'), rough=.25, coat=.8),
         dark=mat('dark', (.015,.012,.03), rough=.5), ink=mat('ink', srgb('#10082e'), rough=.35, coat=.5),
         bulb=mat('bulb', srgb('#fff2b0'), rough=.2, emit=(srgb('#ffd65a'), 9)),
         paper=mat('paper', srgb('#fefce3'), rough=.7), paperedge=mat('paperedge', srgb('#5c0fdb'), rough=.6),
         glass=mat('glass', (1,1,1), rough=.03, trans=1), violet=mat('violet', srgb('#5c0fdb'), rough=.3, coat=.6))

def box(n, size, loc, m, bev=.1, seg=5):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object; o.name = n
    o.scale = [s/2 for s in size]; bpy.ops.object.transform_apply(scale=True)
    if bev: b = o.modifiers.new('b', 'BEVEL'); b.width = bev; b.segments = seg; b.limit_method = 'ANGLE'
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def cyl(n, r, h, loc, m, rot=(0,0,0), v=64, bev=.03):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=v, location=loc, rotation=rot); o = bpy.context.object; o.name = n
    if bev: b = o.modifiers.new('b', 'BEVEL'); b.width = bev; b.segments = 3; b.limit_method = 'ANGLE'
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def sph(n, r, loc, m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=48, ring_count=24); o = bpy.context.object; o.name = n
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def txt(n, body, loc, size, m, ext=.06, rot=(math.radians(90),0,0)):
    bpy.ops.object.text_add(location=loc, rotation=rot); o = bpy.context.object; o.name = n
    o.data.body = body; o.data.size = size; o.data.extrude = ext; o.data.bevel_depth = .012
    o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'; o.data.space_character = 1.1
    for f in ('/System/Library/Fonts/Supplemental/Arial Black.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'):
        if os.path.exists(f): o.data.font = bpy.data.fonts.load(f); break
    o.data.materials.append(m); return o
def emp(n, loc):
    o = bpy.data.objects.new(n, None); o.location = loc; sc.collection.objects.link(o); return o

W, D, H = 5.0, 3.0, 5.6
fy = -D/2  # front face y
# body, plinth and chrome bands
body = box('body', (W, D, H), (0, 0, .5 + H/2), M['pink'], .38, 8)
bpy.ops.mesh.primitive_cube_add(location=(0, -D/2 + .6, 3.95)); cut = bpy.context.object; cut.scale = (3.15/2, 1.4/2, 1.65/2)
cut.hide_render = True; cut.display_type = 'WIRE'
bo = body.modifiers.new('win', 'BOOLEAN'); bo.object = cut; bo.operation = 'DIFFERENCE'
body.modifiers.move(1, 0)
box('plinth', (W+.5, D+.5, .55), (0, 0, .28), M['ink'], .16)
for z in (1.05, 5.5):
    box(f'band{z}', (W+.08, D+.08, .14), (0, 0, z), M['chrome'], .06)
# marquee with bulbs and lettering
box('marquee', (W+.5, 1.5, 1.75), (0, -.5, .5 + H + .85), M['yellow'], .22, 6)
box('marquee_face', (W-.2, .1, 1.05), (0, -1.27, .5 + H + .85), M['ink'], .08)
txt('tickets', 'TICKETS', (0, -1.33, .5 + H + .82), .78, M['yellow'], ext=.05)
mz0, mz1, mx = .5 + H + .1, .5 + H + 1.6, (W+.5)/2 - .2
n = 11
for i in range(n):
    x = -mx + i * (2*mx)/(n-1)
    sph(f'bt{i}', .13, (x, -1.28, mz1 - .02), M['bulb']); sph(f'bb{i}', .13, (x, -1.28, mz0 + .02), M['bulb'])
for j in range(3):
    z = mz0 + .4 + j * .35
    sph(f'bl{j}', .13, (-mx - .02, -1.28, z), M['bulb']); sph(f'br{j}', .13, (mx + .02, -1.28, z), M['bulb'])
# window with a ticket roll behind glass
for nm, sz, lc in (('wt', (3.4, .18, .16), (0, fy - .04, 4.83)), ('wb', (3.4, .18, .16), (0, fy - .04, 3.07)),
                   ('wl', (.16, .18, 1.9), (-1.62, fy - .04, 3.95)), ('wr', (.16, .18, 1.9), (1.62, fy - .04, 3.95))):
    box(nm, sz, lc, M['chrome'], .05)
box('win_back', (3.3, .1, 1.8), (0, fy + 1.32, 3.95), M['violet'], .02)
cyl('roll', .62, 2.5, (0, fy + .55, 3.95), M['paper'], rot=(0, math.radians(90), 0))
for x in (-1.26, 1.26): cyl(f'rolledge{x}', .63, .06, (x, fy + .55, 3.95), M['paperedge'], rot=(0, math.radians(90), 0), bev=.01)
cyl('core', .22, 2.62, (0, fy + .55, 3.95), M['chrome'], rot=(0, math.radians(90), 0))
box('glass', (3.15, .04, 1.65), (0, fy - .03, 3.95), M['glass'], .02)
# red push button and label plate
cyl('btn_ring', .5, .16, (-1.25, fy - .06, 2.35), M['chrome'], rot=(math.radians(90), 0, 0))
cyl('btn', .38, .3, (-1.25, fy - .2, 2.35), M['red'], rot=(math.radians(90), 0, 0), bev=.1)
txt('press', 'PRESS', (-1.25, fy - .02, 1.72), .24, M['ink'], ext=.02)
box('plate', (1.9, .08, .7), (1.05, fy - .03, 2.35), M['chrome'], .08)
txt('admit', 'ADMIT ONE', (1.05, fy - .09, 2.35), .25, M['ink'], ext=.02)
# ticket slot with chrome bezel
box('slot_bezel', (3.6, .16, .5), (0, fy - .04, 1.5), M['chrome'], .1)
box('slot', (3.2, .3, .12), (0, fy - .05, 1.5), M['dark'], .03)
# side crank
cyl('crank_hub', .32, .2, (W/2 + .1, 0, 3.4), M['chrome'], rot=(0, math.radians(90), 0))
box('crank_arm', (.12, .16, 1.1), (W/2 + .22, 0, 2.95), M['chrome'], .05)
cyl('crank_knob', .16, .5, (W/2 + .42, 0, 2.45), M['red'], rot=(0, math.radians(90), 0), bev=.06)
# slot reference points
for nme, x in (('slot_l', -1.6), ('slot_c', 0), ('slot_r', 1.6)): emp(nme, (x, fy - .05, 1.5))

bpy.ops.mesh.primitive_plane_add(size=80); fl = bpy.context.object; fl.is_shadow_catcher = True
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .5, .8, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = .45
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt); tgt.location = (0, 0, 3.6)
def area(nm, loc, e, s, col=(1,1,1)):
    bpy.ops.object.light_add(type='AREA', location=loc); l = bpy.context.object; l.data.energy = e; l.data.size = s; l.data.color = col
    c = l.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
area('key', (-7, -10, 11), 2600, 7, (1, .95, .9)); area('rim', (8, 7, 9), 1800, 6, (.7, .65, 1)); area('fill', (9, -10, 3), 700, 7, (1, .85, .95))
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 10.2
cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam; cam.location = (3.2, -14, 6.2)
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
bpy.context.view_layer.update()
sc.render.filepath = os.path.join(OUT, 'machine.png'); bpy.ops.render.render(write_still=True)
R = sc.render
pts = {}
for nme in ('slot_l', 'slot_c', 'slot_r'):
    v = world_to_camera_view(sc, cam, bpy.data.objects[nme].matrix_world.translation)
    pts[nme] = [round(v[0] * R.resolution_x, 1), round((1 - v[1]) * R.resolution_y, 1)]
json.dump(pts, open(os.path.join(OUT, 'machine.json'), 'w')); print('DONE', pts)
