const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const results = [];
  const output = path.resolve(__dirname, '../../docs/ui-ux-review');
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage();
    for (const width of [360, 1440]) {
      await page.setViewport({ width, height: 960 });
      await page.goto('http://127.0.0.1:4178/scripts/ui-review.html', { waitUntil: 'networkidle2' });
      await page.waitForSelector('#open-review-dialog');
      const form = await page.evaluate(() => {
        const fields = [...document.querySelectorAll('input:not([type="checkbox"]), select')];
        return fields.map(field => ({ id: field.id, label: !!document.querySelector(`label[for="${CSS.escape(field.id)}"]`), invalid: field.getAttribute('aria-invalid'), description: !!document.getElementById(field.getAttribute('aria-describedby')) }));
      });
      assert.equal(new Set(form.map(field => field.id)).size, form.length);
      assert.ok(form.every(field => field.label && field.description));
      assert.equal(form[0].invalid, 'true');
      await page.focus('tbody tr');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#row-result', el => el.textContent), 'Opened invoice INV-1001');
      await page.click('tbody input[type="checkbox"]');
      assert.equal(await page.$eval('thead input', el => el.indeterminate), true);
      await page.click('#open-review-dialog');
      await page.waitForFunction(() => document.activeElement?.name === 'reference');
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.keyboard.type('INV-REVIEW');
      assert.equal(await page.$eval('input[name="reference"]', el => el.value), 'INV-REVIEW');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.name), 'notes');
      await page.click('#open-nested-dialog');
      await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 2);
      await page.keyboard.press('Escape');
      assert.equal(await page.$$eval('[role="dialog"]', nodes => nodes.length), 1);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.keyboard.press('Escape');
      assert.equal(await page.$('[role="dialog"]'), null);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'open-review-dialog');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      if (width === 360) {
        await page.click('#open-review-filters');
        await page.waitForSelector('[role="dialog"][aria-label="Filters"]');
        await page.keyboard.press('Escape');
        assert.equal(await page.$('[role="dialog"]'), null);
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false);
      await page.screenshot({ path: path.join(output, `shared-components-${width}.png`) });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.screenshot({ path: path.join(output, `shared-components-dark-${width}.png`) });
      results.push({ width, labelsAndErrors: true, uniqueFieldIds: true, rowKeyboardActivation: true, partialSelection: true, modalFocusAndEscape: true, scrollRestored: true, noPageOverflow: true });
    }
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'shared-components-results.json'), JSON.stringify(results, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
