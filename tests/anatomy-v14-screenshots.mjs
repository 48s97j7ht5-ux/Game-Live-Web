import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.ANATOMY_V14_URL||'http://127.0.0.1:4173/character/anatomy-regression-v14.html';
const out='anatomy-test-output/v14-anatomy';await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[{name:'front',pos:[0,1.15,4.7]},{name:'side',pos:[4.7,1.15,0]},{name:'back',pos:[0,1.15,-4.7]},{name:'threequarter',pos:[3.2,1.35,3.2]}];
for(const view of views){
 const page=await browser.newPage({viewport:{width:900,height:1100},deviceScaleFactor:1});await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__ANATOMY_V14_READY__===true);
 await page.evaluate(({pos})=>{const c=window.__SKELETON_CAMERA__;if(c){c.position.set(...pos);c.lookAt(0,.9,0)}},{pos:view.pos});
 const poses=await page.evaluate(()=>window.anatomyV14.poses);
 for(const pose of poses){const diag=await page.evaluate(p=>window.anatomyV14.setPose(p),pose);await page.screenshot({path:`${out}/${pose}-${view.name}.png`,fullPage:false});await fs.appendFile(`${out}/diagnostics.ndjson`,JSON.stringify({...diag,view:view.name})+'\n')}
 await page.close();
}
await browser.close();console.log('v1.4 full anatomy regression captured');
