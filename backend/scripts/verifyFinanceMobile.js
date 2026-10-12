'use strict';
// Browser verification of the built finance UI. API responses are explicitly mocked;
// database and authorization behavior are covered separately by the finance HTTP tests.
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const puppeteer = require('puppeteer');

(async () => {
  const app = express();
  const dist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    for (const role of ['finance_manager', 'finance_employee']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 844 });
      await page.evaluateOnNewDocument(() => localStorage.setItem('sap_token', 'mobile-verification-token'));
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) {
          let data = { items: [], rows: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };
          if (url.pathname === '/api/auth/me') data = { user: { _id: '507f1f77bcf86cd799439011', role, firstName: 'Finance', lastName: 'Tester', email: 'finance@example.test', department: 'Finance' } };
          if (url.pathname === '/api/notifications') data = [];
          return request.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return request.abort();
        return request.continue();
      });
      const base = `http://127.0.0.1:${server.address().port}`;
      await page.goto(`${base}/finance/dashboard/invoices`, { waitUntil: 'networkidle0' });
      const openSelector = 'button[aria-label="Open navigation"]';
      await page.waitForSelector(openSelector, { visible: true });
      await page.click(openSelector);
      await page.waitForSelector('[role="dialog"] nav a', { visible: true });
      const navigation = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return { label: dialog.getAttribute('aria-label'), links: [...dialog.querySelectorAll('nav a')].map(a => ({ href: a.getAttribute('href'), label: a.textContent })), overflow: document.body.style.overflow };
      });
      assert.equal(navigation.label, 'Finance Portal navigation');
      assert.equal(navigation.overflow, 'hidden');
      assert.ok(navigation.links.every(link => !link.href.startsWith('/finance/group/')), 'presentation-only groups must not become mobile routes');
      assert.ok(navigation.links.some(link => link.href === '/finance/dashboard/support'));
      assert.ok(navigation.links.some(link => link.label.includes(role === 'finance_manager' ? 'Review Queue' : 'My Submissions')));
      assert.equal(navigation.links.some(link => link.label.includes('Approval Rules')), role === 'finance_manager');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Logout', 'focus wraps to the last drawer control');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close navigation');
      await page.keyboard.press('Escape');
      assert.equal(await page.$('[role="dialog"]'), null);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Open navigation');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      await page.click(openSelector);
      await page.click('[role="dialog"] a[href="/finance/dashboard/payments?status=recorded"]');
      await page.waitForFunction(() => location.pathname.endsWith('/payments') && location.search === '?status=recorded');
      assert.equal(await page.$('[role="dialog"]'), null, 'navigation closes after selecting a route');
      await page.click(openSelector);
      const selected = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] nav a')].filter(a => a.className.includes('text-white')).map(a => a.getAttribute('href')));
      assert.deepEqual(selected, ['/finance/dashboard/payments?status=recorded'], 'only the selected status is highlighted');
      await page.click('[role="dialog"] a[href="/finance/dashboard/payments?status=reconciled"]');
      await page.waitForFunction(() => location.search === '?status=reconciled');
      assert.equal(await page.$('[role="dialog"]'), null, 'same-page filter navigation closes the drawer');
      assert.deepEqual(errors, [], 'no browser runtime errors');
      console.log(`PASS ${role}: mobile routes, role visibility, focus trap, Escape, scroll lock and status navigation`);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
