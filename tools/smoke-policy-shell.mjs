import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const app = fs.readFileSync(new URL('app.js', root), 'utf8');
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const styles = fs.readFileSync(new URL('styles.css', root), 'utf8');
const dataRaw = fs.readFileSync(new URL('data.js', root), 'utf8');

const sandbox = { window: {}, module: {}, exports: {} };
vm.createContext(sandbox);
vm.runInContext(dataRaw, sandbox, { filename: 'data.js' });
const data = sandbox.window.EH_DATA || sandbox.module.exports || sandbox.EH_DATA;

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}0-9-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const slugCases = [
  ['Низкий риск', 'низкий-риск'],
  ['Қазақша бөлім 2026', 'қазақша-бөлім-2026'],
  ['AI / фактчек: P0', 'ai-фактчек-p0'],
];

for (const [input, expected] of slugCases) {
  assert(slugify(input) === expected, `slugify mismatch for "${input}"`);
}

assert(data && Array.isArray(data.sections) && data.sections.length >= 30, 'EH_DATA.sections should be loaded');
assert(html.includes('id="routeAnnouncer"') && html.includes('aria-live="polite"'), 'route announcer is missing');
assert(html.includes('<main id="main" role="main" tabindex="-1">'), 'main landmark/focus target is missing');
assert(html.includes('id="menuToggle"') && html.includes('aria-controls="nav"'), 'mobile menu toggle is missing');
assert(html.includes('./styles.css?v=20260611a') && html.includes('./app.js?v=20260611a'), 'asset cache-bust was not updated');
assert(styles.includes('.sr-only'), 'sr-only helper is missing');
assert(styles.includes('.section-title:focus{outline:none}'), 'programmatic h1 focus should not draw a persistent focus ring');
assert(styles.includes('.menu-toggle') && styles.includes('.nav-collapsed'), 'mobile menu CSS is missing');
assert(styles.includes('--primary:hsl(36 72% 30%)'), 'golden-paper primary contrast was not updated');

for (const snippet of [
  "const HASH_SEPARATOR = '::'",
  'function splitHash',
  'function currentRoute',
  'function uniqueHeadingId',
  'function renderNotFound',
  'function announceRoute',
  'function focusRenderedHeading',
  'function scrollToHeading',
  "catch(_e){ raw = ''; }",
  "label.setAttribute('aria-controls', groupId)",
  "localStorage.setItem('eh-expanded-groups'",
  'function setMobileMenuCollapsed',
  'function collapseMobileMenu',
  'function applyResponsiveMenuDefault',
  'Дата экспорта',
  'Версия: v${D.meta.version}',
  '`#${relatedSection.id}`',
]) {
  assert(app.includes(snippet), `app.js missing expected contract: ${snippet}`);
}

assert(app.includes('HASH_SEPARATOR}${attr(item.id)}'), 'TOC links must use section::heading hash');
assert(!app.includes('D.sections.find(x=>x.id===id) || D.sections[0];'), 'section lookup must not silently fall back');

if (failures.length) {
  console.error('smoke-policy-shell: FAIL');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log(`smoke-policy-shell: PASS — sections=${data.sections.length}, slugCases=${slugCases.length}`);
