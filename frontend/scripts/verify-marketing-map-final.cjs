const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const puppeteer = require('../../backend/node_modules/puppeteer');

const idFor = (number) => number.toString(16).padStart(24, '0');
const points = Array.from({ length: 308 }, (_, index) => ({
  location: `Delhi Sector ${index + 1}`, state: 'Delhi',
  latitude: 28.61 + (index % 22) * .004, longitude: 77.2 + Math.floor(index / 22) * .004,
  records: 2, schools: 2, campaigns: 0,
}));
const recordFor = (sector, order = 1) => ({
  id: idFor(sector * 10 + order), school: `Sector ${sector} School ${order}`, location: `Sector ${sector}, Delhi`,
  city: `Delhi Sector ${sector}`, state: 'Delhi', ...Object.fromEntries(['latitude', 'longitude'].map((key) => [key, points[sector - 1]?.[key]])),
  projectName: 'ECE-B2B', department: '', status: 'Mapped', mapped: true, email: 'fixture@example.test', sourceFile: 'smoke-fixture.csv',
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    let failPoints = false;
    let emptyPoints = false;
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('sap_token', 'isolated-map-fixture'));
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return request.continue();
      let data = {};
      let status = 200;
      if (url.pathname === '/api/auth/me') data = { user: { _id: 'fixture', role: 'ceo', name: 'Map Verification' } };
      else if (url.pathname.endsWith('/projects')) data = [{ id: idFor(1), name: 'ECE-B2B', code: 'ECE_B2B' }, { id: idFor(2), name: 'Second project' }];
      else if (url.pathname.endsWith('/import/points')) {
        if (request.method() !== 'OPTIONS') await delay(180);
        status = failPoints ? 503 : 200;
        data = { points: emptyPoints ? [] : url.searchParams.get('projectId') === idFor(2) ? points.slice(0, 23) : points, total: emptyPoints ? 0 : 1000, unresolved: emptyPoints ? 0 : 384, schools: 616 };
      } else if (url.pathname.endsWith('/import/records')) {
        const sector = Number(url.searchParams.get('city')?.match(/\d+/)?.[0]) || 1;
        if (request.method() !== 'OPTIONS') await delay(sector === 1 ? 450 : 80);
        data = { items: [recordFor(sector), recordFor(sector, 2)], pagination: { page: Number(url.searchParams.get('page')) || 1, totalPages: 2, total: 4 } };
      } else if (/\/import\/records\/[^/]+$/.test(url.pathname)) {
        const number = parseInt(url.pathname.split('/').at(-1), 16);
        data = recordFor(Math.floor(number / 10), number % 10);
      } else if (url.pathname.endsWith('/import/search')) {
        const search = url.searchParams.get('search') || '';
        data = { items: points.flatMap((_, index) => [recordFor(index + 1)]).filter((row) => `${row.school} ${row.city}`.toLowerCase().includes(search.toLowerCase())).slice(0, 12) };
      } else if (url.pathname.endsWith('/import/unmapped')) data = { items: [{ id: idFor(9999), school: 'Lost School', location: 'Atlantis', projectName: 'ECE-B2B', mapped: false, status: 'Unmapped', missingLocationReason: 'Location could not be resolved to coordinates' }], pagination: { page: 1, totalPages: 1, total: 384 } };
      else if (url.pathname.endsWith('/marketing-analytics')) data = { map: { points: [] }, facets: { channels: ['Email'], statuses: ['Active'] } };
      try { await request.respond({ status: request.method() === 'OPTIONS' ? 200 : status, contentType: 'application/json', headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization, x-request-id, x-client-source, x-project-id' }, body: JSON.stringify(status === 200 ? { data } : { error: 'Fixture: locations unavailable' }) }); } catch { /* A superseded request may have been aborted. */ }
    });
    const state = () => page.evaluate(() => window.history.state?.usr?.marketingMap);
    const settled = async () => {
      await page.waitForFunction(() => !document.querySelector('.map-loading') && document.querySelector('.map-experience')?.dataset.interaction !== 'focusing');
      await delay(1200);
    };
    const clickPin = async (sector) => {
      await page.evaluate((key) => {
        const pin = [...document.querySelectorAll('.marketing-pin-wrap')].find((el) => el.dataset.location === key);
        if (!pin) throw new Error(`Missing pin ${key}`);
        pin.click();
      }, `Delhi Sector ${sector}|Delhi`);
      await page.waitForFunction((sector) => document.querySelector('.map-detail-header h2')?.textContent === `Delhi Sector ${sector}`, {}, sector);
    };

    await page.goto('http://localhost:5173/ceo/marketing-map', { waitUntil: 'networkidle2' });
    await settled();
    await page.waitForSelector('.marketing-cluster');
    assert.equal(await page.$eval('.marketing-cluster', (el) => el.textContent.trim()), '308');
    assert.equal(await page.$eval('[aria-label="Back"]', (el) => el.disabled), true);
    const overview = await state();
    await page.click('.marketing-cluster');
    await settled();
    assert.equal((await page.$$('.marketing-pin-wrap')).length, 308);
    assert.equal((await state()).index, 1);
    await clickPin(154);
    await settled();
    await page.waitForFunction(() => document.querySelector('.map-detail-body')?.textContent.includes('Sector 154 School 1'));
    const firstLocation = await state();
    assert.equal(firstLocation.index, 2);
    await clickPin(155);
    await settled();
    const secondLocation = await state();
    assert.equal(secondLocation.index, 3);
    assert.equal((await page.$$('.map-detail-panel')).length, 1);
    assert.equal((await page.$$('.marketing-pin.is-selected')).length, 1);

    await page.click('[aria-label="Back"]');
    await settled();
    assert.equal((await state()).snapshot.selection.key, firstLocation.snapshot.selection.key);
    assert.ok(Math.abs((await state()).snapshot.viewport.latitude - firstLocation.snapshot.viewport.latitude) < .00001);
    assert.equal((await state()).index, 2);
    await page.click('[aria-label="Forward"]');
    await settled();
    assert.equal((await state()).snapshot.selection.key, secondLocation.snapshot.selection.key);
    assert.equal((await state()).index, 3);
    await page.goBack(); await settled();
    assert.equal((await state()).index, 2);
    await page.goForward(); await settled();
    assert.equal((await state()).index, 3);
    assert.equal((await state()).snapshot.viewport.zoom, secondLocation.snapshot.viewport.zoom);

    await page.click('[aria-label="View Sector 155 School 1"]');
    await page.waitForSelector('.map-record-detail');
    assert.equal((await state()).snapshot.recordId, idFor(1551));
    assert.equal((await state()).index, 4);
    await page.reload({ waitUntil: 'networkidle2' }); await settled();
    await page.waitForSelector('.map-record-detail');
    assert.ok(await page.$eval('.map-record-detail', (el) => el.textContent.includes('Sector 155 School 1')));
    await page.goBack(); await settled();
    assert.equal((await state()).snapshot.recordId, null);
    await page.goForward(); await settled();
    assert.equal((await state()).snapshot.recordId, idFor(1551));
    await page.screenshot({ path: path.join(os.tmpdir(), 'marketing-map-final-desktop.png') });

    await page.click('[aria-label="Search"]');
    await page.type('[aria-label="Search location, school, record"]', 'Sector 154 School');
    await page.waitForSelector('.map-search-results button');
    await page.click('.map-search-results button');
    await settled();
    assert.equal((await state()).snapshot.selection.key, 'Delhi Sector 154|Delhi');
    await page.click('[aria-label="Open filters"]');
    await page.waitForSelector('.map-filter-fields');
    assert.ok(await page.$eval('.map-popover', (el) => el.getBoundingClientRect().width <= 380));
    await page.click('[aria-label="Close filters"]');
    await page.click('[aria-label="Toggle layers"]');
    await page.waitForSelector('.map-layer-list');
    await page.click('.map-layer-list input');
    await settled();
    assert.equal((await state()).snapshot.layers.locations, false);
    await page.click('[aria-label="Back"]'); await settled();
    assert.equal((await state()).snapshot.layers.locations, true);
    assert.equal((await page.$$('.map-popover:not(.is-closing)')).length, 0);

    await page.click('[aria-label="Close location details"]');
    await page.waitForSelector('.map-detail-panel.is-closing');
    await delay(400);
    assert.equal((await page.$$('.map-detail-panel')).length, 0);
    await page.click('[aria-label="Select project"]');
    await page.waitForSelector('.map-project-options');
    await page.evaluate(() => [...document.querySelectorAll('.map-project-options button')].find((el) => el.textContent.includes('Second project')).click());
    await page.waitForSelector('.map-loading');
    await settled();
    assert.equal((await state()).snapshot.filters.projectId, idFor(2));
    await page.click('[aria-label="Back"]'); await settled();
    assert.equal((await state()).snapshot.filters.projectId, 'all');
    await page.click('[aria-label="Forward"]'); await settled();
    assert.equal((await state()).snapshot.filters.projectId, idFor(2));

    await page.click('.map-unmapped-button');
    await page.waitForSelector('[role="dialog"][aria-label="Records without location"]');
    await page.waitForFunction(() => document.querySelector('.map-unmapped-content')?.textContent.includes('Lost School'));
    await page.keyboard.press('Escape');
    await delay(400);
    assert.equal((await page.$$('.map-unmapped-overlay')).length, 0);

    for (const width of [1440, 768, 390, 320]) {
      await page.setViewport({ width, height: 844 });
      await delay(400);
      await page.click('.marketing-cluster'); await settled();
      const rect = await page.$eval('.map-detail-panel', (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
      assert.ok(rect.left >= 0 && rect.right <= width && rect.bottom <= 844);
      assert.ok(await page.$$eval('.map-toolbar .map-icon-button', (els) => els.every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
      await page.screenshot({ path: path.join(os.tmpdir(), `marketing-map-final-${width}.png`) });
      await page.click('[aria-label="Close location details"]'); await delay(400);
      await page.click('[aria-label="Fit all locations"]'); await settled();
    }

    await page.setViewport({ width: 1440, height: 900 });
    await page.click('.marketing-cluster'); await settled();
    const beforeRapid = (await state()).index;
    await clickPin(1); await clickPin(2); await clickPin(3);
    await settled();
    await page.waitForFunction(() => document.querySelector('.map-detail-body')?.textContent.includes('Sector 3 School 1'));
    assert.equal((await state()).snapshot.selection.key, 'Delhi Sector 3|Delhi');
    assert.equal((await state()).index, beforeRapid + 3);
    assert.equal((await page.$$('.map-detail-panel')).length, 1);
    assert.equal((await page.$$('.marketing-pin.is-selected')).length, 1);
    assert.ok(!await page.$eval('.map-detail-body', (el) => el.textContent.includes('Sector 1 School')));
    await page.click('[aria-label="Toggle fullscreen"]');
    await delay(400);
    assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
    await page.click('[aria-label="Open filters"]'); await page.waitForSelector('.map-filter-fields');
    await page.click('[aria-label="Close filters"]');
    await page.click('[aria-label="Toggle fullscreen"]'); await delay(400);

    failPoints = true;
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.map-status[role="alert"]');
    failPoints = false;
    await page.click('.map-status button'); await settled();
    assert.equal((await page.$$('.map-status[role="alert"]')).length, 0);
    emptyPoints = true;
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('.map-status')?.textContent.includes('No mapped locations found'));
    assert.deepEqual(errors, []);
    console.log('Marketing Map A-P browser flows passed (fixtures), including history, refresh, fullscreen, rapid selection, error/empty, and 320/390/768/1440px layouts.');
    console.log(`Screenshots: ${os.tmpdir()}/marketing-map-final-*.png`);
    assert.equal(overview.index, 0);
  } catch (error) {
    const pages = await browser.pages();
    const last = pages.at(-1);
    console.error('Browser failure:', last.url(), await last.$eval('body', (el) => el.innerText.slice(0, 1400)));
    await last.screenshot({ path: path.join(os.tmpdir(), 'marketing-map-final-failure.png') });
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
