// Isolated browser smoke check against the production bundle, with fixture APIs only.
// No request reaches a real backend and no production records are modified.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const puppeteer = require('puppeteer');
const { stages } = require('../config/marketingStages');

async function main() {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(dist, `.${pathname}`);
    if (!file.startsWith(`${dist}${path.sep}`)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let canUpdate = true;
    let patchCount = 0;
    let record = { id: 'record-a', school: 'Fixture Public School', city: 'New Delhi', state: 'Delhi', location: 'Fixture address, New Delhi', latitude: 28.61, longitude: 77.21, projectId: 'fixture-project', projectName: 'EEC-B2B', mapped: true, sourceFile: 'fixture.csv', marketingStatus: { currentStage: 'MEETING_REQUESTED', version: 2, scheduledAt: null, history: [{ _id: 'event-a', stage: 'EMAIL_SENT', timestamp: '2026-09-10T10:00:00Z', actorName: 'Marketing', source: 'marketing' }, { _id: 'event-b', stage: 'MEETING_REQUESTED', timestamp: '2026-09-16T10:00:00Z', actorName: 'Sales', source: 'sales' }] } };
    await page.evaluateOnNewDocument(() => { localStorage.setItem('sap_token', 'isolated-test-token'); localStorage.setItem('activeProjectId', 'foreign-project'); });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id, x-client-source, x-project-id', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = {};
        if (url.pathname === '/api/auth/me') data = { user: { _id: 'fixture-user', name: 'Fixture CEO', role: 'ceo', portalAccess: ['ceo'] } };
        else if (url.pathname.endsWith('/projects')) data = [{ id: 'fixture-project', name: 'EEC-B2B', code: 'EEC_B2B' }, { id: 'foreign-project', name: 'EdifyEight', code: 'EDIFYEIGHT' }];
        else if (url.pathname.endsWith('/journey')) data = { stages, canUpdate, scope: 'record' };
        else if (url.pathname.endsWith('/marketing-status')) {
          const change = JSON.parse(request.postData());
          assert.equal(change.expectedVersion, record.marketingStatus.version);
          patchCount += 1;
          record = { ...record, marketingStatus: { currentStage: change.stage, version: record.marketingStatus.version + 1, scheduledAt: change.scheduledAt, history: [...record.marketingStatus.history, { _id: `event-${patchCount + 2}`, stage: change.stage, timestamp: '2026-10-08T12:00:00Z', actorName: 'Fixture CEO', source: 'marketing-map', note: change.note, scheduledAt: change.scheduledAt }] } };
          data = record;
        } else if (url.pathname.endsWith('/records/record-a')) data = record;
        else if (url.pathname.endsWith('/points')) {
          const filter = url.searchParams.get('marketingStage');
          const matches = !filter || filter === 'all' || filter.split(',').includes(record.marketingStatus.currentStage);
          data = { total: matches ? 1 : 0, schools: matches ? 1 : 0, unresolved: 0, points: matches ? [{ projectId: record.projectId, location: record.city, state: record.state, latitude: record.latitude, longitude: record.longitude, records: 1, schools: 1, marketingStages: [record.marketingStatus.currentStage] }] : [], pipeline: matches ? [{ stage: record.marketingStatus.currentStage, records: 1 }] : [] };
        } else if (url.pathname.endsWith('/records') || url.pathname.endsWith('/unmapped')) {
          const filter = url.searchParams.get('marketingStage');
          const matches = !filter || filter === 'all' || filter.split(',').includes(record.marketingStatus.currentStage);
          data = { items: matches ? [record] : [], pagination: { page: 1, total: matches ? 1 : 0, totalPages: 1 } };
        } else if (url.pathname.endsWith('/search')) data = { items: [record] };
        else if (url.pathname.endsWith('/analytics')) data = { map: { points: [] }, facets: {} };
        if (url.pathname.includes('/map/') && !url.pathname.endsWith('/projects')) { assert.equal(url.searchParams.get('projectId'), 'fixture-project'); data = { ...data, projectId: 'fixture-project' }; }
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin === origin || url.protocol === 'data:') return request.continue();
      // Tiles, fonts and sockets are irrelevant to the fixture interaction check.
      return request.abort();
    });
    await page.goto(`${origin}/ceo/marketing-map?projectId=foreign-project&record=foreign-record`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => new URL(location.href).searchParams.get('projectId') === 'fixture-project');
    assert.equal(new URL(page.url()).searchParams.get('record'), null);
    assert.ok((await page.$eval('.map-project-trigger', element => element.textContent)).includes('EEC-B2B'));
    assert.ok(!(await page.$eval('body', element => element.innerText)).includes('EdifyEight'));
    await page.locator('.map-project-trigger').click();
    await page.waitForSelector('.map-project-options button');
    assert.equal(await page.$$eval('.map-project-options button', buttons => buttons.length), 1);
    await page.locator('.map-project-options button').click();
    const selectedUrl = `${origin}/ceo/marketing-map?location=New+Delhi%7CDelhi&record=record-a&lat=28.61&lng=77.21&zoom=14&marketingStage=MEETING_REQUESTED`;
    await page.goto(selectedUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.map-marketing-journey');
    assert.equal(await page.$eval('.map-journey-timeline [data-state=current] strong', element => element.textContent), 'Meeting Requested');
    assert.equal(await page.$eval('.map-journey-timeline li:first-child', element => element.dataset.state), 'pending');
    await page.locator('.map-marketing-journey > button').click();
    await page.select('[aria-label="New marketing stage"]', 'MEETING_FIXED');
    await page.$eval('.map-status-editor input[type=date]', element => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '2026-10-20'); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.locator('.map-status-editor button[type=submit]').click();
    await page.waitForFunction(() => document.querySelector('.map-journey-timeline [data-state=current] strong')?.textContent === 'Meeting Fixed');
    await page.waitForFunction(() => document.querySelector('.map-outside-filter'));
    assert.equal(patchCount, 1);
    assert.equal(record.marketingStatus.history.length, 3);
    assert.ok(new URL(page.url()).searchParams.get('record') === 'record-a');
    await page.locator('.map-status-history summary').click();
    assert.equal(await page.$$eval('.map-status-history li', items => items.length), 3);
    await page.locator('.map-toolbar button[aria-label^="Filters"]').click();
    await page.waitForSelector('.map-stage-filters label', { visible: true });
    await page.$$eval('.map-stage-filters label', labels => { labels.find(label => label.textContent.includes('Meeting Requested')).querySelector('input').click(); });
    await page.$$eval('.map-stage-filters label', labels => { labels.find(label => label.textContent.includes('Meeting Fixed')).querySelector('input').click(); });
    await page.$$eval('.map-popover-actions button', buttons => buttons.find(button => button.textContent === 'Apply').click());
    await page.waitForFunction(() => new URL(location.href).searchParams.get('marketingStage') === 'MEETING_FIXED');
    await page.goBack({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.map-marketing-journey');
    assert.equal(await page.$eval('.map-journey-timeline [data-state=current] strong', element => element.textContent), 'Meeting Fixed');
    await page.goForward({ waitUntil: 'networkidle0' });
    assert.equal(new URL(page.url()).searchParams.get('marketingStage'), 'MEETING_FIXED');
    await page.goto(selectedUrl.replace('MEETING_REQUESTED', 'MEETING_FIXED'), { waitUntil: 'networkidle0' });
    await page.waitForSelector('.map-marketing-journey');
    const screenshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketing-journey-ui-'));
    await page.screenshot({ path: path.join(screenshotDir, 'desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(() => { const box = document.querySelector('.map-detail-panel').getBoundingClientRect(); return box.width < 390 && box.top < 450 && box.bottom <= 845; });
    await page.waitForFunction(() => { const panel = document.querySelector('.map-detail-panel').getBoundingClientRect(); const status = document.querySelector('.map-marketing-journey > .map-school-status').getBoundingClientRect(); return status.top >= panel.top && status.bottom < panel.bottom; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(screenshotDir, 'mobile.png') });
    canUpdate = false;
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.map-marketing-journey');
    assert.equal(await page.$('.map-marketing-journey > button'), null);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['EEC-B2B default and stale project recovery', 'EEC-B2B-only selector and API requests', 'record journey', 'no inferred progress', 'save and history', 'filtered-out inspector', 'stage filters', 'browser history', 'refresh', 'mobile width and visible status', 'read-only actions', 'no runtime errors'], screenshots: screenshotDir }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
