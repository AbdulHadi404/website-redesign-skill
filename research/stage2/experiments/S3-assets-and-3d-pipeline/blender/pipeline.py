"""Headless Blender (bpy from PyPI) glTF export lab.

Builds a small procedural scene and exports it several ways, to check what each exporter setting really writes:
  copies vs linked duplicates vs EXT_mesh_gpu_instancing; baked AO through the 'glTF Material Output' group;
  baked lighting as an unlit (KHR_materials_unlit) material; LODs with a Decimate modifier; Draco; WebP/JPEG images;
  a camera with an animated orbit and a keyed object.

  python blender/pipeline.py <out_dir>        (python = a venv with `pip install bpy==4.5.14`, Python 3.11)

Writes <out_dir>/*.glb and <out_dir>/blender.json (export times, bake times, what was written).
"""
import bpy, sys, os, json, time, math

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/s2-S3/build/blender'
os.makedirs(OUT, exist_ok=True)
log = {'blender': bpy.app.version_string, 'exports': {}, 'bakes': {}}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, 120
    return sc


def material(name, rgb, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


def build_product():
    """Plinth + sphere + torus joined into one object: contact creases that ambient occlusion can darken."""
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.25)); plinth = bpy.context.object; plinth.scale = (1.2, 1.2, 0.25)
    bpy.ops.object.transform_apply(scale=True)
    bev = plinth.modifiers.new('bevel', 'BEVEL'); bev.width = 0.06; bev.segments = 4
    bpy.ops.object.modifier_apply(modifier='bevel')
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, segments=64, ring_count=32, location=(0, 0, 1.15))
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.75, minor_radius=0.12, location=(0, 0, 0.62), major_segments=96, minor_segments=24)
    bpy.ops.object.shade_smooth()
    for o in bpy.data.objects: o.select_set(o.type == 'MESH')
    bpy.context.view_layer.objects.active = plinth
    bpy.ops.object.join()
    p = bpy.context.object; p.name = 'Product'
    p.data.materials.clear(); p.data.materials.append(material('ProductMat', (0.8, 0.52, 0.32), 0.45))
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    return p


def build_cups(linked, parent_empty):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.18, depth=0.3, location=(0, 0, 0))
    cup = bpy.context.object; cup.name = 'Cup'
    bpy.ops.object.shade_smooth()
    cup.data.materials.append(material('CupMat', (0.2, 0.35, 0.75), 0.3))
    cups = [cup]
    for i in range(1, 24):
        c = cup.copy()
        if not linked: c.data = cup.data.copy()
        bpy.context.collection.objects.link(c)
        cups.append(c)
    for i, c in enumerate(cups):
        c.location = (-3 + (i % 6) * 0.5, 2 + (i // 6) * 0.5, 0.15)
        if parent_empty: c.parent = parent_empty
    return cups


def camera_rig(sc):
    bpy.ops.object.empty_add(location=(0, 0, 0.8)); pivot = bpy.context.object; pivot.name = 'CameraPivot'
    bpy.ops.object.camera_add(location=(0, -6, 2.2)); cam = bpy.context.object; cam.parent = pivot
    cam.rotation_euler = (math.radians(78), 0, 0)
    sc.camera = cam
    pivot.rotation_euler = (0, 0, 0); pivot.keyframe_insert('rotation_euler', frame=1)
    pivot.rotation_euler = (0, 0, 2 * math.pi); pivot.keyframe_insert('rotation_euler', frame=121)
    for fc in pivot.animation_data.action.fcurves if hasattr(pivot.animation_data.action, 'fcurves') else []:
        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
    bpy.ops.object.light_add(type='SUN', location=(3, -3, 6)); bpy.context.object.data.energy = 3
    return cam


def export(name, **kw):
    path = os.path.join(OUT, f'{name}.glb')
    opts = dict(filepath=path, export_format='GLB', export_apply=True, export_cameras=False, export_lights=False,
                export_animations=False, export_image_format='AUTO', export_yup=True)
    opts.update(kw)
    t0 = time.time()
    bpy.ops.export_scene.gltf(**opts)
    log['exports'][name] = {'ms': round((time.time() - t0) * 1000), 'bytes': os.path.getsize(path),
                            'settings': {k: v for k, v in kw.items()}}
    return path


def add_ao_bake(obj, size=1024, samples=32):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    img = bpy.data.images.new('ProductAO', size, size, alpha=False)
    mat = obj.data.materials[0]; nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.name = 'AO'
    for n in nt.nodes: n.select = False
    tex.select = True; nt.nodes.active = tex
    for o in bpy.data.objects: o.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    t0 = time.time()
    bpy.ops.object.bake(type='AO', margin=8)
    log['bakes']['ao'] = {'ms': round((time.time() - t0) * 1000), 'size': size, 'samples': samples}
    img.filepath_raw = os.path.join(OUT, 'product_ao.png'); img.file_format = 'PNG'; img.save()
    # The exporter writes occlusionTexture from an image wired to 'Occlusion' on a group named 'glTF Material Output'.
    from io_scene_gltf2.blender.com.material_helpers import create_settings_group, get_gltf_node_name
    grp = bpy.data.node_groups.get(get_gltf_node_name()) or create_settings_group(get_gltf_node_name())
    gnode = nt.nodes.new('ShaderNodeGroup'); gnode.node_tree = grp
    nt.links.new(tex.outputs['Color'], gnode.inputs['Occlusion'])
    return img


def bake_lighting_to_unlit(obj, size=1024, samples=32):
    """Bake full lighting (diffuse direct + indirect with colour) and export as an unlit material: the cheapest
    runtime shading there is, at the cost of static light and no specular response."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples
    img = bpy.data.images.new('ProductLit', size, size, alpha=False)
    mat = obj.data.materials[0]; nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    for n in nt.nodes: n.select = False
    tex.select = True; nt.nodes.active = tex
    for o in bpy.data.objects: o.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    t0 = time.time()
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT', 'COLOR'}, margin=8)
    log['bakes']['lighting'] = {'ms': round((time.time() - t0) * 1000), 'size': size, 'samples': samples}
    img.filepath_raw = os.path.join(OUT, 'product_lit.png'); img.file_format = 'PNG'; img.save()
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    nt.links.new(tex.outputs['Color'], out.inputs['Surface'])  # colour straight into the output → KHR_materials_unlit


# ---------- 1. instancing: copies vs linked duplicates vs EXT_mesh_gpu_instancing ----------
for mode in ['copies', 'linked', 'gpu-instances']:
    sc = reset()
    parent = None
    if mode == 'gpu-instances':
        bpy.ops.object.empty_add(location=(0, 0, 0)); parent = bpy.context.object; parent.name = 'Cups'
    build_cups(linked=(mode != 'copies'), parent_empty=parent)
    export(f'cups-{mode}', export_gpu_instances=(mode == 'gpu-instances'))

# ---------- 2. product: plain, LODs, Draco, baked AO, baked lighting (unlit), camera + animation ----------
sc = reset()
p = build_product()
world = bpy.data.worlds.new('World'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); ground = bpy.context.object; ground.name = 'Ground'
ground.data.materials.append(material('GroundMat', (0.85, 0.84, 0.8), 0.9))
cam = camera_rig(sc)
for o in bpy.data.objects: o.select_set(o.name == 'Product')
export('product-plain', use_selection=True)
for ratio in [0.5, 0.2]:
    d = p.modifiers.new('lod', 'DECIMATE'); d.ratio = ratio
    export(f'product-lod-{int(ratio * 100)}', use_selection=True)
    p.modifiers.remove(d)
export('product-draco', use_selection=True, export_draco_mesh_compression_enable=True)
add_ao_bake(p)
for o in bpy.data.objects: o.select_set(o.name == 'Product')
export('product-ao-png', use_selection=True, export_image_format='AUTO')
export('product-ao-webp', use_selection=True, export_image_format='WEBP', export_image_quality=85)
export('product-ao-jpeg', use_selection=True, export_image_format='JPEG', export_image_quality=85)
# the whole scene with camera, light and the animated orbit
for o in bpy.data.objects: o.select_set(False)
export('scene-camera-anim', export_cameras=True, export_lights=True, export_animations=True, export_optimize_animation_size=True)
bake_lighting_to_unlit(p)
for o in bpy.data.objects: o.select_set(o.name == 'Product')
export('product-baked-unlit', use_selection=True, export_image_format='WEBP', export_image_quality=85)

with open(os.path.join(OUT, 'blender.json'), 'w') as f:
    json.dump(log, f, indent=1)
print(json.dumps(log))
