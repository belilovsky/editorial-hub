(function(){
  const D = window.EH_DATA;
  const navEl = document.getElementById('nav');
  const viewEl = document.getElementById('view');
  const crumbEl = document.getElementById('crumb');
  const sectionLeadEl = document.getElementById('sectionLead');
  const sectionStatsEl = document.getElementById('sectionStats');
  const themeRow = document.getElementById('themeRow');
  const exportBtn = document.getElementById('exportMd');
  const searchEl = document.getElementById('search');
  const html = document.documentElement;
  const THEMES = ['light','dark','golden-paper'];
  const FEATURED_OVERVIEW_IDS = ['sources', 'factcheck', 'ai-policy', 'corrections', 'elections', 'bilingual-workflow'];

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
  function safeHref(href){
    try{
      const url = new URL(href, window.location.href);
      return /^(https?:)$/i.test(url.protocol) ? url.href : '#';
    }catch(_e){
      return '#';
    }
  }
  function inline(s){
    s = esc(s);
    s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_m,label,href)=>`<a href="${safeHref(href)}" target="_blank" rel="noopener">${label}</a>`);
    return s;
  }
  function md(src){
    const lines = src.split('\n');
    let out = [], i = 0;
    while(i < lines.length){
      const l = lines[i]; let m;
      if(m = l.match(/^(#{1,6})\s+(.*)$/)){ const n=m[1].length; out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
      if(l.startsWith('| ')){
        const rows = [];
        while(i < lines.length && lines[i].startsWith('|')){ rows.push(lines[i]); i++; }
        const cells = rows.map(r=>r.replace(/^\||\|$/g,'').split('|').map(c=>c.trim()));
        if(cells.length>=2 && /^[-: ]+$/.test(cells[1].join(''))){
          let t='<table><thead><tr>'+cells[0].map(c=>`<th>${inline(c)}</th>`).join('')+'</tr></thead><tbody>';
          for(let k=2;k<cells.length;k++) t+='<tr>'+cells[k].map(c=>`<td>${inline(c)}</td>`).join('')+'</tr>';
          out.push(t+'</tbody></table>');
        } else { out.push('<pre>'+rows.map(esc).join('\n')+'</pre>'); }
        continue;
      }
      if(/^[-*]\s+\[[ x]\]\s+/.test(l)){
        let items=[];
        while(i<lines.length && /^[-*]\s+\[[ x]\]\s+/.test(lines[i])){
          const mm = lines[i].match(/^[-*]\s+\[([ x])\]\s+(.*)$/);
          items.push(`<li><input type="checkbox" disabled ${mm[1]==='x'?'checked':''}> ${inline(mm[2])}</li>`); i++;
        }
        out.push('<ul class="checklist">'+items.join('')+'</ul>'); continue;
      }
      if(/^[-*]\s+/.test(l)){
        let items=[];
        while(i<lines.length && /^[-*]\s+/.test(lines[i])){ items.push('<li>'+inline(lines[i].replace(/^[-*]\s+/,''))+'</li>'); i++; }
        out.push('<ul>'+items.join('')+'</ul>'); continue;
      }
      if(/^\d+\.\s+/.test(l)){
        let items=[];
        while(i<lines.length && /^\d+\.\s+/.test(lines[i])){ items.push('<li>'+inline(lines[i].replace(/^\d+\.\s+/,''))+'</li>'); i++; }
        out.push('<ol>'+items.join('')+'</ol>'); continue;
      }
      if(l.trim()===''){ i++; continue; }
      let para=[l]; i++;
      while(i<lines.length && lines[i].trim()!=='' && !/^(#|[-*]\s|\d+\.\s|\|)/.test(lines[i])){ para.push(lines[i]); i++; }
      out.push('<p>'+inline(para.join(' '))+'</p>');
    }
    return out.join('\n');
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

  function groupSections(filter){
    const q = (filter || '').toLowerCase().trim();
    const groups = new Map();
    D.sections.forEach(section=>{
      const haystack = `${titleOf(section)}\n${section.summary || ''}\n${section.body}`.toLowerCase();
      if(q && !haystack.includes(q)) return;
      const key = section.group || 'Разделы';
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
      const label = document.createElement('div');
      label.className = 'nav-group-title';
      label.textContent = title;
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
          a.setAttribute('aria-current', 'true');
        }
        wrap.appendChild(a);
      });
      navEl.appendChild(wrap);
    });
  }

  function renderOverviewCards(){
    return FEATURED_OVERVIEW_IDS.map(id=>{
      const section = sectionById(id);
      const title = titleOf(section);
      return `<a class="overview-card" href="#${section.id}">
        <div class="overview-label">${esc(section.group || 'Раздел')}</div>
        <h2 class="overview-title">${esc(title)}</h2>
        <div class="overview-note">${esc(section.summary || firstParagraph(section.body))}</div>
      </a>`;
    }).join('');
  }

  function renderSignalPills(items){
    if(!items.length) return '';
    return `<div class="signal-card">
      <div class="meta-label">Быстрые ориентиры</div>
      <div class="signal-list">${items.map(item=>`<span class="signal-pill">${inline(item)}</span>`).join('')}</div>
    </div>`;
  }

  function renderView(){
    const id = location.hash.slice(1) || D.sections[0].id;
    const s = sectionById(id);
    const title = titleOf(s);
    const summary = s.summary || firstParagraph(s.body);
    const quickItems = excerptItems(s.body, 4);
    const content = md(stripFirstHeading(s.body));
    const words = wordCount(s.body);
    crumbEl.textContent = s.group || 'Политика';
    if(sectionLeadEl) sectionLeadEl.textContent = summary;
    if(sectionStatsEl) sectionStatsEl.textContent = `${quickItems.length || 1} ориентира`;
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
            <div class="meta-note">Раздел встроен в единый AV DS editorial shell.</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Объём</div>
            <div class="meta-value">${words}</div>
            <div class="meta-note">Слов в текущем разделе без учёта экспортных действий.</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Актуальность</div>
            <div class="meta-value">v${esc(D.meta.version)}</div>
            <div class="meta-note">${esc(D.meta.updated)} · ${esc(D.meta.status)}</div>
          </div>
        </section>
        ${s.id === 'overview' ? `<section class="overview-grid">${renderOverviewCards()}</section>` : ''}
        ${renderSignalPills(quickItems)}
        <article class="doc-body">${content}</article>
      </div>`;
    navEl.querySelectorAll('a').forEach(a=>{
      const active = a.dataset.id === s.id;
      a.classList.toggle('active', active);
      if(active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    document.title = `${title} \u2014 ${D.meta.title}`;
  }
  function exportMd(e){
    e && e.preventDefault();
    const all = e && e.shiftKey;
    let content, name;
    if(all){
      content = `# ${D.meta.title} v${D.meta.version}\n\n` + D.sections.map(s=>'## '+titleOf(s)+'\n\n'+s.body).join('\n\n---\n\n');
      name = `editorial-hub-v${D.meta.version}.md`;
    } else {
      const id = location.hash.slice(1) || D.sections[0].id;
      const s = D.sections.find(x=>x.id===id) || D.sections[0];
      content = s.body; name = `${s.id}.md`;
    }
    const blob = new Blob([content], {type:'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  searchEl && searchEl.addEventListener('input', e=>renderNav(e.target.value));
  exportBtn && exportBtn.addEventListener('click', exportMd);
  window.addEventListener('hashchange', ()=>{ renderView(); renderNav(searchEl ? searchEl.value : ''); window.scrollTo(0,0); });

  renderNav('');
  if(!location.hash) location.hash = D.sections[0].id; else renderView();
})();
