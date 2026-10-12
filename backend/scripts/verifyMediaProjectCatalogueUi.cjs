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
    const page = await browser.newPage(), errors = []; let allocated = false, projectRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => localStorage.setItem('sap_token', 'fixture-token'));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return url.origin === origin || url.protocol === 'data:' ? request.continue() : request.abort();
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id, x-client-source, x-project-id', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      let data = { items: [] };
      if (url.pathname === '/api/auth/me') data = { user: { _id: 'fixture-user', name: 'Media Marketing', role: 'media_marketing', portalAccess: ['media'] } };
      else if (url.pathname === '/api/dept/media/projects') {
        projectRequests++;
        data = { items: allocated ? [{ _id: '6a505ab9a73da902b50f2bf6', name: 'EdifyEight', projectCode: 'EEC' }, { _id: '6a505ab9a73da902b50f2bfc', name: 'Better Pass', projectCode: 'BETTERPASS', accessGranted: false, assigned: false }] : [], pagination: { totalPages: 1 } };
      }
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    allocated = true;
    await page.goto(`${origin}/media/dashboard/projects`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('EdifyEight') && document.body.innerText.includes('Better Pass'));
    assert.ok(projectRequests >= 1);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent.includes('Better Pass')).disabled), true);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent.includes('EdifyEight')).disabled), false);
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['global catalogue visible', 'unallocated project locked', 'allocated project opens', 'mobile width', 'no runtime errors'] }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
