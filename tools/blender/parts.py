import bpy, bmesh, math, json, sys, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
OUT = sys.argv[sys.argv.index('--')+1]
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print('gpu fallback', e)
sc.cycles.samples = 160; sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 1000
sc.view_settings.view_transform = 'Standard'

def mat(name, color, metal=0.0, rough=0.4, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = .08
    return m
def srgb(h): 
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple((x/12.92) if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c)

M = dict(
  black=mat('black', srgb('#151515'), rough=.35, coat=.6),
  yellow=mat('yellow', srgb('#fde900'), rough=.35, coat=.5),
  steel=mat('steel', (.8,.8,.82), metal=1, rough=.22),
  chrome=mat('chrome', (.92,.92,.94), metal=1, rough=.08),
  brass=mat('brass', srgb('#d4a73c'), metal=1, rough=.25),
  white=mat('white', (.92,.92,.9), rough=.5),
  bakelite=mat('bakelite', srgb('#c7262f'), rough=.3, coat=.7),
  green=mat('green', srgb('#1f8a4c'), rough=.45),
  dark=mat('dark', (.02,.02,.02), rough=.6),
)

def box(name, size, loc, m, bevel=.1, seg=4):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object; o.name = name
    o.scale = (size[0]/2, size[1]/2, size[2]/2); bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new('bv','BEVEL'); bv.width = bevel; bv.segments = seg; bv.limit_method='ANGLE'
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def cyl(name, r, h, loc, m, verts=48, rot=(0,0,0), bevel=.02):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=rot); o = bpy.context.object; o.name=name
    if bevel:
        bv = o.modifiers.new('bv','BEVEL'); bv.width = bevel; bv.segments = 3; bv.limit_method='ANGLE'
    o.data.materials.append(m)
    if verts > 8: bpy.ops.object.shade_smooth()
    return o
def sphere(name, r, loc, m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=48, ring_count=24); o=bpy.context.object; o.name=name
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def text(name, body, loc, rot, size, m, ext=.008):
    bpy.ops.object.text_add(location=loc, rotation=rot); o = bpy.context.object; o.name=name
    o.data.body = body; o.data.size = size; o.data.extrude = ext; o.data.align_x='CENTER'; o.data.align_y='CENTER'
    o.data.materials.append(m); return o
def empty(name, loc):
    o = bpy.data.objects.new(name, None); o.location = loc; sc.collection.objects.link(o); return o
def group(name, objs):
    col = bpy.data.collections.new(name); sc.collection.children.link(col)
    for o in objs:
        for c in o.users_collection: c.objects.unlink(o)
        col.objects.link(o)
    return col

# ---------- 9V battery ----------
W, D, H = 2.65, 1.75, 4.85
bat = [
  box('bat_body', (W, D, 3.25), (0,0,1.625), M['black'], .14),
  box('bat_band', (W+.006, D+.006, 1.35), (0,0,3.25+.62), M['yellow'], .14),
  box('bat_top', (W-.08, D-.08, .32), (0,0,4.55+.1), M['steel'], .1),
  cyl('bat_pos', .29, .34, (-.62,0,4.92), M['steel']),
  sphere('bat_pos_knob', .24, (-.62,0,5.06), M['steel']),
  cyl('bat_neg', .44, .32, (.62,0,4.92), M['steel'], verts=6, bevel=.03),
  cyl('bat_neg_in', .27, .33, (.62,0,4.935), M['dark'], verts=32, bevel=0),
  text('bat_9v', '9V', (0,-D/2-.012,1.55), (math.radians(90),0,0), 1.25, M['white']),
  text('bat_plus', '+', (-.62,-D/2-.012,4.0), (math.radians(90),0,0), .8, M['black']),
  text('bat_minus', '–', (.62,-D/2-.012,4.02), (math.radians(90),0,0), .8, M['black']),
  text('bat_word', 'TINKER CELL', (0,-D/2-.012,2.8), (math.radians(90),0,0), .3, M['yellow']),
]
tb = {'+': empty('t_bat_pos', (-.62,0,5.2)), '-': empty('t_bat_neg', (.62,0,5.1))}
group('battery', bat + list(tb.values()))

# ---------- toggle switch on a bakelite base ----------
def make_switch(tag, angle):
    o = [
      box(f'sw_base_{tag}', (6.2, 3.0, 1.1), (0,0,.55), M['bakelite'], .22, 6),
      cyl(f'sw_nut_{tag}', .78, .26, (0,0,1.23), M['chrome'], verts=6, bevel=.04),
      cyl(f'sw_bush_{tag}', .5, .75, (0,0,1.62), M['chrome']),
      cyl(f'sw_pivot_{tag}', .34, .2, (0,0,2.05), M['chrome']),
    ]
    a = math.radians(angle); L = 2.3
    tip = Vector((math.sin(a)*L, 0, 2.05 + math.cos(a)*L))
    mid = Vector((math.sin(a)*L/2, 0, 2.05 + math.cos(a)*L/2))
    bpy.ops.mesh.primitive_cone_add(radius1=.2, radius2=.13, depth=L, vertices=48, location=mid, rotation=(0, a, 0))
    lev = bpy.context.object; lev.name=f'sw_lever_{tag}'; lev.data.materials.append(M['chrome']); bpy.ops.object.shade_smooth(); o.append(lev)
    o.append(sphere(f'sw_ball_{tag}', .22, tip, M['chrome']))
    for side, x in (('l', -2.35), ('r', 2.35)):
        o.append(cyl(f'sw_wash_{side}_{tag}', .48, .08, (x,0,1.14), M['steel'], bevel=.01))
        o.append(cyl(f'sw_screw_{side}_{tag}', .36, .22, (x,0,1.26), M['brass']))
    o.append(text(f'sw_off_{tag}', 'OFF', (-1.25,-.85,1.105), (0,0,0), .42, M['white']))
    o.append(text(f'sw_on_{tag}', 'ON', (1.25,-.85,1.105), (0,0,0), .42, M['white']))
    e = [empty(f't_sw_l_{tag}', (-2.35,0,1.4)), empty(f't_sw_r_{tag}', (2.35,0,1.4))]
    return group(f'switch_{tag}', o + e)
make_switch('off', -32); make_switch('on', 32)

# ---------- 2-way screw terminal block (for the fairy lights) ----------
blk = [ box('blk_body', (2.2, 1.7, 1.5), (0,0,.75), M['green'], .08) ]
for i, x in enumerate((-.52, .52)):
    blk.append(cyl(f'blk_screw_{i}', .3, .12, (x,.15,1.52), M['steel']))
    blk.append(box(f'blk_hole_{i}', (.5,.06,.42), (x,-.86,.55), M['dark'], .03))
blk_t = [empty('t_blk', (-.52,-.9,.55)), empty('t_blk2', (.52,-.9,.55))]
group('block', blk + blk_t)

# ---------- stage: shadow catcher, lights, camera ----------
bpy.ops.mesh.primitive_plane_add(size=60, location=(0,0,0)); floor = bpy.context.object; floor.is_shadow_catcher = True
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.55,.5,.75,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .4
def area(name, loc, energy, size, color=(1,1,1)):
    bpy.ops.object.light_add(type='AREA', location=loc); l = bpy.context.object; l.name=name
    l.data.energy = energy; l.data.size = size; l.data.color = color
    c = l.constraints.new('TRACK_TO'); c.target = floor; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
area('key', (-6,-8,10), 1700, 6, (1,.96,.9)); area('rim', (7,6,7), 1400, 5, (.75,.7,1)); area('fill', (8,-9,3), 500, 6, (1,.85,.95))

cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
target = bpy.data.objects.new('target', None); sc.collection.objects.link(target)
tc = cam.constraints.new('TRACK_TO'); tc.target = target; tc.track_axis='TRACK_NEGATIVE_Z'; tc.up_axis='UP_Y'

shots = {
  'battery': dict(col='battery', cam=(3.5,-10,7.5), target=(0,0,2.5), scale=7.0, terms={'pos':'t_bat_pos','neg':'t_bat_neg'}),
  'switch-off': dict(col='switch_off', cam=(2.5,-10,9), target=(0,0,1.6), scale=8.2, terms={'l':'t_sw_l_off','r':'t_sw_r_off'}),
  'switch-on': dict(col='switch_on', cam=(2.5,-10,9), target=(0,0,1.6), scale=8.2, terms={'l':'t_sw_l_on','r':'t_sw_r_on'}),
  'block': dict(col='block', cam=(3,-10,7), target=(0,0,.75), scale=3.6, terms={'in':'t_blk','in2':'t_blk2'}),
}
cols = {c.name: c for c in bpy.data.collections}
info = {}
for name, s in shots.items():
    for cn, c in cols.items(): c.hide_render = (cn != s['col'])
    cam.location = s['cam']; target.location = s['target']; cam_data.ortho_scale = s['scale']
    bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    R = sc.render.resolution_x
    info[name] = {k: [round(world_to_camera_view(sc, cam, bpy.data.objects[e].matrix_world.translation)[0]*R, 1),
                      round((1-world_to_camera_view(sc, cam, bpy.data.objects[e].matrix_world.translation)[1])*R, 1)] for k, e in s['terms'].items()}
json.dump(info, open(os.path.join(OUT,'terminals.json'),'w'), indent=1)
print('DONE', info)
