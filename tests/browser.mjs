import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true});
await mkdir('.review',{recursive:true});
const report=[];
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
  await page.waitForSelector('.bar-row');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(900);
  assert.equal(await page.locator('.bar-row').count(),4);
  await page.screenshot({path:`.review/${name}.png`,fullPage:true});
  for(const category of ['plants','landscape','sky','colors','seasons']){
    await page.locator(`[data-category="${category}"]`).click();await page.waitForTimeout(750);
    assert.equal(await page.locator('.world').getAttribute('data-world'),category);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${name} ${category}`);
    const first=page.locator('.bar-row').first();await first.focus();await page.keyboard.press('Enter');
    assert.ok((await page.locator('#quote mark').count())>0);
    if(category==='plants'||category==='sky') await page.screenshot({path:`.review/${name}-${category}.png`,fullPage:true});
  }
  await page.locator('[data-metric="poems"]').click();await page.locator('#sort').selectOption('asc');await page.waitForTimeout(750);
  const values=await page.locator('.value').allTextContents();assert.ok(values.every(t=>!Number.isNaN(Number(t.replaceAll(',','')))));
  await page.locator('#expand-poem').click();assert.equal(await page.locator('#poem-full').isVisible(),true);
  const before=await page.locator('#poem-source').textContent();await page.locator('#next-poem').click();assert.notEqual(await page.locator('#poem-source').textContent(),before);
  const download=page.waitForEvent('download');await page.locator('#download').click();assert.ok((await download).suggestedFilename().endsWith('.csv'));
  await page.locator('#motion').click();assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'true');
  const a=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(120);const b=await page.locator('canvas').evaluate(c=>c.toDataURL());assert.equal(a,b);
  await page.locator('#motion').click();await page.waitForTimeout(120);const c=await page.locator('canvas').evaluate(c=>c.toDataURL());assert.notEqual(a,c);
  await page.locator('summary').click();assert.ok(await page.locator('#method-text').isVisible());
  assert.deepEqual(errors,[]);
  report.push({name,width,passed:true});await page.close();
}
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:5173/');await page.waitForSelector('.bar-row');
assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('motion-paused')),true);
await page.close();
const failed=await browser.newPage();await failed.route('**/data/poetry.json',r=>r.abort());await failed.goto('http://127.0.0.1:5173/');await failed.waitForSelector('#retry');await failed.unroute('**/data/poetry.json');await failed.locator('#retry').click();await failed.waitForSelector('.bar-row');
await browser.close();await writeFile('.review/browser-report.json',JSON.stringify(report,null,2));console.log('Passed desktop/mobile category, charts, poems, download, motion, reduced-motion, load recovery, overflow and runtime checks.');
