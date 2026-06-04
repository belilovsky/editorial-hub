import fs from 'node:fs';
import vm from 'node:vm';

const dataPath = new URL('../data.js', import.meta.url);
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
  0: 80,
  1: 80,
};

const knownSections = data.sections.map(s => s.id);
const checks = [];
const warnings = [];

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
  if (/todo|lorem|\[\.\.\.|TODO|Lorem|TODO:/.test(bodyText + '\n' + summaryText) && !['templates','examples'].includes(id)) {
    warnings.push(`Возможные черновые маркеры в разделе: ${id}`);
  }
  const risk = section.riskLevel;
  if (risk === 'P0' || required[0].includes(id)) {
    if (wordCount(bodyText) < minWords[0]) {
      warnings.push(`Низкий объём (P0/критичный): ${id} (${wordCount(bodyText)} < ${minWords[0]})`);
    }
  }
  if (risk === 'P1' || required[1].includes(id)) {
    if (wordCount(bodyText) < minWords[1]) {
      warnings.push(`Низкий объём (P1/важный): ${id} (${wordCount(bodyText)} < ${minWords[1]})`);
    }
  }
  if (Array.isArray(section.related)) {
    for (const rel of section.related) {
      if (!knownSections.includes(rel)) {
        warnings.push(`Связанный id не найден в данных: ${id} → ${rel}`);
      }
    }
  }
  if ((risk === 'P0' || risk === 'P1') && !Array.isArray(section.related)) {
    warnings.push(`Нет related у ключевого раздела: ${id}`);
  }
  if (section.requiresLegal && section.contentStatus === 'template-ready') {
    warnings.push(`requiresLegal отмечен, но contentStatus не указывает review: ${id}`);
  }
  if (section.id === 'launch-status') {
    const hasLegal = /Legal sign-off|legal sign-off|Юридическое согласование/.test(bodyText);
    const hasPublic = /Public request channel|публичный канал|электронную почту|службу поддержки|форму/.test(bodyText);
    if (!hasLegal) warnings.push(`launch-status: не документирует юридическое согласование: ${id}`);
    if (!hasPublic) warnings.push(`launch-status: не документирует публичный канал для обращений: ${id}`);
  }
}

const duplicated = findDuplicates(data.sections.map(s => s.id));
for (const id of duplicated) checks.push(`Дубликат id: ${id}`);

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

if (!data.meta || typeof data.meta.status !== 'string' || !/template-ready|draft|готово как шаблон|черновик/i.test(data.meta.status)) {
  warnings.push(`meta.status должен быть честным и не имитировать полную готовность к публикации: ${data.meta && data.meta.status}`);
}

const legal = data.sections.some(s => s.id === 'legal');
if (!legal) checks.push('Нужен раздел "legal"');

if (checks.length) {
  console.error('audit-content: FAIL');
  for (const item of checks) console.error('- ' + item);
  process.exit(1);
}

if (warnings.length) {
  console.warn('audit-content: WARN');
  for (const item of warnings) console.warn('- ' + item);
  process.exit(0);
}

console.log(`audit-content: PASS — sections=${data.sections.length}, unique=${knownSections.length}`);
