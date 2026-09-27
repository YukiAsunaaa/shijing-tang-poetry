import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const server = await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
let browser;
try {
  browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),headless:true});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForSelector('.bar-row');
  const exiting = await page.evaluate(() => {
    const oldRow = document.querySelector('.bar-row');
    oldRow.focus();
    document.querySelector('[data-category="plants"]').click();
    oldRow.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    return {tabIndex:oldRow.getAttribute('tabindex'),pointerEvents:oldRow.style.pointerEvents,selection:document.querySelector('#selected-glyph').textContent};
  });
  assert.deepEqual(exiting,{tabIndex:'-1',pointerEvents:'none',selection:'花'});
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.bar-row').count(),12);
  assert.deepEqual(errors,[]);
  console.log('Transition regression passed: exiting rows cannot change the new category selection.');
} finally {
  await browser?.close();
  await server.close();
}
