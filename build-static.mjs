import {cp,mkdir,readdir,rm} from 'node:fs/promises';
import {extname,join} from 'node:path';

const root=new URL('.',import.meta.url);
const output=new URL('./dist/',root);
const publicExtensions=new Set(['.html','.css','.js','.mp3']);
const excluded=new Set(['worker.js','build-static.mjs']);

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const entry of await readdir(root,{withFileTypes:true})){
  if(entry.isFile()&&publicExtensions.has(extname(entry.name))&&!excluded.has(entry.name)){
    await cp(new URL(entry.name,root),new URL(entry.name,output));
  }
}
for(const directory of ['assets','vendor']){
  await cp(new URL(`${directory}/`,root),new URL(`${directory}/`,output),{recursive:true});
}

console.log(`Prepared static site in ${join(root.pathname,'dist')}`);
