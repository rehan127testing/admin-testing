/**
 * W.H. Academy — Staff Shell
 * 2026-09-16
 *
 * Frontend-only shell:
 * - Teacher: no sidebar on sign-in; fixed sidebar after login
 * - Admin: styles existing sidebar, then loads Admin Overview + Theme module
 * - Existing handlers remain authoritative
 */
(function () {
  'use strict';

  const TEACHER_NAV = ['Boss Papers', 'Grading', 'Rechecking'];
  const ADMIN_NAV = ['Students','Overview','Boss Papers','Grading','Teachers','Devices','Insights','Rechecking','Analytics'];
  const STYLE_ID = 'wha-staff-shell-style';

  function norm(v) { return String(v || '').replace(/\s+/g,' ').trim(); }
  function clickables() { return Array.from(document.querySelectorAll('button,a,[role="tab"],[role="button"]')); }
  function byText(label) {
    const t = label.toLowerCase();
    return clickables().find(el => norm(el.textContent || el.value).toLowerCase() === t) || null;
  }
  function visible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }
  function teacherLoginVisible() {
    const signIn = clickables().find(el => /^sign\s*in$/i.test(norm(el.textContent || el.value)) && visible(el));
    if (!signIn) return false;
    return Array.from(document.querySelectorAll('input')).some(el => {
      const hay = [el.type,el.name,el.id,el.placeholder,el.autocomplete,el.getAttribute('aria-label')].join(' ').toLowerCase();
      return /(email|pin|password)/.test(hay) && visible(el);
    });
  }
  function commonAncestor(elements) {
    if (!elements.length) return null;
    let n = elements[0];
    while (n && n !== document.body) {
      if (elements.every(el => n.contains(el))) return n;
      n = n.parentElement;
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      :root{--wha-staff-sidebar-w:248px}
      .wha-staff-sidebar{box-sizing:border-box!important;width:248px!important;height:100vh!important;position:fixed!important;inset:0 auto 0 0!important;z-index:999!important;display:flex!important;flex-direction:column!important;overflow-y:auto!important;padding:22px 14px 18px!important;color:#fff!important;background:radial-gradient(circle at 90% 3%,rgba(255,255,255,.2),transparent 28%),linear-gradient(165deg,#312e81,#4338ca 55%,#7c3aed 120%)!important;border-right:1px solid rgba(255,255,255,.16)!important;box-shadow:18px 0 42px rgba(49,46,129,.18)!important}
      .wha-staff-brand{display:grid;grid-template-columns:46px 1fr;gap:11px;align-items:center;padding:10px;margin-bottom:16px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(255,255,255,.09)}
      .wha-staff-brand__mark{width:46px;height:46px;display:grid;place-items:center;border-radius:13px;font:900 15px/1 system-ui;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2)}
      .wha-staff-brand__title{font:800 15px/1.15 system-ui}.wha-staff-brand__role{display:block;margin-top:4px;font:700 10px/1.2 system-ui;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.66)}
      .wha-staff-sidebar__nav{display:flex;flex-direction:column;gap:7px}
      .wha-staff-nav-item,.wha-admin-sidebar [data-wha-staff-nav]{width:100%!important;min-height:46px!important;display:flex!important;align-items:center!important;gap:11px!important;padding:10px 12px!important;border:1px solid transparent!important;border-radius:12px!important;color:rgba(255,255,255,.9)!important;background:transparent!important;font:700 14px/1.25 system-ui!important;text-decoration:none!important;cursor:pointer!important}
      .wha-staff-nav-item:hover,.wha-admin-sidebar [data-wha-staff-nav]:hover{background:rgba(255,255,255,.13)!important;border-color:rgba(255,255,255,.16)!important}
      .wha-staff-nav-item.is-active,.wha-admin-sidebar [data-wha-active="true"]{background:linear-gradient(135deg,rgba(255,255,255,.27),rgba(255,255,255,.12))!important;border-color:rgba(255,255,255,.28)!important;box-shadow:inset 4px 0 0 #fbbf24!important}
      .wha-staff-nav-icon{width:22px;flex:0 0 22px;text-align:center}.wha-staff-sidebar__footer{margin-top:auto;padding-top:13px;border-top:1px solid rgba(255,255,255,.14)}
      body.wha-teacher-shell{padding-left:248px!important;background:#f7f8ff!important}
      body.wha-teacher-shell .wha-teacher-original-tabs{display:none!important}
      @media(max-width:899px){body.wha-teacher-shell{padding-left:0!important}.wha-teacher-sidebar{position:relative!important;width:auto!important;height:auto!important;inset:auto!important;margin:12px!important;border-radius:18px!important}.wha-teacher-sidebar .wha-staff-sidebar__nav{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important}}
    `;
    document.head.appendChild(s);
  }

  function brand(role) {
    const x = document.createElement('div');
    x.className = 'wha-staff-brand';
    x.innerHTML = '<div class="wha-staff-brand__mark">WH</div><div><div class="wha-staff-brand__title">W.H. Academy</div><span class="wha-staff-brand__role">'+role+'</span></div>';
    return x;
  }
  function navButton(label, icon) {
    const b = document.createElement('button');
    b.type='button'; b.className='wha-staff-nav-item';
    b.innerHTML='<span class="wha-staff-nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span>';
    return b;
  }


  function ensureStaffExperienceCss() {
    if (document.querySelector('link[data-wha-staff-experience]')) return;
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='assets/css/staff-experience.css';
    css.dataset.whaStaffExperience='true';
    document.head.appendChild(css);
  }

  function ensureTeacherEnhancements() {
    if (!document.querySelector('link[data-wha-teacher-themes]')) {
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='assets/css/teacher-themes.css';
      css.dataset.whaTeacherThemes='true';
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[data-wha-teacher-theme]')) {
      const js=document.createElement('script');
      js.src='assets/js/teacher-theme.js';
      js.defer=true;
      js.dataset.whaTeacherTheme='true';
      document.body.appendChild(js);
    }
    ensureStaffExperienceCss();
  }

  function removeTeacherSidebar() {
    document.querySelector('.wha-teacher-sidebar')?.remove();
    document.body.classList.remove('wha-teacher-shell');
  }

  function setupTeacher() {
    if (teacherLoginVisible()) { removeTeacherSidebar(); return false; }
    if (document.querySelector('.wha-teacher-sidebar')) { ensureTeacherEnhancements(); return true; }

    const originals = TEACHER_NAV.map(byText).filter(Boolean);
    if (originals.length < 2) return false;
    const root = commonAncestor(originals);
    if (root) root.classList.add('wha-teacher-original-tabs');

    const aside = document.createElement('aside');
    aside.className='wha-staff-sidebar wha-teacher-sidebar';
    aside.appendChild(brand('Teacher workspace'));
    const nav = document.createElement('nav'); nav.className='wha-staff-sidebar__nav';
    const icons={'Boss Papers':'◇','Grading':'✓','Rechecking':'↪'};
    const teacherButtons={};
    let teacherActiveLabel='';

    function visibleTeacherSection(){
      const headings=Array.from(document.querySelectorAll('h1,h2,h3,[data-panel-title]'))
        .filter(el=>visible(el))
        .map(el=>norm(el.textContent))
        .filter(Boolean);

      for(const label of TEACHER_NAV){
        if(headings.some(text=>text===label || text.startsWith(label+' '))) return label;
      }
      return '';
    }

    function syncTeacherActive(preferred){
      if(preferred) teacherActiveLabel=preferred;

      const visibleLabel=visibleTeacherSection();
      if(visibleLabel) teacherActiveLabel=visibleLabel;
      if(!teacherActiveLabel) teacherActiveLabel='Boss Papers';

      Object.entries(teacherButtons).forEach(([label,btn])=>{
        const active=(label===teacherActiveLabel);
        btn.classList.toggle('is-active',active);
        btn.dataset.whaTeacherActive=active?'true':'false';
        if(active) btn.setAttribute('aria-current','page');
        else btn.removeAttribute('aria-current');
      });
    }

    TEACHER_NAV.forEach(label=>{
      const orig=byText(label);
      if(!orig)return;

      const b=navButton(label,icons[label]);
      teacherButtons[label]=b;
      b.dataset.whaTeacherNav=label;

      b.addEventListener('click',()=>{
        teacherActiveLabel=label;
        syncTeacherActive(label);
        orig.click();

        requestAnimationFrame(()=>syncTeacherActive(label));
        setTimeout(()=>syncTeacherActive(label),100);
      });

      orig.addEventListener('click',()=>{
        teacherActiveLabel=label;
        setTimeout(()=>syncTeacherActive(label),0);
      });

      nav.appendChild(b);
    });

    aside.appendChild(nav);
    syncTeacherActive();

    const teacherContentObserver=new MutationObserver(()=>{
      const visibleLabel=visibleTeacherSection();
      if(visibleLabel && visibleLabel!==teacherActiveLabel){
        teacherActiveLabel=visibleLabel;
        syncTeacherActive();
      }
    });
    teacherContentObserver.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['hidden','class','style','aria-hidden']
    });

    const signout = clickables().find(el=>/^sign\s*out$/i.test(norm(el.textContent||el.value)));
    if(signout){
      const f=document.createElement('div'); f.className='wha-staff-sidebar__footer';
      const b=navButton('Sign out','↗'); b.addEventListener('click',()=>signout.click()); f.appendChild(b); aside.appendChild(f);
    }

    document.body.insertBefore(aside,document.body.firstChild);
    document.body.classList.add('wha-teacher-shell');
    ensureTeacherEnhancements();
    return true;
  }

  function adminRoot() {
    const matches = ADMIN_NAV.map(byText).filter(Boolean);
    if (matches.length < 5) return null;
    let root = commonAncestor(matches);
    if (!root) return null;
    let n=root;
    while(n && n!==document.body){
      const r=n.getBoundingClientRect();
      if(r.width>150 && r.width<360 && matches.filter(el=>n.contains(el)).length>=5) root=n;
      n=n.parentElement;
    }
    return {root,matches};
  }

  function ensureAdminEnhancements() {
    if (!document.querySelector('link[data-wha-admin-themes]')) {
      const css=document.createElement('link'); css.rel='stylesheet'; css.href='assets/css/admin-themes.css'; css.dataset.whaAdminThemes='true'; document.head.appendChild(css);
    }
    if (!document.querySelector('script[data-wha-admin-overview-theme]')) {
      const js=document.createElement('script'); js.src='assets/js/admin-overview-theme.js'; js.defer=true; js.dataset.whaAdminOverviewTheme='true'; document.body.appendChild(js);
    }
    ensureStaffExperienceCss();
  }

  function setupAdmin() {
    if (document.querySelector('.wha-admin-sidebar')) { ensureAdminEnhancements(); return true; }
    const found=adminRoot(); if(!found)return false;
    found.root.classList.add('wha-staff-sidebar','wha-admin-sidebar');
    found.matches.forEach(el=>{
      el.dataset.whaStaffNav=norm(el.textContent||el.value);
      el.addEventListener('click',()=>{
        found.matches.forEach(x=>delete x.dataset.whaActive);
        el.dataset.whaActive='true';
      });
      if(/\b(active|selected|is-active)\b/i.test(el.className||'')||el.getAttribute('aria-current')==='page') el.dataset.whaActive='true';
    });
    document.body.classList.add('wha-admin-shell');
    ensureAdminEnhancements();
    return true;
  }

  function boot() {
    injectStyles();
    const teacher=/teacher\.html$/i.test(location.pathname);
    if(teacher){
      const refresh=()=>teacherLoginVisible()?removeTeacherSidebar():setupTeacher();
      refresh();
      const o=new MutationObserver(()=>requestAnimationFrame(refresh));
      o.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style','aria-hidden']});
    } else {
      let tries=0; const t=setInterval(()=>{tries++; if(setupAdmin()||tries>=40)clearInterval(t)},150); setupAdmin();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
