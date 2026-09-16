/**
 * W.H. Academy — Teacher Theme System
 * 2026-09-16
 * Visual only. Does not change teacher auth, grading, Boss Papers or Rechecking.
 */
(function(){
  'use strict';

  const KEY='wha:teacher_theme';
  const THEMES={
    light:['Light','Clean · bright · focused'],
    dark:['Dark','Deep · calm · sharp'],
    midnight:['Midnight','Deep blue · premium'],
    ocean:['Ocean','Blue · cyan'],
    aurora:['Aurora','Teal · green glow'],
    forest:['Forest','Fresh · balanced'],
    gold:['Gold','Warm · academic'],
    sunset:['Sunset','Warm · energetic'],
    rose:['Rose','Soft · confident'],
    candy:['Candy','Pink · violet'],
    grape:['Grape','Violet · rich'],
    sky:['Sky','Blue · violet'],
    mint:['Mint','Fresh green · cyan'],
    lavender:['Lavender','Soft purple'],
    ember:['Ember','Red · orange']
  };

  let observer=null, queued=false;

  const saved=()=>{
    const t=localStorage.getItem(KEY)||'light';
    return THEMES[t]?t:'light';
  };

  function rgb(v){
    const m=String(v||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
    return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]==null?1:+m[4]}:null;
  }
  function lum(c){
    if(!c)return 0;
    const a=[c.r,c.g,c.b].map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});
    return .2126*a[0]+.7152*a[1]+.0722*a[2];
  }
  function saturation(c){
    if(!c)return 1;
    const mx=Math.max(c.r,c.g,c.b), mn=Math.min(c.r,c.g,c.b);
    return mx===0?0:(mx-mn)/mx;
  }


  function contrastRatio(a,b){
    const hi=Math.max(a,b), lo=Math.min(a,b);
    return (hi+.05)/(lo+.05);
  }
  function nearestPaintedBackground(el){
    let node=el;
    while(node && node!==document.body){
      const cs=getComputedStyle(node);
      if(/gradient/i.test(cs.backgroundImage||''))return {rgb:null,node,gradient:true};
      const bg=rgb(cs.backgroundColor);
      if(bg && bg.a>=.70)return {rgb:bg,node,gradient:false};
      node=node.parentElement;
    }
    return {rgb:rgb(getComputedStyle(document.body).backgroundColor),node:document.body,gradient:false};
  }
  function fixTextContrast(root){
    root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,small,strong,label,a,button,span,td,th').forEach(el=>{
      if(!(el instanceof HTMLElement))return;
      if(el.closest('.wha-teacher-sidebar,.wha-teacher-theme-modal'))return;
      if(!String(el.textContent||'').trim())return;
      if(el.classList.contains('wha-teacher-contrast-dark') || el.classList.contains('wha-teacher-contrast-light'))return;
      const fg=rgb(getComputedStyle(el).color);
      const bgInfo=nearestPaintedBackground(el);
      if(bgInfo.gradient||!fg||!bgInfo.rgb)return;
      const fl=lum(fg), bl=lum(bgInfo.rgb);
      if(contrastRatio(fl,bl)>=4.5)return;
      el.classList.add(bl>.5?'wha-teacher-contrast-dark':'wha-teacher-contrast-light');
    });
  }

  function normalize(){
    if(!document.body.classList.contains('wha-teacher-shell'))return;

    const selectors=[
      'article','section','div','table','thead','tbody','tr','td','th',
      'input','select','textarea','button'
    ].join(',');

    document.querySelectorAll(selectors).forEach(el=>{
      if(!(el instanceof HTMLElement))return;
      if(el.closest('.wha-teacher-sidebar,.wha-teacher-theme-modal'))return;

      const cs=getComputedStyle(el);
      const rect=el.getBoundingClientRect();

      if(
        !el.classList.contains('wha-teacher-gradient-surface') &&
        /gradient/i.test(cs.backgroundImage||'') &&
        rect.width>250 && rect.height>=42 && rect.height<=180
      ){
        el.classList.add('wha-teacher-gradient-surface');
      }

      if(el.classList.contains('wha-teacher-auto-surface') || el.classList.contains('wha-teacher-auto-control'))return;

      const bg=rgb(cs.backgroundColor);
      if(!bg || bg.a<.62)return;
      const isNeutralLight=lum(bg)>.76 && saturation(bg)<.24;
      if(!isNeutralLight)return;

      const tag=el.tagName.toLowerCase();
      if(['input','select','textarea','button'].includes(tag)){
        el.classList.add('wha-teacher-auto-control');
      }else{
        if(rect.width>110 && rect.height>34)el.classList.add('wha-teacher-auto-surface');
      }
    });

    fixTextContrast(document.body);
  }

  function queueNormalize(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;normalize();});
  }

  function apply(theme){
    const t=THEMES[theme]?theme:'light';
    document.documentElement.dataset.whaTeacherTheme=t;
    document.body.dataset.whaTeacherTheme=t;
    localStorage.setItem(KEY,t);
    document.querySelectorAll('.wha-teacher-contrast-dark,.wha-teacher-contrast-light').forEach(el=>{
      el.classList.remove('wha-teacher-contrast-dark','wha-teacher-contrast-light');
    });

    const label=document.querySelector('[data-teacher-theme-label]');
    if(label)label.textContent='Theme · '+THEMES[t][0];

    document.querySelectorAll('[data-teacher-theme-choice]').forEach(b=>{
      b.classList.toggle('is-selected',b.dataset.teacherThemeChoice===t);
      b.setAttribute('aria-pressed',b.dataset.teacherThemeChoice===t?'true':'false');
    });
    queueNormalize();
  }

  function modal(){
    let m=document.getElementById('wha-teacher-theme-modal');
    if(m)return m;
    m=document.createElement('div');
    m.id='wha-teacher-theme-modal';
    m.className='wha-teacher-theme-modal';
    m.hidden=true;
    const cards=Object.entries(THEMES).map(([k,v])=>`
      <button type="button" class="wha-teacher-theme-card wha-teacher-theme-card--${k}" data-teacher-theme-choice="${k}" aria-pressed="false">
        <span class="wha-teacher-theme-preview"><i></i><i></i><i></i></span>
        <strong>${v[0]}</strong><small>${v[1]}</small>
      </button>`).join('');
    m.innerHTML=`
      <div class="wha-teacher-theme-backdrop" data-teacher-theme-close></div>
      <section class="wha-teacher-theme-panel" role="dialog" aria-modal="true">
        <header><div><span>Teacher appearance</span><h2>Choose your workspace theme</h2><p>Only visuals change. Grading and student data stay untouched.</p></div>
        <button type="button" class="wha-teacher-theme-close" data-teacher-theme-close aria-label="Close">×</button></header>
        <div class="wha-teacher-theme-grid">${cards}</div>
      </section>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{
      const c=e.target.closest('[data-teacher-theme-choice]');
      if(c){apply(c.dataset.teacherThemeChoice);return;}
      if(e.target.closest('[data-teacher-theme-close]'))m.hidden=true;
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)m.hidden=true;});
    return m;
  }

  function control(){
    const side=document.querySelector('.wha-teacher-sidebar');
    if(!side)return false;
    if(side.querySelector('[data-teacher-theme-button]'))return true;

    let footer=side.querySelector('.wha-staff-sidebar__footer');
    if(!footer){
      footer=document.createElement('div');
      footer.className='wha-staff-sidebar__footer';
      side.appendChild(footer);
    }

    const b=document.createElement('button');
    b.type='button';
    b.className='wha-staff-nav-item wha-teacher-theme-button';
    b.dataset.teacherThemeButton='true';
    b.innerHTML='<span class="wha-staff-nav-icon" aria-hidden="true">◐</span><span data-teacher-theme-label>Theme</span>';
    b.addEventListener('click',()=>{const m=modal();m.hidden=false;apply(saved());});
    footer.insertBefore(b,footer.firstChild);
    return true;
  }

  function boot(){
    if(!document.body.classList.contains('wha-teacher-shell'))return false;
    control();
    modal();
    apply(saved());
    if(!observer){
      observer=new MutationObserver(queueNormalize);
      observer.observe(document.body,{childList:true,subtree:true});
    }
    queueNormalize();
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(boot()||tries>=40)clearInterval(timer)},150);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
