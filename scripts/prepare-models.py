"""Blender 4.3: --python scripts/prepare-models.py -- <source-dir> <output-dir>.
Imports author's files; converts Z-up to Y-up, normalizes height, exports indexed
meshes with two levels of detail. No original files are modified.
"""
import bpy,bmesh,sys,os,json,math,gzip,struct,hashlib,runpy
from array import array
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:];src,out=args;os.makedirs(out,exist_ok=True)
models=[('pendant','Подвеска_Шухов_без_колец__v3.stl',42000,6500),('lamp','Модель светильника.fbx',48000,12000)]
table_path=os.path.join(src,'table-web.glb')
if not os.path.isfile(table_path):raise FileNotFoundError('Final table-web.glb is required; do not rebuild the table from the old FBX')
report={}
for kind,filename,high,low in models:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 path=os.path.join(src,filename)
 if kind=='pendant':bpy.ops.wm.stl_import(filepath=path)
 else:bpy.ops.import_scene.fbx(filepath=path)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 original_vertices=sum(len(o.data.vertices) for o in meshes);original_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 # The lamp includes optic cores inside the blue sleeves. The browser uses the
 # enclosing sleeves with a modest emissive material; enclosed cores are culled.
 if kind=='lamp':
  for o in list(meshes):
   if o.data.materials and o.data.materials[0].name=='Custom (7)':meshes.remove(o);bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:
  world=o.matrix_world.copy();o.data=o.data.copy();o.data.transform(world);o.parent=None;o.matrix_world=Matrix.Identity(4);o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 if len(meshes)>1:bpy.ops.object.join()
 o=bpy.context.object
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-5 if kind=='pendant' else 1e-7);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
 coords=[v.co for v in bm.verts];lo=Vector([min(v[i] for v in coords) for i in range(3)]);hi=Vector([max(v[i] for v in coords) for i in range(3)]);height=hi.z-lo.z;center=(lo+hi)/2
 holes=[]
 if kind=='table':
  top=.015;eps=1e-7
  edges=[e for e in bm.edges if all(abs(v.co.z-top)<eps for v in e.verts) and sum(all(abs(v.co.z-top)<eps for v in f.verts) for f in e.link_faces)==1]
  todo=set(v for e in edges for v in e.verts);adj={v:set() for v in todo}
  for e in edges:a,b=e.verts;adj[a].add(b);adj[b].add(a)
  while todo:
   stack=[todo.pop()];vs=[]
   while stack:
    v=stack.pop();vs.append(v)
    for v2 in adj[v]:
     if v2 in todo:todo.remove(v2);stack.append(v2)
   c=sum((v.co for v in vs),Vector())/len(vs)
   if max((v.co-c).length for v in vs)<.005:holes.append([c.x/height,.03,-c.y/height])
  holes.sort(key=lambda p:math.atan2(-p[2]/.5,p[0]/.285))
 # CAD exports contain dense coplanar tessellation. Dissolve only near-planar
 # edges before collapse; material boundaries and holes remain intact.
 bmesh.ops.dissolve_limit(bm,angle_limit=math.radians(.35),verts=bm.verts,edges=bm.edges,delimit={'MATERIAL','SHARP'})
 bm.to_mesh(o.data);bm.free()
 for v in o.data.vertices:v.co=Vector(((v.co.x-center.x)/height,(v.co.y-center.y)/height,(v.co.z-lo.z)/height))
 def decimate(target):
  o.data.calc_loop_triangles();n=len(o.data.loop_triangles)
  if n>target:
   m=o.modifiers.new('Web detail','DECIMATE');m.ratio=target/n;m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name)
 def export(lod,target):
  decimate(target);mesh=o.data
  for p in mesh.polygons:p.use_smooth=True
  mesh.set_sharp_from_angle(angle=math.radians(35));mesh.update();mesh.calc_loop_triangles()
  parts={}
  for tr in mesh.loop_triangles:
   name=mesh.materials[tr.material_index].name if mesh.materials else 'titanium'
   if kind=='pendant':
    c=tr.center;n=tr.normal;rad=Vector((c.x,c.y,0));name='polished' if n.dot(rad)>.0005 else 'titanium'
   bucket=parts.setdefault(name,{'p':[],'n':[],'i':[],'lookup':{}})
   for vi,li in zip(tr.vertices,tr.loops):
    p=mesh.vertices[vi].co;n=mesh.corner_normals[li].vector
    vals=(p.x,p.z,-p.y,n.x,n.z,-n.y);key=tuple(round(x,7) for x in vals)
    ix=bucket['lookup'].get(key)
    if ix is None:ix=len(bucket['p'])//3;bucket['lookup'][key]=ix;bucket['p'].extend(vals[:3]);bucket['n'].extend(vals[3:])
    bucket['i'].append(ix)
  chunks=[];meta=[];offset=0
  for name,b in parts.items():
   entry={'material':name,'vertices':len(b['p'])//3,'indices':len(b['i']),'offset':offset}
   for key,typ in [('p','f'),('n','f'),('i','I')]:
    chunk=array(typ,b[key]).tobytes();chunks.append(chunk);offset+=len(chunk)
   meta.append(entry)
  basename=kind+'-'+lod
  raw=b''.join(chunks)
  with gzip.open(os.path.join(out,basename+'.bin.gz'),'wb',compresslevel=9) as f:f.write(raw)
  doc={'format':1,'name':kind,'level':lod,'height':1,'sourceHeight':height,'parts':meta,'byteLength':offset,'triangles':sum(x['indices']//3 for x in meta),'holes':holes,'dimensions':[(hi.x-lo.x)/height,1,(hi.y-lo.y)/height]}
  with open(os.path.join(out,basename+'.json'),'w') as f:json.dump(doc,f,separators=(',',':'))
  return {'triangles':doc['triangles'],'bytes':os.path.getsize(os.path.join(out,basename+'.bin.gz'))}
 a=export('detail',high);b=export('room',low)
 report[kind]={'source':filename,'sha256':hashlib.sha256(open(path,'rb').read()).hexdigest(),'originalVertices':original_vertices,'originalTriangles':original_triangles,'detail':a,'room':b,'holes':len(holes),'sourceHeight':height}
 print('EXPORTED',kind,report[kind],flush=True)
with open(os.path.join(out,'provenance.json'),'w') as f:json.dump(report,f,indent=2)
sys.argv=['prepare-table.py','--',table_path,out]
runpy.run_path(os.path.join(os.path.dirname(__file__),'prepare-table.py'),run_name='__main__')
