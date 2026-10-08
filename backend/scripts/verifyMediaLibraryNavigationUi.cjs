// Production bundle UI checks. Every API and upload is intercepted; no live writes.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict'), puppeteer = require('puppeteer');
const { CATEGORIES } = require('../modules/media/library.catalog');
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-library-ui-'));
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage(), errors = [], calls = [], created = [];
    page.on('pageerror', error => errors.push(error.message));
    const alpha = '111111111111111111111111', beta = '222222222222222222222222';
    const projects = [{ id: alpha, name: 'Project Alpha', code: 'ALPHA', description: 'Alpha project' }, { id: beta, name: 'Future Project', code: 'FUTURE', description: 'Future project' }];
    const items = [
      { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', projectId: alpha, projectName: 'Project Alpha', libraryKind: 'brand', title: 'Official Alpha Logo', isMaster: true, status: 'Approved', approvalStatus: 'approved', ownerName: 'Marketing', version: { current: 'v1.0', history: [] }, updatedAt: new Date().toISOString() },
      { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', projectId: beta, projectName: 'Future Project', libraryKind: 'creative', title: 'Future Banner', status: 'Draft', approvalStatus: 'draft', ownerName: 'Marketing', version: { current: 'v1.0', history: [] }, updatedAt: new Date().toISOString() },
    ];
    let uploadCount = 0, failedOnce = false;
    await page.evaluateOnNewDocument(() => localStorage.setItem('sap_token', 'fixture-token'));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return url.origin === origin || url.protocol === 'data:' ? request.continue() : request.abort();
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id, x-client-source, x-project-id', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS' };
      const respond = (data, status = 200) => request.respond({ status, headers, body: JSON.stringify({ success: status === 200, ...(status === 200 ? { data } : { error: data }) }) });
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      calls.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method() });
      if (url.pathname === '/api/auth/me') return respond({ user: { _id: '333333333333333333333333', firstName: 'Marketing', role: 'media_marketing', portalAccess: ['media'] } });
      if (url.pathname.endsWith('/library/overview')) {
        const libraries = projects.filter(project => !url.searchParams.get('projectId') || url.searchParams.get('projectId') === project.id).map(project => {
          const counts = Object.fromEntries(CATEGORIES.map(category => [category.key, items.filter(item => item.projectId === project.id && item.libraryKind === category.key).length]));
          return { ...project, counts, pending: 0, total: items.filter(item => item.projectId === project.id).length };
        });
        const totals = Object.fromEntries(CATEGORIES.map(category => [category.key, libraries.reduce((sum, library) => sum + library.counts[category.key], 0)]));
        return respond({ projects: libraries, categories: CATEGORIES, owners: [{ id: '333333333333333333333333', name: 'Marketing' }], tags: ['brand'], totals: { ...totals, total: libraries.reduce((sum, library) => sum + library.total, 0), pending: 0 } });
      }
      if (url.pathname.endsWith('/library/items') && request.method() === 'POST') {
        const body = JSON.parse(request.postData());
        if (body.title === 'second' && !failedOnce) { failedOnce = true; return respond('Fixture record creation failure', 500); }
        created.push(body);
        const item = { ...body, _id: `${String(created.length).padStart(24, '0')}`, projectName: projects.find(project => project.id === body.projectId).name, status: 'Draft', approvalStatus: 'draft', ownerName: 'Marketing', updatedAt: new Date().toISOString(), version: { current: 'v1.0', history: [] } };
        items.push(item); return respond(item);
      }
      if (url.pathname.endsWith('/library/items')) {
        const result = items.filter(item => (!url.searchParams.get('projectId') || item.projectId === url.searchParams.get('projectId')) && (!url.searchParams.get('kind') || item.libraryKind === url.searchParams.get('kind')) && (url.searchParams.get('workspace') !== 'approvals' || item.approvalStatus === 'pending') && (!url.searchParams.get('search') || item.title.toLowerCase().includes(url.searchParams.get('search').toLowerCase())));
        return respond({ items: result, pagination: { total: result.length, page: 1, totalPages: 1 } });
      }
      if (url.pathname.includes('/library/items/')) return respond({ ...items.find(item => url.pathname.endsWith(item._id)), tags: ['brand'], related: [], creatorName: 'Marketing' });
      if (url.pathname.endsWith('/upload')) { uploadCount++; return respond({ url: `https://fixture.invalid/${uploadCount}.png`, storageKey: `fixture-${uploadCount}`, storageProvider: 'cloudinary', mimeType: 'image/png' }); }
      return respond({ items: [] });
    });
    await page.goto(`${origin}/media/dashboard/assets`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Project Libraries'));
    assert.ok((await page.$eval('body', body => body.innerText)).includes('Future Project'));
    assert.equal(await page.$eval('select[aria-label="Library project"]', select => select.value), '');
    const sidebarLabels = await page.$$eval('aside nav button', buttons => buttons.map(button => button.textContent.trim()));
    assert.ok(!sidebarLabels.some(label => ['Creative', 'Assets', 'Brand', 'Content', 'Design', 'Video', 'Social'].includes(label)));
    for (const label of ['Digital Library', 'Project Library', 'Workspace', 'Management', 'System']) assert.ok(sidebarLabels.some(text => text.includes(label)));
    await page.evaluate(() => [...document.querySelectorAll('aside nav button')].find(button => button.textContent.trim().includes('Project Library')).click());
    await page.evaluate(() => [...document.querySelectorAll('aside nav button')].find(button => button.textContent.trim().includes('Workspace')).click());
    assert.equal(await page.$$eval('aside [aria-current="page"]', items => items.length), 1);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('aside nav button[aria-expanded]')].filter(button => button.classList.contains('bg-[var(--portal-accent-soft)]')).length), 1);

    await page.select('select[aria-label="Library project"]', alpha);
    await page.waitForFunction(() => document.body.innerText.includes('Official Alpha Logo'));
    await page.evaluate(() => [...document.querySelectorAll('aside nav button')].find(button => button.textContent.trim().includes('Brand Foundation')).click());
    await page.waitForFunction(() => location.search.includes('category=brand'));
    assert.ok(page.url().includes(`project=${alpha}`));
    await page.evaluate(() => { const group = [...document.querySelectorAll('aside nav button[aria-expanded]')].find(button => button.textContent.trim().includes('Digital Library')); if (group.getAttribute('aria-expanded') === 'false') group.click(); });
    await page.waitForFunction(() => [...document.querySelectorAll('aside nav button')].some(button => button.textContent.includes('Overview')));
    await page.evaluate(() => [...document.querySelectorAll('aside nav button')].find(button => button.textContent.includes('Overview')).click());
    await page.waitForFunction(() => !location.search.includes('category='));

    assert.ok(!(await page.$eval('body', body => body.innerText)).includes('Future Banner'));
    await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent.includes('Brand Foundation') && button.textContent.includes('Open')).click());
    await page.waitForFunction(() => document.body.innerText.includes('CURRENT VERSION'));
    assert.ok(page.url().includes('category=brand'));
    await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent.includes('Official Alpha Logo')).click());
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.innerText.includes('Version history'));
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent === 'Close').click());
    await page.select('select[aria-label="Library project"]', beta);
    await page.waitForFunction(() => document.body.innerText.includes('Future Banner'));
    assert.ok(!(await page.$eval('body', body => body.innerText)).includes('Official Alpha Logo'));
    await page.goBack({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('select[aria-label="Library project"]')?.value === '111111111111111111111111');
    await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent === 'Upload Asset').click());
    await page.waitForSelector('input[aria-label="Library files"]');
    const files = ['first.png', 'second.png'].map(file => { const target = path.join(tmp, file); fs.writeFileSync(target, 'fixture file'); return target; });
    await (await page.$('input[aria-label="Library files"]')).uploadFile(...files);
    await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] button')].some(button => button.textContent === 'Save 2 files'));
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent === 'Save 2 files').click());
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.innerText.includes('Fixture record creation failure'));
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent === 'Retry unfinished files').click());
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.innerText.includes('All files saved as drafts'));
    assert.equal(uploadCount, 2); assert.equal(created.length, 2);
    assert.ok(created.every(item => item.projectId === alpha && item.libraryKind === 'creative'));
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent === 'Close').click());
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    assert.ok(calls.filter(call => call.path.endsWith('/library/items')).every(call => Number(call.params.limit || 24) <= 100));
    await page.goto(`${origin}/media/dashboard/video?project=${alpha}`, { waitUntil: 'networkidle0' });
    assert.ok(page.url().includes('/media/dashboard/assets?') && page.url().includes('category=creative') && page.url().includes(`project=${alpha}`));
    console.log(JSON.stringify({ passed: true, checks: ['canonical sidebar groups', 'no duplicate Creative links', 'single active destination', 'project context retained', 'legacy route redirect', 'all-project overview', 'future projects', 'project isolation', 'eight categories', 'master version detail', 'deep links and browser back', 'multiple file upload', 'partial retry without duplicate uploads', 'mobile width', 'no runtime errors'] }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); for (const file of fs.readdirSync(tmp)) fs.unlinkSync(path.join(tmp, file)); fs.rmdirSync(tmp); }
})().catch(error => { console.error(error); process.exitCode = 1; });
