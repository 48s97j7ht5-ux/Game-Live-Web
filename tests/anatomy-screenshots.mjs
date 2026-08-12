import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.ANATOMY_URL||'https://48s97j7ht5-ux.github.io/Game-Live-Web/character/anatomy-regression-test.html';
const out='anatomy-test-output/latest';await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:900,height:1100},deviceScaleFactor:1});
await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__ANATOMY_READY__===true);
const poses=await page.evaluate(()=>window.anatomyTest.poses);const report=[];
for(const pose of poses){const diag=await page.evaluate(p=>window.anatomyTest.setPose(p),pose);await page.screenshot({path:`${out}/${pose}.png`,fullPage:false});report.push(diag)}
await fs.writeFile(`${out}/diagnostics.json`,JSON.stringify(report,null,2));
await browser.close();console.log(`Captured ${poses.length} anatomy poses to ${out}`);