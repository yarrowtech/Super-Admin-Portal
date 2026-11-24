// Local, synthetic UI review. Every business API request is intercepted; no real
// account, database, provider or business record is used. Run with Vite on :4178.
const puppeteer = require('puppeteer');
const fs = require('node:fs');
const path = require('node:path');
const defaults = require('../config/portalAccessPolicy.json');

const base = 'http://127.0.0.1:4178';
const output = path.resolve(__dirname, '../../docs/ui-ux-review');
const cases = [
  ['super_admin', '/admin/super-admin'], ['admin', '/admin/dashboard'], ['ceo', '/ceo/dashboard'],
  ['hr', '/hr/dashboard'], ['it_hr', '/hr/dashboard'], ['it_manager', '/manager/dashboard'],
  ['it_admin', '/it/dashboard'], ['it_employee', '/employee/dashboard'],
  ['finance_manager', '/finance/dashboard'], ['finance_employee', '/finance/dashboard'],
  ['law_head', '/law/dashboard'], ['law_employee', '/law/dashboard'],
  ['media_head', '/media/head/dashboard'], ['media_sales', '/media/sales/dashboard'],
  ['media_marketing', '/media/dashboard'], ['freelancer', '/outsourcing/dashboard'],
];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  const results = [];
  try {
    for (const [role, route] of cases) {
      for (const width of [360, 768, 1440]) {
        const page = await browser.newPage();
        const errors = [];
        const user = { _id: '64b000000000000000000001', id: '64b000000000000000000001', firstName: 'Review', lastName: 'User', email: 'review@example.test', role, permissions: [], metadata: {} };
        await page.setViewport({ width, height: 960, deviceScaleFactor: 1 });
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem('sap_token', 'synthetic-ui-review');
          localStorage.setItem('theme', 'light');
          localStorage.removeItem('activeProjectId');
        });
        page.on('pageerror', error => errors.push(error.message));
        await page.setRequestInterception(true);
        page.on('request', request => {
          const url = new URL(request.url());
          if (url.pathname.startsWith('/api/')) {
            let data = {};
            if (url.pathname.endsWith('/auth/me')) data = { user };
            else if (url.pathname.endsWith('/auth/portal-access')) data = { portalAccess: Object.fromEntries(defaults.super_admin.map(portal => [portal, (defaults[role] || []).includes(portal)])) };
            else if (/\/(projects|notifications|employees|clients|users|sessions|tasks|assets|campaigns|jobs|contracts|payments|time-logs|vendors|departments|tickets|leaves|attendance)$/.test(url.pathname)) data = [];
            else if (/\/(records|task-items\/mine)$/.test(url.pathname)) data = [];
            else if (url.pathname.includes('requirements')) data = { outstanding: [] };
            else if (url.pathname.includes('/workflow/')) data = { workflow: [], stages: [] };
            else if (url.pathname.includes('unread')) data = { count: 0 };
            return request.respond({ status: 200, contentType: 'application/json', headers: {
              'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true',
              'Access-Control-Allow-Headers': 'authorization,content-type,x-request-id,x-client-source,x-project-id',
              'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            }, body: JSON.stringify({ success: true, data }) });
          }
          if (url.origin !== base && !['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return request.abort();
          return request.continue();
        });
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
        const result = await page.evaluate(() => {
          const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const buttons = [...document.querySelectorAll('button')].filter(visible);
          return {
            path: location.pathname,
            title: document.querySelector('h1')?.textContent.trim() || '',
            hasPageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            mobileMenu: buttons.some(button => /open (navigation|menu)/i.test(button.getAttribute('aria-label') || '')),
            pageSearch: buttons.some(button => button.textContent.includes('Find a page')),
            brokenScreen: /We couldn't open this page|UI crashed|Something went wrong|Unexpected Application Error/.test(document.body.innerText),
            errorText: /We couldn't open this page|UI crashed/.test(document.body.innerText) ? document.body.innerText : '',
            headingHeight: document.querySelector('.portal-header h1')?.getBoundingClientRect().height || null,
            headingTop: document.querySelector('h1')?.getBoundingClientRect().top || null,
          };
        });
        if (width === 360) {
          const trigger = await page.$('button[aria-label="Open navigation"], button[aria-label="Open menu"]');
          if (trigger) {
            await trigger.click();
            result.drawerOpened = await page.$('[role="dialog"]') !== null;
            result.drawerLinkCount = await page.$$eval('[role="dialog"] a[href]', links => links.length);
            await page.keyboard.press('Escape');
            result.drawerClosed = await page.$('[role="dialog"]') === null;
          }
        }
        if (width === 1440 && result.pageSearch) {
          const trigger = await page.$('.workspace-navigator-trigger');
          await trigger.click();
          await page.waitForSelector('[data-workspace-search]');
          await page.waitForFunction(() => document.activeElement?.hasAttribute('data-workspace-search'));
          result.searchFocused = true;
          await page.type('[data-workspace-search]', 'no-such-page-review');
          result.searchEmptyState = await page.$eval('[role="dialog"]', el => el.textContent.includes('No matching pages'));
          await page.keyboard.press('Escape');
          result.searchClosed = await page.$('[role="dialog"]') === null;
        }
        const filename = `${role}-${width}.png`;
        await page.screenshot({ path: path.join(output, filename), fullPage: false });
        if (role === 'super_admin') {
          await page.$$eval('nav[aria-label="Super Admin sections"] button', buttons => buttons.find(button => button.textContent.includes('Workspaces'))?.click());
          await page.waitForSelector('#ecosystem-title');
          result.workspaceSection = true;
          await page.screenshot({ path: path.join(output, `super_admin-workspaces-${width}.png`) });
          await page.$$eval('nav[aria-label="Super Admin sections"] button', buttons => buttons.find(button => button.textContent.includes('Overview'))?.click());
        }
        if (width === 1440 && await page.$('.theme-switch')) {
          await page.click('.theme-switch');
          await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
          // Wait for finite theme transitions so screenshots do not capture
          // light backgrounds halfway through changing to dark surfaces.
          await page.evaluate(async () => {
            getComputedStyle(document.body).color;
            await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
          });
          await page.screenshot({ path: path.join(output, `${role}-dark-${width}.png`), fullPage: false });
          result.darkMode = true;
        }
        results.push({ role, width, route, ...result, errors, screenshot: filename });
        console.log(`${role} ${width}: ${result.title || 'NO TITLE'}${result.hasPageOverflow ? ' OVERFLOW' : ''}${errors.length ? ` ${errors.length} errors` : ''}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ mode: 'synthetic API fixtures; visual shell checks only', results }, null, 2));
    const failed = results.filter(result => result.brokenScreen || result.errors.length || result.path !== result.route || result.hasPageOverflow || result.headingHeight > 110 || (result.width === 360 && (!result.mobileMenu || result.headingTop < 64)));
    console.log(`Reviewed ${results.length} role/viewport combinations; ${failed.length} failures.`);
    if (failed.length) { console.log(JSON.stringify(failed.map(({ role, width, errorText, headingHeight }) => ({ role, width, errorText, headingHeight })))); process.exitCode = 1; }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
