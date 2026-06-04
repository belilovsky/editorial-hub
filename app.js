(function(){
  const D = window.EH_DATA;
  const navEl = document.getElementById('nav');
  const viewEl = document.getElementById('view');
  const crumbEl = document.getElementById('crumb');
  const sectionLeadEl = document.getElementById('sectionLead');
  const sectionStatsEl = document.getElementById('sectionStats');
  const themeRow = document.getElementById('themeRow');
  const exportBtn = document.getElementById('exportMd');
  const exportAllBtn = document.getElementById('exportAllMd');
  const searchEl = document.getElementById('search');
  const clearSearchBtn = document.getElementById('clearSearch');
  const themeColorEl = document.getElementById('themeColor');
  const html = document.documentElement;
  const THEMES = ['light','dark','golden-paper'];

  function normalizeSection(section){
    return {
      id: section && section.id ? section.id : '',
      featured: !!(section && section.featured),
      title: section && section.title ? section.title : titleOf(section),
      group: section && section.group ? section.group : 'Разделы',
      summary: section && section.summary ? section.summary : firstParagraph(section && section.body || ''),
      body: section && section.body ? section.body : '',
      riskLevel: section && section.riskLevel ? section.riskLevel : 'P1',
      contentStatus: section && section.contentStatus ? section.contentStatus : 'template-ready',
      ownerRole: section && section.ownerRole ? section.ownerRole : 'editorial-team',
      reviewCycle: section && section.reviewCycle ? section.reviewCycle : 'не определён',
      requiresLegal: !!section && section.requiresLegal,
      publicFacing: section && typeof section.publicFacing === 'boolean' ? section.publicFacing : true,
      related: Array.isArray(section && section.related) ? section.related : []
    };
  }

  function getStoredTheme(){
    try { return localStorage.getItem('eh-theme'); }
    catch(_e){ return null; }
  }

  function setStoredTheme(value){
    try { localStorage.setItem('eh-theme', value); }
    catch(_e){}
  }

  function applyTheme(t){
    if(!THEMES.includes(t)) t = 'light';
    html.setAttribute('data-theme', t);
    if(themeColorEl) themeColorEl.setAttribute('content', getComputedStyle(html).getPropertyValue('--background').trim());
    setStoredTheme(t);
    if(themeRow) themeRow.querySelectorAll('button').forEach(b=>{
      b.setAttribute('aria-pressed', b.dataset.theme === t ? 'true' : 'false');
    });
  }
  applyTheme(getStoredTheme() || 'light');
  themeRow && themeRow.addEventListener('click', e=>{
    const b = e.target.closest('button[data-theme]'); if(!b) return;
    applyTheme(b.dataset.theme);
  });

  function esc(s){return String(s || '').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function attr(s){return esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function safeHref(href){
    const raw = String(href || '').trim();
    if(/^#[A-Za-z0-9_-]+$/.test(raw)) return raw;
    try{
      const url = new URL(raw, window.location.href);
      return /^(https?:)$/i.test(url.protocol) ? url.href : '#';
    }catch(_e){
      return '#';
    }
  }
  function link(label, href){
    const safe = safeHref(href);
    const external = /^https?:/i.test(safe);
    return `<a href="${attr(safe)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  }
  function inline(s){
    s = esc(s);
    s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_m,label,href)=>link(label, href));
    return s;
  }
  function slugify(value){
    return String(value || '')
      .toLowerCase()
      .replace(/<[^>]*>/g,'')
      .replace(/[\s_]+/g,'-')
      .replace(/[^a-zа-я0-9-]/g,'')
      .replace(/-+/g,'-')
      .replace(/^-|-$/g,'');
  }

  function parseMarkdown(src){
    const lines = src.split('\n');
    const headings = [];
    const rendered = [];
    let i = 0;
    while(i < lines.length){
      const l = lines[i];
      let m;
      if(/^>/.test(l)){
        const calloutMatch = l.match(/^>\s*\[\!([A-ZА-Яa-z]+)\]\s*$/);
        const calloutType = calloutMatch ? calloutMatch[1].toLowerCase() : '';
        const raw = [];
        while(i < lines.length && lines[i].trim().startsWith('>')){
          raw.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        const text = raw.join('\n');
        if(calloutType){
          const title = {
            note: 'Note',
            warning: 'Warning',
            tip: 'Tip',
            danger: 'Risk',
            info: 'Info'
          }[calloutType] || 'Note';
          rendered.push(`<div class="callout callout-${calloutType}">
            <div class="callout-title">${title}</div>
            <div class="callout-body">${inline(text).replace(/\n/g,'<br>')}</div>
          </div>`);
        } else {
          rendered.push(`<blockquote>${inline(text).replace(/\n/g,'<br>')}</blockquote>`);
        }
        continue;
      }
      if((m = l.match(/^(#{1,6})\s+(.*)$/))){
        const n = m[1].length;
        const headingText = m[2].trim();
        const id = slugify(headingText) || `h${n}-${rendered.length}`;
        headings.push({ level: n, id, text: headingText });
        rendered.push(`<h${n} id="${attr(id)}">${inline(headingText)}</h${n}>`);
        i++;
        continue;
      }
      if(m = l.match(/^(\d{3}|---|___)\s*$/)){
        rendered.push('<hr/>');
        i++;
        continue;
      }
      if(l.startsWith('| ')){
        const rows = [];
        while(i < lines.length && lines[i].startsWith('|')){ rows.push(lines[i]); i++; }
        const cells = rows.map(r=>r.replace(/^\||\|$/g,'').split('|').map(c=>c.trim()));
        if(cells.length>=2 && /^[-: ]+$/.test(cells[1].join(''))){
          let t='<table><thead><tr>'+cells[0].map(c=>`<th>${inline(c)}</th>`).join('')+'</tr></thead><tbody>';
          for(let k=2;k<cells.length;k++) t+='<tr>'+cells[k].map(c=>`<td>${inline(c)}</td>`).join('')+'</tr>';
          rendered.push(t+'</tbody></table>');
        } else { rendered.push('<pre>'+rows.map(esc).join('\n')+'</pre>'); }
        continue;
      }
      if(/^[-*]\s+\[[ xX]\]\s+/.test(l)){
        let items=[];
        while(i<lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i])){
          const mm = lines[i].match(/^([ \t]*)[-*]\s+\[([ x])\]\s+(.*)$/);
          const margin = (mm[1] || '').length > 0 ? ` style="margin-left:${Math.min(mm[1].length,8)}ch"` : '';
          items.push(`<li${margin}><input type="checkbox" disabled aria-label="${attr(mm[3])}" ${mm[2]==='x'?'checked':''}> ${inline(mm[3])}</li>`); i++;
        }
        rendered.push('<ul class="checklist">'+items.join('')+'</ul>'); continue;
      }
      if(/^[-*]\s+/.test(l)){
        let items=[];
        while(i<lines.length && /^[-*]\s+/.test(lines[i])){
          const mm = lines[i].match(/^([ \t]*)[-*]\s+(.*)$/);
          const text = inline(mm[2]);
          const indent = (mm[1] || '').length ? ` style="margin-left:${Math.min(mm[1].length,8)}ch"` : '';
          items.push(`<li${indent}>${text}</li>`);
          i++;
        }
        rendered.push('<ul>'+items.join('')+'</ul>'); continue;
      }
      if(/^\d+\.\s+/.test(l)){
        let items=[];
        while(i<lines.length && /^\d+\.\s+/.test(lines[i])){ items.push('<li>'+inline(lines[i].replace(/^\d+\.\s+/,''))+'</li>'); i++; }
        rendered.push('<ol>'+items.join('')+'</ol>'); continue;
      }
      if(l.trim()===''){ i++; continue; }
      let para=[l]; i++;
      while(
        i<lines.length &&
        lines[i].trim()!=='' &&
        !/^\s*(#{1,6}\s+|>\s*|[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+\.\s+|\|)/.test(lines[i])
      ){
        para.push(lines[i]); i++;
      }
      rendered.push('<p>'+inline(para.join(' '))+'</p>');
    }
    return {
      html: rendered.join('\n'),
      headings
    };
  }

  function stripFirstHeading(body){
    return body.replace(/^#\s+.+\n+/,'');
  }

  function titleOf(section){
    if(section && section.title) return section.title;
    const heading = section && section.body ? section.body.match(/^#\s+(.+)$/m) : null;
    return heading ? heading[1] : (section && section.id ? section.id : 'Раздел');
  }

  function firstParagraph(body){
    const lines = body.split('\n');
    for(const line of lines){
      const trimmed = line.trim();
      if(!trimmed || /^#/.test(trimmed) || /^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed) || /^\|/.test(trimmed)) continue;
      return trimmed;
    }
    return '';
  }

  function excerptItems(body, limit){
    const items = [];
    const lines = body.split('\n');
    for(const line of lines){
      const trimmed = line.trim();
      if(/^[-*]\s+/.test(trimmed)) items.push(trimmed.replace(/^[-*]\s+/,''));
      if(/^\d+\.\s+/.test(trimmed)) items.push(trimmed.replace(/^\d+\.\s+/,''));
      if(items.length >= limit) break;
    }
    return items;
  }

  function wordCount(body){
    return body.replace(/[#*`|[\]()]/g,' ').split(/\s+/).filter(Boolean).length;
  }

  function sectionById(id){
    return D.sections.find(x=>x.id===id) || D.sections[0];
  }

  function getFeaturedSections(){
    const explicit = D.sections
      .map(section => normalizeSection(section))
      .filter(section => section.id && section.featured);
    if (explicit.length) return explicit;
    return D.sections
      .map(section => normalizeSection(section))
      .filter(section => ['launch-status', 'sources', 'factcheck', 'ai-policy', 'public-requests', 'editorial-checklists'].includes(section.id));
  }

  function groupSections(filter){
    const q = (filter || '').toLowerCase().trim();
    const groups = new Map();
    D.sections.forEach(raw=>{
      const section = normalizeSection(raw);
      const haystack = `${titleOf(section)}\n${section.summary || ''}\n${section.body}`.toLowerCase();
      if(q && !haystack.includes(q)) return;
      const key = section.group;
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(section);
    });
    return groups;
  }

  function renderNav(filter){
    navEl.innerHTML = '';
    const groups = groupSections(filter);
    if(!groups.size){
      navEl.innerHTML = '<div class="nav-empty">Ничего не найдено. Уточните термин или откройте обзор.</div>';
      return;
    }
    groups.forEach((sections, title)=>{
      const wrap = document.createElement('div');
      wrap.className = 'nav-group';
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'nav-group-title';
      label.textContent = `${title} (${sections.length})`;
      label.setAttribute('aria-expanded', 'true');
      label.dataset.group = title;
      const list = document.createElement('div');
      list.className = 'nav-group-list';
      const hasSearchFilter = !!((filter || '').trim());
      if(hasSearchFilter && sections.length > 8){
        list.classList.add('collapsed');
        label.setAttribute('aria-expanded', 'false');
      }
      label.addEventListener('click', () => {
        const collapsed = !list.classList.contains('collapsed');
        list.classList.toggle('collapsed', collapsed);
        label.setAttribute('aria-expanded', String(!collapsed));
      });
      wrap.appendChild(label);
      sections.forEach(s=>{
        const title = titleOf(s);
        const a = document.createElement('a');
        a.href = '#'+s.id;
        a.innerHTML = `<span class="nav-link-text">${esc(title)}</span>`;
        a.dataset.id = s.id;
        a.dataset.label = title;
        if(location.hash.slice(1) === s.id){
          a.classList.add('active');
          a.setAttribute('aria-current', 'page');
        }
        list.appendChild(a);
      });
      wrap.appendChild(list);
      navEl.appendChild(wrap);
    });
  }

  function renderOverviewCards(){
    return getFeaturedSections().map(section=>{
      return `<a class="overview-card" href="#${attr(section.id)}">
        <div class="overview-label">${esc(section.group || 'Раздел')}</div>
        <h2 class="overview-title">${esc(titleOf(section))}</h2>
        <div class="overview-note">${esc(section.summary || firstParagraph(section.body))}</div>
      </a>`;
    }).join('') || '';
  }

  function renderSignalPills(items){
    if(!items.length) return '';
    return `<div class="signal-card">
      <div class="meta-label">Быстрые ориентиры</div>
      <div class="signal-list">${items.map(item=>`<span class="signal-pill">${inline(item)}</span>`).join('')}</div>
    </div>`;
  }

  function sectionStats(section){
    const words = wordCount(section.body || '');
    const risk = section.riskLevel || 'P1';
    const status = section.contentStatus || 'template-ready';
    return `~${words} слов · ${esc(risk)} · ${esc(status)}`;
  }

  function renderToc(headings){
    if(!headings.length) return '';
      const items = headings.map(item => {
      const pad = Math.max(0, item.level - 2) * 12;
      return `<li style="--toc-pad:${pad}px"><a href="#${attr(item.id)}">${esc(item.text)}</a></li>`;
    }).join('');
    return `<nav class="toc" aria-label="Оглавление раздела"><h3>Оглавление</h3><ul>${items}</ul></nav>`;
  }

  function renderRelated(section){
    if(!section.related.length) return '';
    const relatedIds = new Set();
    D.sections.forEach(s => { if(s && s.id) relatedIds.add(s.id); });
    const links = section.related.map(entry => {
      const target = String(entry || '').trim();
      if(!target) return '';
      if(relatedIds.has(target)){
        const relSection = sectionById(target);
        const relTitle = relSection ? titleOf(relSection) : target;
        return `<li><a href="#${attr(target)}">${esc(relTitle)}</a></li>`;
      }
      return `<li>${esc(target)}</li>`;
    }).filter(Boolean);
    if(!links.length) return '';
    return `<section class="related"><h3>Связанные разделы</h3><ul>${links.join('')}</ul></section>`;
  }

  function renderView(){
    const id = location.hash.slice(1) || D.sections[0].id;
    const s = normalizeSection(sectionById(id));
    const title = titleOf(s);
    const summary = s.summary || firstParagraph(s.body);
    const quickItems = excerptItems(s.body, 4);
    const parsed = parseMarkdown(stripFirstHeading(s.body));
    const content = parsed.html;
    const toc = renderToc(parsed.headings);
    const related = renderRelated(s);
    crumbEl.textContent = s.group || 'Политика';
    if(sectionLeadEl) sectionLeadEl.textContent = summary;
    if(sectionStatsEl) sectionStatsEl.textContent = sectionStats(s);
    viewEl.innerHTML = `
      <div class="section-shell">
        <section class="section-header">
          <div class="section-eyebrow">${esc(s.id)}</div>
          <h1 class="section-title">${esc(title)}</h1>
          <p class="section-summary">${esc(summary)}</p>
        </section>
        <section class="meta-grid">
          <div class="meta-card">
            <div class="meta-label">Контур</div>
            <div class="meta-value">${esc(s.group || 'Политика')}</div>
            <div class="meta-note">Раздел входит в единую редакционную политику и экспортируется отдельно.</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Объём</div>
            <div class="meta-value">${wordCount(s.body)} слов</div>
            <div class="meta-note">Оценка для текущей версии, без учёта export actions.</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Риск / статус</div>
            <div class="meta-value">${esc((s.riskLevel || 'P1') + ' / ' + (s.contentStatus || 'template-ready'))}</div>
            <div class="meta-note">Owner: ${esc(s.ownerRole)} · Review: ${esc(s.reviewCycle || 'не определён')}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Актуальность</div>
            <div class="meta-value">v${esc(D.meta.version)}</div>
            <div class="meta-note">${esc(D.meta.updated)} · ${esc(D.meta.status)}</div>
          </div>
        </section>
        ${s.id === 'overview' ? `<section class="overview-grid">${renderOverviewCards()}</section>` : ''}
        ${renderSignalPills(quickItems)}
        <article class="doc-body">
          ${toc}
          ${content}
          ${related}
        </article>
      </div>`;
    navEl.querySelectorAll('a').forEach(a=>{
      const active = a.dataset.id === s.id;
      a.classList.toggle('active', active);
      if(active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const activeLink = navEl.querySelector('a.active');
    if(activeLink && activeLink.scrollIntoView){
      activeLink.scrollIntoView({ block: 'nearest' });
    }
    document.title = `${title} \u2014 ${D.meta.title}`;
  }
  function exportMd(e){
    e && e.preventDefault();
    const id = location.hash.slice(1) || D.sections[0].id;
    const s = normalizeSection(D.sections.find(x=>x.id===id) || D.sections[0]);
    const content = `# ${titleOf(s)}\n\n${stripFirstHeading(s.body)}`.trim();
    const name = `${s.id}.md`;
    downloadMarkdown(content, name);
  }

  function exportAllMd(e){
    e && e.preventDefault();
    const entries = D.sections.map(normalizeSection);
    const toc = ['## Содержание', '', ...entries.map((section, index)=>`${index + 1}. [${titleOf(section)}](#${section.id})`), '', ''].join('\n');
    const body = entries.map(section=>{
      const heading = `## ${titleOf(section)} (/${section.id})`;
      const normalizedBody = stripFirstHeading(section.body);
      const related = section.related.length ? `\n\n### Связанные разделы\n${section.related.map(r => `- ${r}`).join('\n')}` : '';
      return `${heading}\n\n${normalizedBody}\n${related}`;
    }).join('\n\n---\n\n');
    const content = `# ${D.meta.title} v${D.meta.version}\n\n- updated: ${D.meta.updated}\n- status: ${D.meta.status}\n- langs: ${(D.meta.langs || []).join(', ')}\n\n${toc}${body}`;
    downloadMarkdown(content, `editorial-hub-v${D.meta.version}.md`);
  }

  function downloadMarkdown(content, name){
    const blob = new Blob([content], {type:'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  if(searchEl){
    searchEl.addEventListener('input', e=>renderNav(e.target.value));
  }
  if(clearSearchBtn){
    clearSearchBtn.addEventListener('click', () => {
      if(!searchEl) return;
      searchEl.value = '';
      renderNav('');
      searchEl.focus();
    });
  }
  if(exportBtn){
    exportBtn.addEventListener('click', exportMd);
  }
  if(exportAllBtn){
    exportAllBtn.addEventListener('click', exportAllMd);
  }
  window.addEventListener('hashchange', ()=>{ renderView(); renderNav(searchEl ? searchEl.value : ''); window.scrollTo(0,0); });

  renderNav('');
  if(!location.hash) location.hash = D.sections[0].id; else renderView();
})();
