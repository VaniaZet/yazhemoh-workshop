import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const root=new URL('../dist/models/',import.meta.url);
for(const kind of ['pendant','lamp','table']){
 for(const level of ['room','detail']){
  const key=kind+'-'+level,meta=JSON.parse(await readFile(new URL(key+'.json',root),'utf8'));
  const raw=gunzipSync(await readFile(new URL(key+'.bin.gz',root)));
  assert.equal(raw.length,meta.byteLength,key+' byte length');
  let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],triangles=0;
  for(const part of meta.parts){
   let offset=part.offset;
   for(let i=0;i<part.vertices*3;i++){const v=raw.readFloatLE(offset+i*4);assert(Number.isFinite(v),key+' finite position');min[i%3]=Math.min(min[i%3],v);max[i%3]=Math.max(max[i%3],v);}
   offset+=part.vertices*12;
   for(let i=0;i<part.vertices;i++){const n=[0,1,2].map(j=>raw.readFloatLE(offset+i*12+j*4));assert(n.every(Number.isFinite));const length=Math.hypot(...n);assert(length>.98&&length<1.02,key+' unit normal');}
   offset+=part.vertices*12;
   for(let i=0;i<part.indices;i++)assert(raw.readUInt32LE(offset+i*4)<part.vertices,key+' valid index');
   triangles+=part.indices/3;
  }
  assert.equal(triangles,meta.triangles);
  assert(Math.abs(min[1])<.01&&Math.abs(max[1]-1)<.01,key+' Y-up, height one');
  for(const j of [0,2])assert(Math.abs(max[j]-min[j]-meta.dimensions[j])<.015,key+' preserved proportions');
  if(kind==='table'){
   assert.equal(meta.geometry,'authored',key+' authored cord geometry');
   assert.deepEqual(meta.parts.map(p=>p.material).sort(),['Center_Metal','Paracord','Plywood_Dark']);
   assert(meta.sourceHeight>.50&&meta.sourceHeight<.51,key+' source in metres');
   assert(Math.abs(meta.dimensions[0]-.334/.5064)<.002,key+' elliptical width');
   assert(Math.abs(meta.dimensions[2]-.524/.5064)<.002,key+' elliptical depth');
   if(level==='detail')assert.equal(meta.triangles,116820,key+' retained final GLB mesh');
   else assert(meta.triangles<=22000,key+' room triangle budget');
  }
  console.log(`${key}: ${triangles} triangles, valid bounds/indices/normals`);
 }
}
