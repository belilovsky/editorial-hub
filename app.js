(function(){
  const D = window.EH_DATA;
  const navEl = document.getElementById('nav');
  const viewEl = document.getElementById('view');
  const crumbEl = document.getElementById('crumb');
  const themeRow = document.getElementById('themeRow');
  const exportBtn = document.getElementById('exportMd');
  const searchEl = document.getElementById('search');
  const html = document.documentElement;
  const THEMES = ['light','dark','institutional','golden-paper','cyber-dark'];

  function applyTheme(t){
    if(!THEMES.includes(t)) t = 'dark';
    html.setAttribute('data-theme', t);
    localStorage.setItem('eh-theme', t);
    if(themeRow) themeRow.querySelectorAll('button').forEach(b=>{
      b.setAttribute('aria-pressed', b.dataset.theme === t ? 'true' : 'false');
    });
  }
  applyTheme(localStorage.getItem('eh-theme') || 'dark');
  themeRow && themeRow.addEventListener('click', e=>{
    const b = e.target.closest('button[data-theme]'); if(!b) return;
    applyTheme(b.dataset.theme);
  });

  function esc(s){return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function inline(s){
    s = esc(s);
    s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
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

  function renderNav(filter){
    const q = (filter||'').toLowerCase().trim();
    navEl.innerHTML = '';
    D.sections.forEach(s=>{
      if(q && !(s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))) return;
      const a = document.createElement('a');
      a.href = '#'+s.id; a.textContent = s.title; a.dataset.id = s.id;
      if(location.hash.slice(1) === s.id) a.classList.add('active');
      navEl.appendChild(a);
    });
  }
  function renderView(){
    const id = location.hash.slice(1) || D.sections[0].id;
    const s = D.sections.find(x=>x.id===id) || D.sections[0];
    crumbEl.textContent = s.title;
    viewEl.innerHTML = md(s.body);
    navEl.querySelectorAll('a').forEach(a=>a.classList.toggle('active', a.dataset.id===s.id));
    document.title = `${s.title} \u2014 ${D.meta.title}`;
  }
  function exportMd(e){
    e && e.preventDefault();
    const all = e && e.shiftKey;
    let content, name;
    if(all){
      content = `# ${D.meta.title} v${D.meta.version}\n\n` + D.sections.map(s=>'## '+s.title+'\n\n'+s.body).join('\n\n---\n\n');
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
