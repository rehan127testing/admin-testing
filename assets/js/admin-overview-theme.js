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


  let adminSurfaceObserver=null, adminSurfaceQueued=false;

  function adminRgb(v){
    const m=String(v||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
    return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]==null?1:+m[4]}:null;
  }
  function adminLum(c){
    if(!c)return 0;
    const a=[c.r,c.g,c.b].map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});
    return .2126*a[0]+.7152*a[1]+.0722*a[2];
  }
  function adminSat(c){
    if(!c)return 1;
    const mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);
    return mx===0?0:(mx-mn)/mx;
  }
  function adminContrastRatio(a,b){
    const hi=Math.max(a,b),lo=Math.min(a,b);
    return (hi+.05)/(lo+.05);
  }

  function adminNearestBg(el){
    let node=el;
    while(node && node!==document.body){
      const bg=adminRgb(getComputedStyle(node).backgroundColor);
      if(bg && bg.a>=.72)return bg;
      node=node.parentElement;
    }
    return adminRgb(getComputedStyle(document.body).backgroundColor);
  }

  function normalizeAdminSurfaces(){
    // IMPORTANT: this function is intentionally monotonic for surface classes.
    // Once a neutral legacy surface is mapped to theme tokens, we keep that
    // class. Repeated remove/re-add cycles caused animation replay / blinking.
    document.querySelectorAll(
      'main,form,fieldset,article,section,header,footer,div,table,thead,tbody,tr,td,th,input,select,textarea,button'
    ).forEach(el=>{
      if(!(el instanceof HTMLElement))return;
      if(el.closest('.wha-admin-sidebar,.wha-admin-theme-modal,.wha-admin-overview'))return;
      if(el.classList.contains('wha-admin-auto-surface') || el.classList.contains('wha-admin-auto-control'))return;

      const cs=getComputedStyle(el);
      const bg=adminRgb(cs.backgroundColor);
      if(!bg || bg.a<.62)return;

      const neutralLight=adminLum(bg)>.76 && adminSat(bg)<.24;
      if(!neutralLight)return;

      const tag=el.tagName.toLowerCase();
      if(['input','select','textarea','button'].includes(tag)){
        el.classList.add('wha-admin-auto-control');
      }else{
        const r=el.getBoundingClientRect();
        if(r.width>90 && r.height>28)el.classList.add('wha-admin-auto-surface');
      }
    });

    // Contrast classes are also stable between theme changes.
    document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,p,small,strong,label,a,span,td,th,button'
    ).forEach(el=>{
      if(!(el instanceof HTMLElement))return;
      if(el.closest('.wha-admin-sidebar,.wha-admin-theme-modal'))return;
      if(!String(el.textContent||'').trim())return;
      if(el.classList.contains('wha-admin-contrast-dark') || el.classList.contains('wha-admin-contrast-light'))return;

      const fg=adminRgb(getComputedStyle(el).color);
      const bg=adminNearestBg(el);
      if(!fg || !bg)return;

      const fl=adminLum(fg), bl=adminLum(bg);
      if(adminContrastRatio(fl,bl)>=4.5)return;

      el.classList.add(bl>.5?'wha-admin-contrast-dark':'wha-admin-contrast-light');
    });
  }

  function queueAdminSurfaceNormalize(){
    if(adminSurfaceQueued)return;
    adminSurfaceQueued=true;
    requestAnimationFrame(()=>{adminSurfaceQueued=false;normalizeAdminSurfaces();});
  }
  function watchAdminSurfaces(){
    if(adminSurfaceObserver)return;
    adminSurfaceObserver=new MutationObserver(queueAdminSurfaceNormalize);
    adminSurfaceObserver.observe(document.body,{childList:true,subtree:true});
  }

  function saved(){const x=localStorage.getItem(KEY)||'light'; return THEMES[x]?x:'light';}
  function apply(theme){
    const t=THEMES[theme]?theme:'light';
    document.documentElement.dataset.whaAdminTheme=t;
    document.body.dataset.whaAdminTheme=t;
    localStorage.setItem(KEY,t);
    document.querySelectorAll('.wha-admin-contrast-dark,.wha-admin-contrast-light').forEach(el=>{
      el.classList.remove('wha-admin-contrast-dark','wha-admin-contrast-light');
    });
    ensureCodeBg();
    document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('is-selected',b.dataset.themeChoice===t));
    queueAdminSurfaceNormalize();
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
      <header class="wha-admin-overview__hero">
        <div>
          <span class="wha-admin-eyebrow">W.H. Academy command center</span>
          <h1>Welcome back, Admin 👋</h1>
          <p>Live academy snapshot from existing authenticated Admin routes.</p>
        </div>
        <div class="wha-admin-overview__hero-actions">
          <span id="wha-overview-date"></span>
          <button id="wha-overview-refresh">Refresh</button>
        </div>
      </header>

      <div class="wha-admin-kpis">
        ${kpi('students','Students','Total enrollments','◉')}
        ${kpi('active','Active','Active students','✓')}
        ${kpi('teachers','Teachers','Active teachers','◆')}
        ${kpi('papers','Boss Papers','All papers','▤')}
        ${kpi('rechecks','Rechecks','Open claims','↪')}
      </div>

      <div class="wha-admin-primary-grid">
        <article class="wha-admin-dash-card wha-admin-activity-card">
          <div class="wha-admin-card-head">
            <div>
              <span class="wha-admin-eyebrow">Learning activity</span>
              <h2>Student activity</h2>
              <p id="wha-activity-summary" class="wha-admin-card-subtitle">Question attempts recorded across the academy.</p>
            </div>
            <div class="wha-admin-activity-tools">
              <div class="wha-admin-range-tabs" id="wha-activity-range-tabs" role="tablist" aria-label="Student activity time filters">
                <button type="button" class="is-active" data-activity-range="daily">Daily</button>
                <button type="button" data-activity-range="weekly">Weekly</button>
                <button type="button" data-activity-range="monthly">Monthly</button>
                <button type="button" data-activity-range="yearly">Yearly</button>
                <button type="button" data-activity-range="lifetime">Lifetime</button>
              </div>
              <span id="wha-activity-range-badge" class="wha-admin-live-dot">Daily</span>
            </div>
          </div>
          <div id="wha-admin-activity-chart" class="wha-admin-activity-chart" aria-label="Student activity chart">
            <div class="wha-admin-chart-empty">Loading activity…</div>
          </div>
        </article>

        <article class="wha-admin-dash-card wha-admin-recent-card">
          <div class="wha-admin-card-head">
            <div>
              <span class="wha-admin-eyebrow">Workflow</span>
              <h2>Recent actions</h2>
            </div>
          </div>
          <div id="wha-admin-recent-actions" class="wha-admin-recent-actions">
            <p class="wha-admin-muted">Loading recent actions…</p>
          </div>
        </article>
      </div>

      <div class="wha-admin-secondary-grid">
        <article class="wha-admin-dash-card">
          <div class="wha-admin-card-head">
            <div>
              <span class="wha-admin-eyebrow">Enrollment intelligence</span>
              <h2>Class distribution</h2>
            </div>
            <span class="wha-admin-live-dot">Live</span>
          </div>
          <div id="wha-class-bars" class="wha-admin-class-bars"><p class="wha-admin-muted">Loading…</p></div>
        </article>

        <article class="wha-admin-dash-card">
          <div class="wha-admin-card-head">
            <div>
              <span class="wha-admin-eyebrow">Status</span>
              <h2>Student accounts</h2>
            </div>
          </div>
          <div id="wha-status-list" class="wha-admin-status-list"><p class="wha-admin-muted">Loading…</p></div>
        </article>

        <article class="wha-admin-dash-card">
          <div class="wha-admin-card-head">
            <div>
              <span class="wha-admin-eyebrow">Shortcuts</span>
              <h2>Quick actions</h2>
            </div>
          </div>
          <div class="wha-admin-quick-actions">
            ${quick('Students')}${quick('Teachers')}${quick('Boss Papers')}
            ${quick('Rechecking')}${quick('Analytics')}
            <button type="button" data-open-theme>Theme<span>→</span></button>
          </div>
        </article>

        <article class="wha-admin-dash-card wha-admin-system-card">
          <div class="wha-admin-card-head">
            <div>
              <span class="wha-admin-eyebrow">Connection</span>
              <h2>System status</h2>
            </div>
          </div>
          <p id="wha-system-status" class="wha-admin-system-status"><span></span>Checking Admin API…</p>
          <small>No direct browser-to-database access is added.</small>
        </article>
      </div>
    </div>`;

    document.body.appendChild(o);
    o.querySelector('#wha-overview-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
    o.querySelector('#wha-overview-refresh').addEventListener('click',load);
    o.querySelector('[data-open-theme]').addEventListener('click',()=>{const m=modal();m.hidden=false;apply(saved());});
    o.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.quick)?.click()));
    o.querySelectorAll('[data-activity-range]').forEach(btn=>btn.addEventListener('click',()=>{
      activityState.range=btn.dataset.activityRange||'daily';
      syncActivityTabs();
      renderActivity(activityState.trend||[]);
    }));
    syncActivityTabs();
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


  const activityState={range:'daily',trend:[]};
  const ACTIVITY_RANGE_LABELS={daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly',lifetime:'Lifetime'};

  function syncActivityTabs(){
    document.querySelectorAll('[data-activity-range]').forEach(btn=>{
      const active=(btn.dataset.activityRange===activityState.range);
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
    const badge=document.getElementById('wha-activity-range-badge');
    if(badge)badge.textContent=ACTIVITY_RANGE_LABELS[activityState.range]||'Daily';
  }

  function startOfWeek(date){
    const d=new Date(date);
    d.setHours(12,0,0,0);
    const day=d.getDay();
    const diff=(day===0?-6:1-day);
    d.setDate(d.getDate()+diff);
    return d;
  }

  function monthKey(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  }

  function yearKey(date){
    return String(date.getFullYear());
  }

  function parseTrendRows(trend){
    return (Array.isArray(trend)?trend:[]).map(row=>{
      const dt=new Date(row?.date||row?.createdAt||row?.day||row?.bucket);
      return Number.isFinite(dt.getTime()) ? {
        date: dt,
        attempts: num(row?.total),
        correct: num(row?.correct)
      } : null;
    }).filter(Boolean).sort((a,b)=>a.date-b.date);
  }

  function rangeLabel(range){
    return ACTIVITY_RANGE_LABELS[range]||'Daily';
  }

  function buildSlots(range, rows){
    const now=new Date();
    now.setHours(12,0,0,0);
    const slots=[];

    if(range==='daily'){
      for(let i=6;i>=0;i--){
        const d=new Date(now); d.setDate(now.getDate()-i);
        slots.push({
          key: isoDay(d),
          label: new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(d),
          match: x=>isoDay(x.date)===isoDay(d)
        });
      }
      return slots;
    }

    if(range==='weekly'){
      const current=startOfWeek(now);
      for(let i=7;i>=0;i--){
        const d=new Date(current); d.setDate(current.getDate()-(i*7));
        const key=isoDay(d);
        const end=new Date(d); end.setDate(d.getDate()+6);
        slots.push({
          key,
          label: `${new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(d)}`,
          match: x=>isoDay(startOfWeek(x.date))===key
        });
      }
      return slots;
    }

    if(range==='monthly'){
      const cur=new Date(now.getFullYear(), now.getMonth(), 1, 12);
      for(let i=11;i>=0;i--){
        const d=new Date(cur.getFullYear(), cur.getMonth()-i, 1, 12);
        const key=monthKey(d);
        slots.push({
          key,
          label: new Intl.DateTimeFormat(undefined,{month:'short'}).format(d),
          match: x=>monthKey(x.date)===key
        });
      }
      return slots;
    }

    if(range==='yearly'){
      const yr=now.getFullYear();
      for(let i=4;i>=0;i--){
        const y=yr-i;
        slots.push({
          key: String(y),
          label: String(y),
          match: x=>x.date.getFullYear()===y
        });
      }
      return slots;
    }

    // lifetime
    if(!rows.length){
      return [{
        key:'lifetime',
        label:'All time',
        match: ()=>true
      }];
    }
    const first=rows[0].date;
    const months=[];
    let cursor=new Date(first.getFullYear(), first.getMonth(), 1, 12);
    const end=new Date(now.getFullYear(), now.getMonth(), 1, 12);
    while(cursor<=end){
      const d=new Date(cursor);
      const key=monthKey(d);
      months.push({
        key,
        label: new Intl.DateTimeFormat(undefined,{month:'short', year: months.length===0 || d.getMonth()===0 ? '2-digit' : undefined}).format(d),
        match: x=>monthKey(x.date)===key
      });
      cursor.setMonth(cursor.getMonth()+1);
    }
    return months;
  }

  function isoDay(date){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function lastSevenDays(){
    const days=[];
    const end=new Date();
    end.setHours(12,0,0,0);
    for(let i=6;i>=0;i--){
      const d=new Date(end);
      d.setDate(end.getDate()-i);
      days.push({key:isoDay(d),date:d});
    }
    return days;
  }


  function aggregateActivity(trend, range){
    const rows=parseTrendRows(trend);
    const slots=buildSlots(range, rows);
    return slots.map(slot=>{
      let attempts=0, correct=0;
      rows.forEach(row=>{
        if(slot.match(row)){
          attempts+=row.attempts;
          correct+=row.correct;
        }
      });
      return {key:slot.key,label:slot.label,attempts,correct};
    });
  }

  function renderActivity(trend){
    const host=document.getElementById('wha-admin-activity-chart');
    const summary=document.getElementById('wha-activity-summary');
    if(!host)return;

    const range=activityState.range||'daily';
    const rows=aggregateActivity(trend, range);
    const total=rows.reduce((s,r)=>s+r.attempts,0);
    const correct=rows.reduce((s,r)=>s+r.correct,0);
    const accuracy=total?Math.round(correct/total*100):0;
    const badge=document.getElementById('wha-activity-range-badge');
    if(badge)badge.textContent=rangeLabel(range);

    const periodText={
      daily:'in the last 7 days',
      weekly:'in the last 8 weeks',
      monthly:'in the last 12 months',
      yearly:'in the last 5 years',
      lifetime:'across lifetime records'
    }[range] || 'in the selected period';

    if(summary){
      summary.textContent=total
        ? `${total} question attempt${total===1?'':'s'} · ${accuracy}% correct ${periodText}`
        : `No question attempts recorded ${periodText}.`;
    }

    const w=Math.max(760, rows.length*66), h=270, left=48, right=18, top=20, bottom=48;
    const plotW=w-left-right, plotH=h-top-bottom;
    const max=Math.max(4,...rows.map(r=>r.attempts));
    const ceil=Math.max(4,Math.ceil(max/4)*4);
    const y=v=>top+plotH-(v/ceil)*plotH;
    const x=i=>left+(rows.length===1?plotW/2:(i/(rows.length-1))*plotW);

    const grid=[0,.25,.5,.75,1].map(fr=>{
      const value=Math.round(ceil*(1-fr));
      const yy=top+plotH*fr;
      return `<g class="wha-chart-grid"><line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}"></line><text x="${left-10}" y="${yy+4}" text-anchor="end">${value}</text></g>`;
    }).join('');

    const points=rows.map((r,i)=>`${x(i)},${y(r.attempts)}`).join(' ');
    const area=`${left},${top+plotH} ${points} ${w-right},${top+plotH}`;
    const dots=rows.map((r,i)=>`
      <g class="wha-chart-point" data-attempts="${r.attempts}" data-label="${esc(r.label)}">
        <circle cx="${x(i)}" cy="${y(r.attempts)}" r="5"></circle>
        <title>${esc(r.label)}: ${r.attempts} attempt${r.attempts===1?'':'s'}</title>
      </g>`).join('');

    const labels=rows.map((r,i)=>`<text class="wha-chart-x" x="${x(i)}" y="${h-14}" text-anchor="middle">${esc(r.label)}</text>`).join('');

    host.innerHTML=`
      <svg class="wha-admin-activity-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Question attempts chart">
        <defs>
          <linearGradient id="whaActivityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--wa-primary)" stop-opacity=".28"></stop>
            <stop offset="100%" stop-color="var(--wa-primary)" stop-opacity=".02"></stop>
          </linearGradient>
        </defs>
        ${grid}
        <polygon class="wha-chart-area" points="${area}"></polygon>
        <polyline class="wha-chart-line" points="${points}"></polyline>
        ${dots}
        ${labels}
      </svg>`;
  }

  function actionTime(row){
    const keys=['resolvedAt','activatedAt','updatedAt','createdAt','submittedAt','adminReviewedAt'];
    for(const k of keys){
      const value=row&&row[k];
      if(value){
        const t=new Date(value).getTime();
        if(Number.isFinite(t))return {time:t,key:k,value};
      }
    }
    return null;
  }

  function relativeTime(ms){
    const diff=Math.max(0,Date.now()-ms);
    const min=Math.floor(diff/60000);
    if(min<1)return 'just now';
    if(min<60)return `${min} min ago`;
    const hr=Math.floor(min/60);
    if(hr<24)return `${hr} hr${hr===1?'':'s'} ago`;
    const day=Math.floor(hr/24);
    if(day<7)return `${day} day${day===1?'':'s'} ago`;
    return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(ms));
  }

  function renderRecentActions(teachers,papers,rechecks){
    const host=document.getElementById('wha-admin-recent-actions');
    if(!host)return;

    const items=[];

    (Array.isArray(teachers)?teachers:[]).forEach(t=>{
      const at=actionTime(t); if(!at)return;
      items.push({
        time:at.time,
        kind:'teacher',
        title:`Teacher ${esc(t.fullName||t.email||'added')}`,
        detail:String(t.status||'Teacher record updated')
      });
    });

    (Array.isArray(papers)?papers:[]).forEach(p=>{
      const at=actionTime(p); if(!at)return;
      items.push({
        time:at.time,
        kind:'paper',
        title:`${p.status==='Active'?'Boss paper active':'Boss paper'} · ${esc(p.title||p.paperId||'Paper')}`,
        detail:[p.subject,p.classLevel?`Class ${p.classLevel}`:''].filter(Boolean).join(' · ')
      });
    });

    (Array.isArray(rechecks)?rechecks:[]).forEach(r=>{
      const at=actionTime(r); if(!at)return;
      items.push({
        time:at.time,
        kind:'recheck',
        title:`Recheck ${esc(String(r.status||'updated').toLowerCase())}`,
        detail:`${esc(r.studentName||'Student')} · ${esc(r.subject||'')}`
      });
    });

    items.sort((a,b)=>b.time-a.time);
    const latest=items.slice(0,5);

    if(!latest.length){
      host.innerHTML='<div class="wha-admin-empty-actions"><strong>No recent workflow events yet</strong><span>New teachers, Boss papers and rechecking activity will appear here.</span></div>';
      return;
    }

    const icons={teacher:'◆',paper:'▤',recheck:'↪'};
    host.innerHTML=latest.map(item=>`
      <div class="wha-admin-action-row">
        <span class="wha-admin-action-icon wha-admin-action-icon--${item.kind}">${icons[item.kind]||'•'}</span>
        <div class="wha-admin-action-copy">
          <strong>${item.title}</strong>
          <span>${item.detail||'W.H. Academy workflow'}</span>
        </div>
        <time>${relativeTime(item.time)}</time>
      </div>`).join('');
  }

  async function load(){
    const st=document.getElementById('wha-system-status');
    if(st){st.className='wha-admin-system-status';st.innerHTML='<span></span>Refreshing Admin data…';}

    const results=await Promise.allSettled([
      call('admin/statistics'),
      call('admin/listTeachers'),
      call('bossbattle/admin/listPapers'),
      call('bossbattle/admin/rechecks',{}),
      call('analytics/contentDifficulty')
    ]);

    const stats=results[0].status==='fulfilled'?(results[0].value||{}):{};
    const teachers=results[1].status==='fulfilled'?(results[1].value?.teachers||[]):[];
    const papers=results[2].status==='fulfilled'?(results[2].value?.papers||[]):[];
    const rr=results[3].status==='fulfilled'?(results[3].value||{}):{};
    const rechecks=rr.requests||rr.rechecks||rr.items||[];
    const difficulty=results[4].status==='fulfilled'?(results[4].value||{}):{};

    setKpi('students',num(stats.totalEnrollments));
    setKpi('active',num(stats.byStatus?.Active??stats.byStatus?.active));
    setKpi('teachers',teachers.filter(t=>String(t.status||'').toLowerCase()==='active').length);
    setKpi('papers',papers.length);
    setKpi('rechecks',Array.isArray(rechecks)?rechecks.filter(r=>String(r.status||'').toLowerCase()==='open'&&!r.archivedAt).length:0);

    activityState.trend=(difficulty.trend||[]);
    renderActivity(activityState.trend);
    renderRecentActions(teachers,papers,rechecks);
    renderClasses(stats.byClassLevel||{});
    renderStatuses(stats.byStatus||{});

    const failed=results.filter(r=>r.status==='rejected').length;
    if(st){
      st.classList.add(failed?'is-error':'is-ok');
      st.innerHTML='<span></span>'+(failed
        ? `Loaded with ${failed} unavailable data source${failed===1?'':'s'}`
        : 'Authenticated Admin API connected');
    }
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
    apply(saved()); themeControl(); modal(); overview(); wire(); watchAdminSurfaces(); queueAdminSurfaceNormalize();
    const ov=nav('Overview'); if(ov&&(ov.dataset.whaActive==='true'||ov.getAttribute('aria-current')==='page'||/\b(active|selected|is-active)\b/i.test(ov.className||'')))show();
    return true;
  }
  let tries=0;const t=setInterval(()=>{tries++;if(boot()||tries>=40)clearInterval(t)},150);
  if(document.readyState!=='loading')boot();else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();
