"""Blender: --background --python scripts/prepare-table.py -- <table-web.glb> <dist/models>.

Convert the final authored table to the site's existing indexed/gzip format.
The detail mesh is retained; only the room mesh is simplified per component.
"""
import bpy, sys, json, gzip, hashlib, pathlib
from array import array
from mathutils import Vector, Matrix

source, destination = map(pathlib.Path, sys.argv[sys.argv.index('--') + 1:])
destination.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
expected = {'Plywood_Dark', 'Paracord', 'Center_Metal'}
assert {o.name for o in objects} == expected, 'Use the final three-part table-web.glb'
for o in objects:
    world = o.matrix_world.copy()
    o.data = o.data.copy()
    o.data.transform(world)
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
coordinates = [v.co for o in objects for v in o.data.vertices]
lo = Vector([min(v[i] for v in coordinates) for i in range(3)])
hi = Vector([max(v[i] for v in coordinates) for i in range(3)])
height = hi.z - lo.z
assert .50 < height < .51, 'Unexpected table units or vertical axis'
center = (lo + hi) / 2
for o in objects:
    for v in o.data.vertices:
        v.co = Vector(((v.co.x-center.x)/height, (v.co.y-center.y)/height, (v.co.z-lo.z)/height))
    o.data.update()

def export(level):
    chunks, parts, offset = [], [], 0
    for o in sorted(objects, key=lambda item: item.name):
        mesh = o.data
        mesh.calc_loop_triangles()
        positions, normals, indices, lookup = [], [], [], {}
        for triangle in mesh.loop_triangles:
            for vi, li in zip(triangle.vertices, triangle.loops):
                p = mesh.vertices[vi].co
                n = mesh.corner_normals[li].vector.normalized()
                if n.length_squared < 1e-12:
                    n = triangle.normal.normalized()
                if n.length_squared < 1e-12:
                    n = Vector((0, 0, 1))
                values = (p.x, p.z, -p.y, n.x, n.z, -n.y)
                key = tuple(round(v, 7) for v in values)
                index = lookup.get(key)
                if index is None:
                    index = len(positions)//3
                    lookup[key] = index
                    positions.extend(values[:3])
                    normals.extend(values[3:])
                indices.append(index)
        parts.append(dict(material=o.name, vertices=len(positions)//3, indices=len(indices), offset=offset))
        for values, code in [(positions, 'f'), (normals, 'f'), (indices, 'I')]:
            data = array(code, values)
            if sys.byteorder != 'little':
                data.byteswap()
            chunk = data.tobytes()
            chunks.append(chunk)
            offset += len(chunk)
    base = destination / ('table-' + level)
    raw = b''.join(chunks)
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    pathlib.Path(str(base)+'.bin.gz').write_bytes(compressed)
    meta = dict(format=1, name='table', level=level, height=1, sourceHeight=height,
                parts=parts, byteLength=offset, triangles=sum(p['indices']//3 for p in parts),
                dimensions=[(hi.x-lo.x)/height, 1, (hi.y-lo.y)/height],
                geometry='authored', sourceModel='table-web.glb')
    pathlib.Path(str(base)+'.json').write_text(json.dumps(meta, separators=(',', ':')), encoding='utf8')
    return dict(triangles=meta['triangles'], bytes=len(compressed))

original_triangles = sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
detail = export('detail')
for o in objects:
    budget = {'Paracord': 14000, 'Plywood_Dark': 6500, 'Center_Metal': 1000}[o.name]
    triangles = sum(len(p.vertices)-2 for p in o.data.polygons)
    if triangles > budget:
        bpy.context.view_layer.objects.active = o
        modifier = o.modifiers.new('Room detail', 'DECIMATE')
        modifier.ratio = budget / triangles
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
room = export('room')
path = destination / 'provenance.json'
provenance = json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
provenance['table'] = dict(source=source.name, sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                           originalTriangles=original_triangles, detail=detail, room=room,
                           sourceHeight=height, geometry='authored',
                           components=sorted(expected), upstreamSource='стол.obj')
path.write_text(json.dumps(provenance, indent=2, ensure_ascii=False)+'\n', encoding='utf8')
print('TABLE_EXPORTED', json.dumps(provenance['table'], ensure_ascii=False), flush=True)
