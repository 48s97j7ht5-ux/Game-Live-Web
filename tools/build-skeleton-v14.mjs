import fs from 'node:fs/promises';
const src='character/skeleton-v13.js',dst='character/skeleton-v14.js';
let s=await fs.readFile(src,'utf8');
s=s.replace('/** Skeleton v1.3 — standalone native dynamic anatomical skeleton. */','/** Skeleton v1.4 — standalone anatomical development line. */')
 .replace("export const SKELETON_VERSION='1.3';","export const SKELETON_VERSION='1.4';")
 .replace('Skeleton v1.3: stature rebuild','Skeleton v1.4: stature rebuild')
 .replace('Диагностика v1.3','Диагностика v1.4')
 .replace("title.textContent='Skeleton v1.3'","title.textContent='Skeleton v1.4'")
 .replace('25-joint spine · dynamic shoulder girdles','25-joint spine · thorax-constrained shoulder development')
 .replace("const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.01,100);","const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.01,100);window.__SKELETON_CAMERA__=camera;");
await fs.writeFile(dst,s);
console.log(`generated ${dst} from ${src}`);
