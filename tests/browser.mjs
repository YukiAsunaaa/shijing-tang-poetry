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
  assert.equal(await page.locator('.scene-art').count(),5);assert.equal(new Set(await page.locator('.scene-art').evaluateAll(images=>images.map(image=>image.currentSrc))).size,5);
  assert.equal(await page.locator('.bar-row').count(),4);
  await page.screenshot({path:`.review/${name}.png`,fullPage:true});
  for(const category of ['plants','landscape','sky','colors','seasons']){
    await page.locator(`[data-category="${category}"]`).click();
    if(category==='plants'){
      await page.waitForTimeout(350);
      const visibleScenes=await page.locator('.scene-art').evaluateAll(images=>images.filter(image=>Number.parseFloat(getComputedStyle(image).opacity)>.02).length);
      assert.ok(visibleScenes>=2,`scene crossfade ${name}`);
      await page.waitForTimeout(650);
    }else await page.waitForTimeout(1000);
    assert.ok(await page.locator(`[data-scene="${category}"]`).evaluate(image=>Number.parseFloat(getComputedStyle(image).opacity)>.1&&image.complete&&image.naturalWidth>100));
    assert.equal(await page.locator('.world').getAttribute('data-world'),category);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${name} ${category}`);
    const first=page.locator('.bar-row').first();await first.focus();await page.keyboard.press('Enter');
    assert.ok((await page.locator('#quote mark').count())>0);
    if(category==='plants'||category==='sky') await page.screenshot({path:`.review/${name}-${category}.png`,fullPage:true});
  }
  const rapidOpacity=[];
  for(const category of ['plants','landscape','sky','colors']){
    await page.locator(`[data-category="${category}"]`).click();
    for(let sample=0;sample<3;sample++){
      await page.waitForTimeout(32);
      rapidOpacity.push(await page.locator('.scene-art').evaluateAll(images=>images.reduce((sum,image)=>sum+Number.parseFloat(getComputedStyle(image).opacity),0)));
    }
  }
  assert.ok(Math.min(...rapidOpacity)>.1,`rapid scene continuity ${name}`);
  await page.waitForTimeout(1000);
  await page.locator('[data-metric="poems"]').click();await page.locator('#sort').selectOption('asc');await page.waitForTimeout(750);
  const values=await page.locator('.value').allTextContents();assert.ok(values.every(t=>!Number.isNaN(Number(t.replaceAll(',','')))));
  await page.locator('#expand-poem').click();assert.equal(await page.locator('#poem-full').isVisible(),true);
  const before=await page.locator('#poem-source').textContent();await page.locator('#next-poem').click();assert.notEqual(await page.locator('#poem-source').textContent(),before);
  const download=page.waitForEvent('download');await page.locator('#download').click();assert.ok((await download).suggestedFilename().endsWith('.csv'));
  await page.waitForFunction(()=>!document.querySelector('#toast')?.classList.contains('visible'));
  await page.locator('#motion').click();assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>document.getAnimations().some(animation=>animation.playState==='running')),false);
  const a=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(120);const b=await page.locator('canvas').evaluate(c=>c.toDataURL());assert.equal(a,b);
  await page.locator('#motion').click();await page.waitForTimeout(120);const c=await page.locator('canvas').evaluate(c=>c.toDataURL());assert.notEqual(a,c);
  await page.locator('#method summary').click();assert.ok(await page.locator('#method-text').isVisible());
  await page.locator('[data-view="emotion"]').click();await page.waitForSelector('.radar-shape');await page.waitForTimeout(700);
  assert.ok(await page.locator('#poet-list button').count()>100);
  await page.locator('.emotion-rank').first().evaluate(element=>element.dataset.persistence='kept');
  await page.locator('#poet-search').fill('李白');await page.locator('#poet-list button').first().click();
  assert.equal(await page.locator('#emotion-poet').textContent(),'李白');assert.equal(await page.locator('.emotion-rank').count(),6);
  assert.equal(await page.locator('.emotion-rank').first().getAttribute('data-persistence'),'kept');
  await page.locator('.radar-node').nth(1).click();assert.match(await page.locator('#emotion-quote').textContent(),/李白/);
  await page.waitForTimeout(850);
  await page.screenshot({path:`.review/${name}-emotion.png`,fullPage:true});
  await page.locator('[data-view="cluster"]').click();await page.waitForSelector('.poet-point');await page.waitForTimeout(700);
  assert.ok(await page.locator('.poet-point').count()>100);await page.locator('#cluster-search').fill('杜甫');
  assert.equal(await page.locator('#cluster-poet').textContent(),'杜甫');
  await page.screenshot({path:`.review/${name}-cluster.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  report.push({name,width,passed:true});await page.close();
}
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:5173/');await page.waitForSelector('.bar-row');
assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('motion-paused')),true);
await page.close();
const failed=await browser.newPage();await failed.route('**/data/poetry.json',r=>r.abort());await failed.goto('http://127.0.0.1:5173/');await failed.waitForSelector('#retry');await failed.unroute('**/data/poetry.json');await failed.locator('#retry').click();await failed.waitForSelector('.bar-row');
await browser.close();await writeFile('.review/browser-report.json',JSON.stringify(report,null,2));console.log('Passed desktop/mobile category, charts, poems, download, motion, reduced-motion, load recovery, overflow and runtime checks.');
