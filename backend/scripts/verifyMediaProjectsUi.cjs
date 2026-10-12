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
    const page = await browser.newPage(), errors = [], pages = [];
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
      else if (url.pathname.endsWith('/head/projects')) {
        const number = Number(url.searchParams.get('page') || 1); pages.push(number);
        data = { items: number === 1 ? [{ _id: 'eec-id', name: 'Global EdifyEight Name', projectCode: 'EEC' }] : [{ _id: 'matebid-id', name: 'MateBid', projectCode: 'MATEBID' }, { _id: 'custom-id', name: 'New Global Initiative', projectCode: 'NEW_GLOBAL' }], pagination: { totalPages: 2, total: 3 } };
      }
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/media/head/projects`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('MateBid') && document.body.innerText.includes('New Global Initiative'));
    assert.ok((await page.$eval('body', body => body.innerText)).includes('Global EdifyEight Name'));
    assert.ok(pages.includes(1) && pages.includes(2));
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['MATEBID visible', 'unknown global projects retained', 'global stored names preserved', 'all catalogue pages fetched', 'mobile width', 'no runtime errors'] }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
