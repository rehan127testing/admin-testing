/**
 * W.H. Academy — Admin Overview + Theme System
 * 2026-09-16
 * Uses existing authenticated Admin bridge/routes. Frontend only.
 */
(function(){
  'use strict';
  const KEY='wha:admin_theme';
  const THEMES={
    light:['Light','Clean · bright · focused'],
    dark:['Dark','Deep · calm · sharp'],
    midnight:['Midnight','Modern · premium · focused'],
    sunset:['Sunset','Warm · energetic · inspiring'],
    forest:['Forest','Fresh · balanced · productive'],
    hacker:['Hacker / Dev','Terminal vibe · code mode · just for fun']
  };
  const NAV=['Students','Overview','Boss Papers','Grading','Teachers','Devices','Insights','Rechecking','Analytics'];

  const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
  const sidebar=()=>document.querySelector('.wha-admin-sidebar');
  function nav(label){
    const s=sidebar(); if(!s)return null;
    return Array.from(s.querySelectorAll('button,a,[role="button"],[data-wha-staff-nav]'))
      .find(el=>norm(el.textContent||el.value).toLowerCase()===label.toLowerCase())||null;
  }
  function bridge(){
    for(const k of ['WHAAdminRecheckBridge','WHAAdminBridge','WHARecheckAdminBridge']){
      const o=window[k]; if(o&&typeof o.authed==='function')return o;
    }
    for(const k of Object.keys(window)){
      if(!/^WHA/i.test(k))continue;
      try{const o=window[k]; if(o&&typeof o.authed==='function')return o;}catch(_){}
    }
    return null;
  }
  async function call(op,p={}){
    const b=bridge(); if(!b)throw new Error('Admin API bridge unavailable.');
    const r=await b.authed(op,p);
    return r&&r.data&&!r.papers&&!r.teachers?r.data:r;
  }
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const num=v=>Number.isFinite(Number(v))?Number(v):0;

  function saved(){const x=localStorage.getItem(KEY)||'light'; return THEMES[x]?x:'light';}
  function apply(theme){
    const t=THEMES[theme]?theme:'light';
    document.documentElement.dataset.whaAdminTheme=t;
    document.body.dataset.whaAdminTheme=t;
    localStorage.setItem(KEY,t);
    ensureCodeBg();
    document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('is-selected',b.dataset.themeChoice===t));
    const label=document.querySelector('[data-admin-theme-label]'); if(label)label.textContent='Theme · '+THEMES[t][0];
  }
  function ensureCodeBg(){
    if(document.getElementById('wha-admin-hacker-bg'))return;
    const d=document.createElement('div'); d.id='wha-admin-hacker-bg'; d.setAttribute('aria-hidden','true');
    d.innerHTML=[
      '<span class="c1">const academy = {</span>','<span class="c2">  students: "learn",</span>',
      '<span class="c3">  teachers: "guide",</span>','<span class="c4">  progress: true,</span>',
      '<span class="c5">  security: "server-side"</span>','<span class="c1">};</span>',
      '<span class="c6">async function improve() {</span>','<span class="c3">  await teach();</span>',
      '<span class="c2">  await track();</span>','<span class="c4">  return grow();</span>',
      '<span class="c6">}</span>','<span class="c5">// build → verify → improve</span>'
    ].join('');
    document.body.appendChild(d);
  }

  function modal(){
    let m=document.getElementById('wha-admin-theme-modal'); if(m)return m;
    m=document.createElement('div'); m.id='wha-admin-theme-modal'; m.className='wha-admin-theme-modal'; m.hidden=true;
    const cards=Object.entries(THEMES).map(([k,v])=>`<button type="button" class="wha-admin-theme-card wha-admin-theme-card--${k}" data-theme-choice="${k}"><span class="wha-admin-theme-card__preview"><i></i><i></i><i></i></span><strong>${v[0]}</strong><small>${v[1]}</small></button>`).join('');
    m.innerHTML=`<div class="wha-admin-theme-modal__backdrop" data-theme-close></div><section class="wha-admin-theme-modal__panel" role="dialog" aria-modal="true"><header><div><span class="wha-admin-eyebrow">Administrator appearance</span><h2>Choose your workspace theme</h2><p>Only visuals change. Permissions and data stay the same.</p></div><button class="wha-admin-theme-close" data-theme-close aria-label="Close">×</button></header><div class="wha-admin-theme-grid">${cards}</div></section>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{
      const c=e.target.closest('[data-theme-choice]'); if(c){apply(c.dataset.themeChoice);return;}
      if(e.target.closest('[data-theme-close]'))m.hidden=true;
    });
    return m;
  }
  function themeControl(){
    const s=sidebar(); if(!s||s.querySelector('[data-admin-theme-button]'))return;
    const f=document.createElement('div'); f.className='wha-admin-theme-footer';
    const b=document.createElement('button'); b.type='button'; b.className='wha-admin-theme-button'; b.dataset.adminThemeButton='true';
    b.innerHTML='<span>◐</span><span data-admin-theme-label>Theme</span>';
    b.addEventListener('click',()=>{const m=modal();m.hidden=false;apply(saved());});
    f.appendChild(b); s.appendChild(f);
  }

  function kpi(id,label,note,icon){return `<article class="wha-admin-kpi wha-admin-kpi--${id}"><span class="wha-admin-kpi__icon">${icon}</span><strong id="wha-kpi-${id}">—</strong><span>${label}</span><small>${note}</small></article>`;}
  function quick(label){return `<button type="button" data-quick="${label}">${label}<span>→</span></button>`;}
  function overview(){
    let o=document.getElementById('wha-admin-overview'); if(o)return o;
    o=document.createElement('section'); o.id='wha-admin-overview'; o.className='wha-admin-overview'; o.hidden=true;
    o.innerHTML=`<div class="wha-admin-overview__inner">
      <header class="wha-admin-overview__hero"><div><span class="wha-admin-eyebrow">W.H. Academy command center</span><h1>Welcome back, Admin 👋</h1><p>Live academy snapshot from existing authenticated Admin routes.</p></div><div class="wha-admin-overview__hero-actions"><span id="wha-overview-date"></span><button id="wha-overview-refresh">Refresh</button></div></header>
      <div class="wha-admin-kpis">${kpi('students','Students','Total enrollments','◉')}${kpi('active','Active','Active students','✓')}${kpi('teachers','Teachers','Active teachers','◆')}${kpi('papers','Boss Papers','All papers','▤')}${kpi('rechecks','Rechecks','Open claims','↪')}</div>
      <div class="wha-admin-dashboard-grid">
        <article class="wha-admin-dash-card wha-admin-dash-card--wide"><div class="wha-admin-card-head"><div><span class="wha-admin-eyebrow">Enrollment intelligence</span><h2>Class distribution</h2></div><span class="wha-admin-live-dot">Live</span></div><div id="wha-class-bars" class="wha-admin-class-bars"><p class="wha-admin-muted">Loading…</p></div></article>
        <article class="wha-admin-dash-card"><div class="wha-admin-card-head"><div><span class="wha-admin-eyebrow">Status</span><h2>Student accounts</h2></div></div><div id="wha-status-list" class="wha-admin-status-list"><p class="wha-admin-muted">Loading…</p></div></article>
        <article class="wha-admin-dash-card"><div class="wha-admin-card-head"><div><span class="wha-admin-eyebrow">Shortcuts</span><h2>Quick actions</h2></div></div><div class="wha-admin-quick-actions">${quick('Students')}${quick('Teachers')}${quick('Boss Papers')}${quick('Rechecking')}${quick('Analytics')}<button type="button" data-open-theme>Theme<span>→</span></button></div></article>
        <article class="wha-admin-dash-card wha-admin-system-card"><div class="wha-admin-card-head"><div><span class="wha-admin-eyebrow">Connection</span><h2>System status</h2></div></div><p id="wha-system-status" class="wha-admin-system-status"><span></span>Checking Admin API…</p><small>No direct browser-to-database access is added.</small></article>
      </div></div>`;
    document.body.appendChild(o);
    o.querySelector('#wha-overview-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
    o.querySelector('#wha-overview-refresh').addEventListener('click',load);
    o.querySelector('[data-open-theme]').addEventListener('click',()=>{const m=modal();m.hidden=false;apply(saved());});
    o.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.quick)?.click()));
    return o;
  }

  function setKpi(id,v){const e=document.getElementById('wha-kpi-'+id); if(e)e.textContent=Number.isFinite(Number(v))?String(Number(v)):'—';}
  function renderClasses(by){
    const h=document.getElementById('wha-class-bars'); if(!h)return;
    const rows=Object.entries(by||{}).map(([k,v])=>[k,num(v)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),undefined,{numeric:true}));
    if(!rows.length){h.innerHTML='<p class="wha-admin-muted">No class data yet.</p>';return;}
    const max=Math.max(1,...rows.map(r=>r[1]));
    h.innerHTML=rows.map(([k,v])=>`<div class="wha-admin-class-row"><span>Class ${esc(k)}</span><div><i style="width:${Math.max(4,Math.round(v/max*100))}%"></i></div><strong>${v}</strong></div>`).join('');
  }
  function renderStatuses(by){
    const h=document.getElementById('wha-status-list'); if(!h)return;
    const rows=Object.entries(by||{}).sort((a,b)=>num(b[1])-num(a[1]));
    if(!rows.length){h.innerHTML='<p class="wha-admin-muted">No status data yet.</p>';return;}
    h.innerHTML=rows.map(([k,v])=>`<div><span><i class="status-${String(k).toLowerCase().replace(/[^a-z0-9]+/g,'-')}"></i>${esc(k)}</span><strong>${num(v)}</strong></div>`).join('');
  }
  async function load(){
    const st=document.getElementById('wha-system-status'); if(st){st.className='wha-admin-system-status';st.innerHTML='<span></span>Refreshing Admin data…';}
    const results=await Promise.allSettled([
      call('admin/statistics'),call('admin/listTeachers'),call('bossbattle/admin/listPapers'),call('bossbattle/admin/rechecks',{status:'Open'})
    ]);
    const stats=results[0].status==='fulfilled'?(results[0].value||{}):{};
    const teachers=results[1].status==='fulfilled'?(results[1].value?.teachers||[]):[];
    const papers=results[2].status==='fulfilled'?(results[2].value?.papers||[]):[];
    const rr=results[3].status==='fulfilled'?(results[3].value||{}):{};
    const rechecks=rr.requests||rr.rechecks||rr.items||[];
    setKpi('students',num(stats.totalEnrollments)); setKpi('active',num(stats.byStatus?.Active??stats.byStatus?.active));
    setKpi('teachers',teachers.filter(t=>String(t.status||'').toLowerCase()==='active').length);
    setKpi('papers',papers.length); setKpi('rechecks',Array.isArray(rechecks)?rechecks.length:0);
    renderClasses(stats.byClassLevel||{}); renderStatuses(stats.byStatus||{});
    const failed=results.filter(r=>r.status==='rejected').length;
    if(st){st.classList.add(failed?'is-error':'is-ok');st.innerHTML='<span></span>'+(failed?`Loaded with ${failed} unavailable data source${failed===1?'':'s'}`:'Authenticated Admin API connected');}
  }
  function show(){overview().hidden=false; document.body.classList.add('wha-admin-overview-open'); load();}
  function hide(){const o=document.getElementById('wha-admin-overview'); if(o)o.hidden=true;document.body.classList.remove('wha-admin-overview-open');}
  function wire(){
    const ov=nav('Overview'); if(!ov)return;
    if(!ov.dataset.whaOverviewWired){ov.dataset.whaOverviewWired='1';ov.addEventListener('click',()=>setTimeout(show,0));}
    NAV.filter(x=>x!=='Overview').forEach(x=>{const e=nav(x);if(e&&!e.dataset.whaOverviewHide){e.dataset.whaOverviewHide='1';e.addEventListener('click',hide);}});
  }
  function boot(){
    if(!sidebar())return false;
    apply(saved()); themeControl(); modal(); overview(); wire();
    const ov=nav('Overview'); if(ov&&(ov.dataset.whaActive==='true'||ov.getAttribute('aria-current')==='page'||/\b(active|selected|is-active)\b/i.test(ov.className||'')))show();
    return true;
  }
  let tries=0;const t=setInterval(()=>{tries++;if(boot()||tries>=40)clearInterval(t)},150);
  if(document.readyState!=='loading')boot();else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();
