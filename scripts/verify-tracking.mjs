// Verifies the enquiry form and its two conversion events actually work, in a
// real browser, against a real build. Not "the code looks right" — it drives
// the page and reads window.dataLayer.
//
//   node scripts/verify-tracking.mjs
//
// window.fetch is stubbed during the test, so this never posts to FormSubmit
// and never sends a real email.
//
// Note on focus: element.focus() does NOT dispatch focusin in headless Chrome,
// because document.hasFocus() is false. The form_start check therefore uses a
// real CDP mouse click. Using .focus() here produces a false failure.

import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SITE_PORT = 8787;
const CDP_PORT = 9422;
const GA4_ID = 'G-VERIFY0000';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

console.log('Building with PUBLIC_GA4_ID set…');
execSync('npx astro build', { stdio: 'ignore', env: { ...process.env, PUBLIC_GA4_ID: GA4_ID } });

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain',
};
const siteServer = createServer((req, res) => {
  const p = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join('dist', p);
  if (p.endsWith('/')) file = join(file, 'index.html');
  if (!existsSync(file)) file = join('dist', '404.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
siteServer.listen(SITE_PORT);

const profile = mkdtempSync(join(tmpdir(), 'cdp-track-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, 'about:blank',
]);

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) =>
  new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });

const evalX = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))
    .result?.result?.value;

const events = async () =>
  JSON.parse(await evalX(
    `JSON.stringify(window.dataLayer.map(a => Array.from(a)).filter(a => a[0] === 'event'))`,
  ));

const clickOn = async (selector) => {
  // Scroll first, settle, THEN measure. Reading the rect in the same tick as
  // scrollIntoView returns pre-scroll coordinates and the click lands elsewhere.
  await evalX(`document.querySelector('${selector}').scrollIntoView({block:'center', behavior:'instant'}); 'ok'`);
  await sleep(250);
  const box = JSON.parse(await evalX(`
    JSON.stringify((function(){
      var r = document.querySelector('${selector}').getBoundingClientRect();
      return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    })())`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
  await sleep(200);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setBlockedURLs', { urls: ['*googletagmanager.com*'] });
await send('Page.navigate', { url: `http://localhost:${SITE_PORT}/contact/` });
await sleep(1400);

console.log('\nVerifying the enquiry form on /contact/:\n');

check('window.dataLayer initialised', (await evalX('Array.isArray(window.dataLayer)')) === true);

const config = await evalX(
  `JSON.stringify(window.dataLayer.map(a => Array.from(a)).filter(a => a[0] === 'config'))`,
);
check('GA4 config command queued', (config ?? '').includes(GA4_ID), `config → ${GA4_ID}`);

// Stub fetch so nothing reaches FormSubmit and no real email is sent.
await evalX(`
  window.__posted = null;
  window.fetch = function (url, opts) {
    window.__posted = { url: String(url), body: opts && opts.body };
    return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({}); } });
  };
  'stubbed'
`);

// --- form_start (real click; .focus() would not dispatch focusin headless) ---
await clickOn('#cf-name');
let evs = await events();
const start = evs.filter((e) => e[1] === 'form_start');
check('form_start fires on first field focus', start.length === 1,
  `page_path=${start[0]?.[2]?.page_path}`);

await clickOn('#cf-email');
evs = await events();
check('form_start fires once per page view, not per focus',
  evs.filter((e) => e[1] === 'form_start').length === 1);

// --- validation must block an incomplete submit ------------------------------
await evalX(`document.querySelector('[data-lead-form]').requestSubmit(); 'ok'`);
await sleep(300);
check('incomplete form is rejected with a message',
  (await evalX(`document.querySelector('[data-lead-status]').textContent`)) ===
    'Please add your name, a valid email, and a message.');
check('no form_submit fired on a rejected submit',
  (await events()).filter((e) => e[1] === 'form_submit').length === 0);

// --- honeypot ----------------------------------------------------------------
await evalX(`
  var f = document.querySelector('[data-lead-form]');
  f.querySelector('[name="Name"]').value = 'Bot';
  f.querySelector('[name="Email"]').value = 'bot@example.com';
  f.querySelector('[name="Message"]').value = 'spam';
  f.querySelector('[name="_honey"]').value = 'caught';
  f.requestSubmit(); 'ok'
`);
await sleep(300);
check('honeypot submission is silently discarded',
  (await evalX('window.__posted')) === null &&
    (await events()).filter((e) => e[1] === 'form_submit').length === 0,
  'nothing posted, no conversion recorded');

// --- successful submit -------------------------------------------------------
await evalX(`
  var f = document.querySelector('[data-lead-form]');
  f.querySelector('[name="_honey"]').value = '';
  f.querySelector('[name="Name"]').value = 'Test Person';
  f.querySelector('[name="Email"]').value = 'test@example.com';
  f.querySelector('[name="Mobile"]').value = '91234567';
  f.querySelector('[name="Message"]').value = '4-room HDB in Yishun, deep clean, fortnightly.';
  f.requestSubmit(); 'ok'
`);
await sleep(900);

evs = await events();
check('form_submit fires after a successful POST',
  evs.filter((e) => e[1] === 'form_submit').length === 1);

const posted = JSON.parse((await evalX('JSON.stringify(window.__posted)')) ?? 'null');
check('posts to the FormSubmit endpoint',
  !!posted && posted.url.includes('formsubmit.co'), posted?.url);

const payload = posted ? JSON.parse(posted.body) : {};
check('payload carries the ourkampung field set',
  payload.Name === 'Test Person' && payload.Email === 'test@example.com' &&
    payload.Mobile === '91234567' && typeof payload.Message === 'string',
  `fields: ${Object.keys(payload).join(', ')}`);
check('payload carries a _subject', typeof payload._subject === 'string' && payload._subject.length > 0,
  payload._subject);

check('success message shown to the user',
  (await evalX(`document.querySelector('[data-lead-status]').textContent`)) ===
    'Your message is on its way!');

// --- event hygiene -----------------------------------------------------------
const names = [...new Set(evs.map((e) => e[1]))];
check('no generic button_click event', !names.includes('button_click'), `events: ${names.join(', ')}`);
check('only form_start and form_submit are emitted',
  names.every((n) => n === 'form_start' || n === 'form_submit'));

// --- form-only contact -------------------------------------------------------
const links = JSON.parse(await evalX(`
  JSON.stringify({
    wa: document.querySelectorAll('a[href^="https://wa.me"]').length,
    tel: document.querySelectorAll('a[href^="tel:"]').length,
  })`));
check('no WhatsApp or telephone links on the page',
  links.wa === 0 && links.tel === 0, `wa.me=${links.wa} tel=${links.tel}`);

const storage = JSON.parse(await evalX(
  `JSON.stringify({ local: Object.keys(localStorage).length, session: Object.keys(sessionStorage).length })`,
));
check('no localStorage or sessionStorage used',
  storage.local === 0 && storage.session === 0,
  `localStorage=${storage.local} sessionStorage=${storage.session}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

ws.close(); chrome.kill(); siteServer.close();

console.log('Rebuilding without the test environment…');
execSync('npx astro build', { stdio: 'ignore' });

process.exit(failed.length ? 1 : 0);
