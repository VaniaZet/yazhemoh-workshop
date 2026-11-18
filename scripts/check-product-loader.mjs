import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(specifier,context,next){return next(specifier==='three'?threeURL:specifier,context);}});
const T=await import(threeURL);
const {loadProduct,createProduct}=await import('../dist/product-models.js');
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>new Response(await readFile(new URL(url)));
try{
 for(const level of ['room','detail']){
  const [model,same]=await Promise.all([loadProduct('table',level),loadProduct('table',level)]);
  assert.equal(model,same,'concurrent loads share a template');
  assert.equal(model.children.length,3,'only three authored meshes, no generated cords');
  assert.equal(model.userData.reconstructed,undefined);
  assert.deepEqual(model.children.map(m=>m.material.name).sort(),['paracord','plywoodDark','steel']);
  const table=createProduct('table',1.8,{detail:level==='detail',center:true});
  const bounds=new T.Box3().setFromObject(table);
  assert(Math.abs(bounds.min.y+.9)<.001&&Math.abs(bounds.max.y-.9)<.001,'floor and centered viewing height');
  const clone=createProduct('table',1.8,{detail:level==='detail'});
  assert.equal(table.children[0].children[0].geometry,clone.children[0].children[0].geometry,'shared cached geometry');
  clone.updateMatrixWorld(true);
  const hits=new T.Raycaster(new T.Vector3(.1,3,.1),new T.Vector3(0,-1,0)).intersectObject(clone,true);
  assert(hits.length>0,'authored table remains pickable');
  console.log(`table-${level}: loader, materials, caching, bounds and raycasting passed`);
 }
}finally{globalThis.fetch=originalFetch;}
