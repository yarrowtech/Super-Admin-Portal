// Isolated production UI test. All API calls are fixtures; no production writes.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict'), puppeteer = require('puppeteer');
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
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage(), errors = [], requests = []; let fail = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => localStorage.setItem('sap_token', 'fixture-token'));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return url.origin === origin || url.protocol === 'data:' ? request.continue() : request.abort();
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id, x-client-source, x-project-id', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      let data = { items: [] };
      if (url.pathname === '/api/auth/me') data = { user: { _id: 'fixture-user', name: 'Media Head', role: 'media_head', portalAccess: ['media'] } };
      else if (url.pathname === '/api/dept/media/head/assets') {
        if (fail) return request.respond({ status: 500, headers, body: JSON.stringify({ success: false, error: 'Fixture failure' }) });
        requests.push(Object.fromEntries(url.searchParams));
        const selectedUser = url.searchParams.get('userId');
        data = {
          projects: [{ id: 'project-1', name: 'YARROWTECH' }, { id: 'project-2', name: 'Better Pass' }],
          contributors: [
            { id: 'user-1', name: 'Alice Creator', role: 'media_marketing', active: true, recordCount: 1, allocatedProjects: [{ id: 'project-1', name: 'YARROWTECH' }] },
            { id: 'user-2', name: 'Idle User', role: 'media_marketing', active: true, recordCount: 0, allocatedProjects: [] }
          ],
          items: selectedUser === 'user-2' ? [] : [{ _id: 'asset-1', title: 'Company Logo', section: 'asset', projectId: 'project-1', projectName: 'YARROWTECH', creatorName: 'Alice Creator', updatedBy: 'head', updatedByName: 'Head Editor', approvalStatus: 'approved', creatorCurrentlyAllocated: true, storageUrl: 'https://example.invalid/logo.png' }],
          pagination: { page: 1, totalPages: 1, total: selectedUser === 'user-2' ? 0 : 1 }
        };
      }
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/media/head/assets`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Company Logo'));
    const text = await page.$eval('body', body => body.innerText);
    assert.ok(text.includes('Digital Asset Management') && text.includes('Alice Creator') && text.includes('Head Editor'));
    await page.click('summary');
    assert.ok((await page.$eval('body', body => body.innerText)).includes('No projects allocated'));
    assert.ok(text.includes('Pending review') && text.includes('Missing files'));
    assert.ok(await page.$('a[href="/media/head/approvals"]'));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Missing files')).click());
    await page.waitForNetworkIdle();
    assert.ok(requests.some(request => request.attention === 'missing-file'));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Clear attention filter')).click());
    assert.equal(await page.$eval('a[href="https://example.invalid/logo.png"]', link => link.target), '_blank');
    await page.select('select[aria-label="Project"]', 'project-1');
    await page.waitForNetworkIdle();
    await page.select('select[aria-label="Contributor"]', 'user-2');
    await page.waitForFunction(() => document.body.innerText.includes('No creative work matches these filters.'));
    assert.ok(requests.some(request => request.projectId === 'project-1' && request.userId === 'user-2'));
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    fail = true;
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Refresh').click());
    await page.waitForFunction(() => document.querySelector('[role="alert"]'), { timeout: 20000 });
    console.log(JSON.stringify({ passed: true, checks: ['Head assets navigation', 'creator and editor attribution', 'allocated and unassigned users', 'project and contributor filters', 'file link', 'mobile width', 'visible API error', 'no runtime errors'] }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
