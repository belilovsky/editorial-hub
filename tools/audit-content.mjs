import fs from 'node:fs';
import vm from 'node:vm';

const dataPath = new URL('./data.js', import.meta.url);
const raw = fs.readFileSync(dataPath, 'utf8');

const sandbox = {
  window: {},
  module: {},
  exports: {},
};
vm.createContext(sandbox);
vm.runInContext(raw, sandbox, { filename: 'data.js' });

const data = sandbox.window.EH_DATA || sandbox.module.exports || sandbox.EH_DATA;
if (!data || !Array.isArray(data.sections)) {
  throw new Error('EH_DATA.sections not found or invalid');
}

const required = {
  0: ['sources', 'factcheck', 'visual-verification', 'ai-policy', 'corrections', 'public-requests', 'legal', 'risk-matrix', 'harm-sensitive-reporting', 'elections', 'security', 'bilingual-workflow'],
  1: ['scope', 'principles', 'platforms', 'accessibility', 'conflicts', 'sponsored', 'aggregation', 'health-science', 'ru', 'kk', 'methodology', 'archive', 'templates', 'editorial-checklists', 'examples', 'source-benchmarks'],
};

const minWords = {
  0: 900,
  1: 500,
};

const knownSections = data.sections.map(s => s.id);
const checks = [];

for (const section of data.sections) {
  const id = section.id;
  if (!id) {
    checks.push(`Без id: section title="${section.title || 'unknown'}"`);
    continue;
  }
  if (!section.title || !section.summary || !section.group || !section.body) {
    checks.push(`Пустые обязательные поля: ${id}`);
  }
  const bodyText = String(section.body || '');
  const summaryText = String(section.summary || '');
  if (/todo|lorem|\[\.\.\.|TODO|Lorem|TODO:/.test(bodyText + '\n' + summaryText) && id !== 'templates') {
    checks.push(`Возможные черновые маркеры в разделе: ${id}`);
  }
  const risk = section.riskLevel;
  if ((risk === 'P0' || required[0].includes(id)) && wordCount(bodyText) < minWords[0]) {
    checks.push(`Недостаточный объём (P0): ${id} (${wordCount(bodyText)} < ${minWords[0]})`);
  }
  if ((risk === 'P1' || required[1].includes(id)) && wordCount(bodyText) < minWords[1]) {
    checks.push(`Недостаточный объём (P1): ${id} (${wordCount(bodyText)} < ${minWords[1]})`);
  }
  if ((risk === 'P0' || risk === 'P1') && !Array.isArray(section.related)) {
    checks.push(`Нет related у ключевого раздела: ${id}`);
  }
  if (section.requiresLegal && section.contentStatus === 'template-ready') {
    checks.push(`requiresLegal отмечен, но contentStatus не указывает review: ${id}`);
  }
  if (section.id === 'launch-status') {
    const hasLegal = /Legal sign-off|legal sign-off/.test(bodyText);
    const hasPublic = /Public request channel|публичный канал|real/.test(bodyText);
    if (!hasLegal || !hasPublic) checks.push(`launch-status не документирует внешний gate: ${id}`);
  }
}

const duplicated = findDuplicates(data.sections.map(s => s.id));
for (const id of duplicated) checks.push(`Дубликат id: ${id}`);

const shortStatuses = data.sections.filter(s => s.id === 'overview' && s.summary.length < 120).map(s => s.id);
if (shortStatuses.length) checks.push('Служебные разделы могут быть короткими, но overview слишком короткий.');

function wordCount(text){
  return text.replace(/[#*`|[\]()>]/g, ' ').split(/\s+/).filter(Boolean).length;
}

function findDuplicates(values){
  const seen = new Set();
  const dups = new Set();
  for (const value of values){
    if (seen.has(value)) dups.add(value);
    seen.add(value);
  }
  return [...dups];
}

if (!data.meta || typeof data.meta.status !== 'string' || !/template-ready|draft/i.test(data.meta.status)) {
  checks.push(`meta.status должен быть честным и не production-ready: ${data.meta && data.meta.status}`);
}

const legal = data.sections.some(s => s.id === 'legal');
if (!legal) checks.push('Нужен раздел "legal"');

if (checks.length) {
  console.error('audit-content: FAIL');
  for (const item of checks) console.error('- ' + item);
  process.exit(1);
}

console.log(`audit-content: PASS — sections=${data.sections.length}, unique=${knownSections.length}`);
