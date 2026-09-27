import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),...(process.env.TEST_PROXY?{proxy:{server:process.env.TEST_PROXY,bypass:'127.0.0.1,localhost'}}:{}),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.TEST_URL||'https://yukiasunaaa.github.io/shijing-tang-poetry/',{waitUntil:'networkidle',timeout:60000});
await page.waitForSelector('.bar-row');
await page.evaluate(()=>document.fonts.ready);
assert.equal(await page.title(),'诗境 · 全唐诗意象图谱');
assert.equal(await page.locator('.bar-row').count(),4);
assert.equal(await page.locator('#quote').textContent(),'春眠不觉晓，处处闻啼鸟。');
assert.ok(await page.locator('.landscape-art').evaluate(img=>img.complete&&img.naturalWidth>100));
for(const id of ['plants','sky','colors','landscape','seasons']){
  await page.locator(`[data-category="${id}"]`).click();
}
await page.waitForTimeout(800);
assert.equal(await page.locator('.bar-row').count(),4);
await page.locator('.bar-row').last().click();
assert.equal(await page.locator('#selected-glyph').textContent(),'冬');
await page.setViewportSize({width:390,height:844});
await page.locator('[data-category="plants"]').click();await page.waitForTimeout(800);
assert.equal(await page.locator('.bar-row').count(),12);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);
console.log('Published HTTPS site verified: assets, fonts, real data, rapid category transitions, term selection, desktop/mobile layout.');
await browser.close();
