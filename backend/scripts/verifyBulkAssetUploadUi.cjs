// Production-bundle browser check with intercepted fixture APIs; no real uploads or writes.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');
(async () => {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  const server = http.createServer((req, res) => {
    let file = path.resolve(dist, `.${new URL(req.url, 'http://localhost').pathname}`);
    if (!file.startsWith(`${dist}${path.sep}`)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`, projectId = '6a86f878c07bde7ef985eb4f';
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    const errors = [], assets = []; let uploads = 0, creationAttempts = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(id => { localStorage.setItem('sap_token', 'fixture-token'); localStorage.setItem('activeProjectId', id); }, projectId);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return url.origin === origin || url.protocol === 'data:' ? request.continue() : request.abort();
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id, x-client-source, x-project-id', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      let data = { items: [] };
      if (url.pathname === '/api/auth/me') data = { user: { _id: 'fixture-user', name: 'Fixture Media', role: 'media_marketing', portalAccess: ['media'] } };
      else if (url.pathname.endsWith('/projects')) data = { items: [{ _id: projectId, name: 'EEC-B2B', projectCode: 'EEC_B2B' }] };
      else if (url.pathname.endsWith('/upload')) { uploads++; assert.equal(url.searchParams.get('projectId'), projectId); data = { url: `https://fixture.invalid/file-${uploads}`, storageKey: `file-${uploads}`, storageProvider: 'cloudinary', mimeType: 'image/png', fileSizeBytes: 5 }; }
      else if (['/assets', '/content', '/brand-assets', '/design', '/video', '/social'].some(endpoint => url.pathname.endsWith(endpoint)) && request.method() === 'POST') {
        const payload = JSON.parse(request.postData()); assert.equal(payload.projectId, projectId); creationAttempts++;
        if (creationAttempts === 2) return request.respond({ status: 400, headers, body: JSON.stringify({ success: false, error: 'Fixture creation failed' }) });
        data = { ...payload, _id: `asset-${creationAttempts}`, status: 'Pending', createdAt: new Date().toISOString() }; assets.push(data);
      } else if (url.pathname.endsWith('/assets')) data = { items: assets };
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/media/dashboard/assets`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim().endsWith('Bulk upload') && !b.disabled));
    await page.$$eval('button', buttons => buttons.find(b => b.textContent.trim().endsWith('Bulk upload')).click());
    await page.waitForSelector('[aria-label="Files for bulk upload"]');
    await page.$eval('[aria-label="Files for bulk upload"]', input => {
      const transfer = new DataTransfer(); transfer.items.add(new File(['first'], 'first.png', { type: 'image/png', lastModified: 1 })); transfer.items.add(new File(['brief'], 'second.pdf', { type: 'application/pdf', lastModified: 1 }));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForSelector('[aria-label="Title for second.pdf"]');
    await page.$$eval('[role=dialog] button', buttons => buttons.find(b => b.textContent === 'Upload 2 files').click());
    await page.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent.includes('Fixture creation failed'));
    assert.equal(uploads, 2); assert.equal(assets.length, 1);
    await page.$$eval('[role=dialog] button', buttons => buttons.find(b => b.textContent === 'Retry unfinished files').click());
    await page.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent.includes('2 of 2 records created'));
    assert.equal(uploads, 2); assert.equal(assets.length, 2); assert.equal(creationAttempts, 3);
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.$$eval('[role=dialog] button', buttons => buttons.find(b => b.textContent === 'Done').click());
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
    for (const [section, moduleType] of [['assets', 'asset'], ['brand', 'brand'], ['content', 'content'], ['design', 'design'], ['video', 'video'], ['social', 'social']]) {
      await page.goto(`${origin}/media/dashboard/${section}`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim().endsWith('Bulk upload') && !b.disabled));
      await page.$$eval('button', buttons => buttons.find(b => /Create (asset|brand asset|content|design item|video item|social post)$/.test(b.textContent.trim())).click());
      await page.waitForSelector('input[type=file]');
      assert.equal(await page.$eval('input[type=file]', input => input.multiple), true, 'Create form must allow multiple selection');
      await page.$eval('input[type=file]', input => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(['one'], 'one.png', { type: 'image/png' }));
        transfer.items.add(new File(['two'], 'two.png', { type: 'image/png' }));
        input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForSelector('[aria-label="Title for two.png"]');
      const before = assets.length;
      await page.$$eval('[role=dialog] button', buttons => buttons.find(b => b.textContent === 'Upload 2 files').click());
      await page.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent.includes('2 of 2 records created'));
      assert.equal(assets.length, before + 2);
      assert.ok(assets.slice(before).every(asset => asset.moduleType === moduleType && asset.section === moduleType));
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['bulk upload in all six creative sections', 'multiple file selection', 'project scope', 'partial failure', 'retry without repeat upload', 'mobile width', 'close after completion', 'no runtime errors'] }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
