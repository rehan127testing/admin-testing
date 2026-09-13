(function(){'use strict';
function B(){return window.WHAAdminRecheckBridge;}
function e(v){return B().esc(v==null?'':String(v));}
function boot(){
  var bridge=B(); if(!bridge)return;
  var nav=document.querySelector('.side__nav'),main=document.querySelector('.main');
  if(!nav||!main)return;
  var btn=document.querySelector('[data-view="rechecking"]');
  var sec=document.querySelector('[data-panel="rechecking"]');
  if(!btn){
    btn=document.createElement('button');btn.className='side__item';btn.type='button';btn.dataset.view='rechecking';
    btn.innerHTML='<svg viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6M6.5 17.5A8 8 0 0118 7M17.5 6.5A8 8 0 006 17"/></svg>Rechecking';
    var analytics=nav.querySelector('[data-view="analytics"]');nav.insertBefore(btn,analytics||null);
  }
  if(!sec){
    sec=document.createElement('section');sec.dataset.panel='rechecking';sec.hidden=true;
    sec.innerHTML='<header class="head"><div><h1 class="head__title">Rechecking</h1><p class="head__sub">Lifetime marking-appeal history. Admin can confirm, send back, ask the student to edit, or archive a request.</p></div><div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;"><select id="rch-filter" class="input" style="width:auto;"><option value="">All active history</option><option value="Open">Open</option><option value="Resolved">Resolved</option><option value="Archived">Archived / deleted</option></select><button class="btn btn--quiet btn--sm" id="rch-refresh" type="button">Refresh</button></div></header><div id="rch-list"><p class="muted">Loading…</p></div><div id="rch-detail" hidden></div>';
    main.appendChild(sec);
  }
  function activate(){
    document.querySelectorAll('.side__item[data-view]').forEach(function(x){x.classList.toggle('is-active',x===btn);});
    document.querySelectorAll('.main>[data-panel]').forEach(function(p){p.hidden=(p!==sec);});
  }
  btn.addEventListener('click',function(){activate();load();});
  sec.addEventListener('click',click);
  var f=document.getElementById('rch-filter'); if(f)f.addEventListener('change',load);
  var r=document.getElementById('rch-refresh'); if(r)r.addEventListener('click',load);
}
function label(r){
  if(r.archivedAt)return 'Archived';
  if(r.status==='Open'&&r.adminReviewStatus==='NeedsStudentInfo')return 'Waiting for student';
  if(r.status==='Open'&&r.adminReviewStatus==='NeedsReview')return 'Teacher review again';
  if(r.status==='Open')return 'Open';
  if(r.finalOutcome==='CheckingCorrect')return 'Checking confirmed correct';
  if(r.adminReviewStatus==='Confirmed')return 'Closed · confirmed';
  return 'Resolved · admin review pending';
}
function pill(r){
  var s=label(r),bg='#dbeafe',fg='#1e40af';
  if(s==='Open'||s.indexOf('Teacher')===0||s.indexOf('Waiting')===0){bg='#fef3c7';fg='#92400e';}
  if(s.indexOf('confirmed')>=0||s.indexOf('correct')>=0){bg='#d1fae5';fg='#065f46';}
  if(s==='Archived'){bg='#e5e7eb';fg='#374151';}
  return '<span style="padding:.2rem .55rem;border-radius:999px;background:'+bg+';color:'+fg+';font-size:.75rem;font-weight:800;">'+e(s)+'</span>';
}
function load(){
  var h=document.getElementById('rch-list'),d=document.getElementById('rch-detail'); if(!h)return;
  h.hidden=false;if(d)d.hidden=true;h.innerHTML='<p class="muted">Loading…</p>';
  var f=document.getElementById('rch-filter'),st=f?f.value:'';
  B().authed('bossbattle/admin/rechecks',{status:st}).then(function(data){
    var rows=data.requests||[];
    h.innerHTML=rows.length?rows.map(function(r){
      return '<article class="panel" style="margin-bottom:.7rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;'+(r.archivedAt?'opacity:.78;':'')+'"><div><strong>'+e(r.studentName)+'</strong> <span class="cell-sub">'+e(r.studentId)+'</span><div class="cell-sub">'+e(r.paperId)+' · Class '+e(r.classLevel)+' · '+e(r.subject)+' · Q '+e((r.claimedQuestionIds||[]).join(', '))+'</div><div style="margin-top:.35rem;">'+e(r.studentReason)+'</div><div class="cell-sub" style="margin-top:.3rem;">Request '+e(r.requestId)+(r.studentRevisionCount?' · student edits '+e(r.studentRevisionCount):'')+'</div></div><div style="display:flex;gap:.5rem;align-items:center;">'+pill(r)+'<button class="btn btn--secondary btn--sm" data-rch-open="'+e(r.requestId)+'">Open</button></div></article>';
    }).join(''):'<div class="empty"><h2>No requests in this view</h2><p>Change the filter or wait for a student claim.</p></div>';
  }).catch(function(x){h.innerHTML='';B().fail(x,'Could not load rechecking requests.');});
}
function qmap(d){var m={};(d.submission.items||[]).forEach(function(q){m[q.qId]=q;});return m;}
function detail(id){var l=document.getElementById('rch-list'),h=document.getElementById('rch-detail');l.hidden=true;h.hidden=false;h.innerHTML='<p class="muted">Loading…</p>';B().authed('bossbattle/admin/recheckDetail',{requestId:id}).then(renderDetail).catch(function(x){B().fail(x,'Could not load request.');});}
function auditHtml(r){var rows=Array.isArray(r.audit)?r.audit:[];if(!rows.length)return '';return '<details class="panel" style="margin-top:1rem;"><summary style="cursor:pointer;font-weight:800;">Audit history ('+rows.length+')</summary><div style="margin-top:.7rem;">'+rows.slice().reverse().map(function(a){return '<div style="padding:.55rem 0;border-top:1px solid #e5e7eb;"><strong>'+e(a.type||a.action||'Action')+'</strong> · '+e(a.role||'')+' · '+e(a.by||'')+'<div class="cell-sub">'+e(a.at||'')+'</div>'+(a.note?'<div>'+e(a.note)+'</div>':'')+'</div>';}).join('')+'</div></details>';}
function renderDetail(d){
  var r=d.request,m=qmap(d),before=(r.beforeSnapshot&&r.beforeSnapshot.questions)||[],bm={};before.forEach(function(x){bm[x.qId]=x;});
  var claimed=r.claimedQuestionIds||[],arch=!!r.archivedAt;
  var rows=claimed.map(function(qid){var q=m[qid]||{},b=bm[qid]||{};return '<div class="panel" style="margin:.7rem 0;border-left:4px solid #ef4444;"><strong>Q'+e(q.order||qid)+'. '+e(q.text||qid)+'</strong><div class="cell-sub" style="margin:.35rem 0;">Student answer: '+e(Array.isArray(q.yourAnswer)?q.yourAnswer.join(' → '):q.yourAnswer)+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;"><div style="padding:.6rem;background:#fef2f2;border-radius:8px;"><strong>Before</strong><br>'+e(b.awardedMarks)+' / '+e(b.maxMarks)+'<br>'+e(b.correction||'No feedback')+'</div><div style="padding:.6rem;background:#ecfdf5;border-radius:8px;"><strong>Current</strong><br>'+e(q.awardedMarks)+' / '+e(q.marks)+'<br>'+e(q.correction||'No feedback')+'</div></div>'+(!arch&&r.status==='Open'&&r.adminReviewStatus!=='NeedsStudentInfo'?'<div style="display:grid;grid-template-columns:120px 1fr;gap:.5rem;margin-top:.7rem;"><input class="input rch-mark" data-qid="'+e(qid)+'" type="number" min="0" max="'+e(q.marks)+'" step="0.5" value="'+e(q.awardedMarks)+'"><input class="input rch-corr" data-qid="'+e(qid)+'" value="'+e(q.correction||'')+'" placeholder="Correction / feedback"></div>':'')+'</div>';}).join('');
  var controls='';
  if(arch){
    controls='<div class="panel" style="margin-top:1rem;"><p><strong>Archived by:</strong> '+e(r.archivedBy||'Admin')+'</p><p>'+e(r.archiveReason||'No archive reason recorded.')+'</p><button class="btn btn--secondary" data-rch-control="Restore" data-id="'+e(r.requestId)+'">Restore card</button></div>';
  }else{
    controls='<div class="panel" style="margin-top:1rem;"><label class="field"><span class="field__label">Admin note for next action</span><textarea class="input" id="rch-admin-note" rows="3" placeholder="Explain the decision so Student and Teacher can understand it."></textarea></label><div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.7rem;">';
    if(r.status==='Open'&&r.adminReviewStatus!=='NeedsStudentInfo')controls+='<button class="btn btn--primary" data-rch-resolve="'+e(r.requestId)+'">Correct marks as Admin</button>';
    if(r.status==='Resolved'&&r.adminReviewStatus!=='Confirmed')controls+='<button class="btn btn--primary" data-rch-review="Confirmed" data-id="'+e(r.requestId)+'">Confirm teacher correction</button>';
    controls+='<button class="btn btn--secondary" data-rch-control="NeedsTeacherReview" data-id="'+e(r.requestId)+'">Send to teacher again</button>';
    controls+='<button class="btn btn--secondary" data-rch-control="NeedsStudentInfo" data-id="'+e(r.requestId)+'">Ask student to edit claim</button>';
    controls+='<button class="btn btn--secondary" data-rch-control="CheckingCorrect" data-id="'+e(r.requestId)+'">Mark checking correct</button>';
    controls+='<button class="btn btn--danger" data-rch-control="Archive" data-id="'+e(r.requestId)+'">Delete / archive from user views</button></div></div>';
  }
  document.getElementById('rch-detail').innerHTML='<button class="btn btn--quiet btn--sm" data-rch-back>‹ All requests</button><div class="head" style="margin-top:1rem;"><div><h1 class="head__title">Recheck · '+e(d.paper.title)+'</h1><p class="head__sub">'+e(r.studentName)+' · '+e(r.studentId)+' · '+e(r.paperId)+' · Request '+e(r.requestId)+'</p></div>'+pill(r)+'</div><div class="panel"><strong>Student claim</strong><p>'+e(r.studentReason)+'</p>'+(r.adminNote?'<p><strong>Latest Admin note:</strong> '+e(r.adminNote)+'</p>':'')+(r.teacherNote?'<p><strong>Latest Teacher note:</strong> '+e(r.teacherNote)+'</p>':'')+'</div>'+rows+controls+auditHtml(r);
}
function collect(){var g={};document.querySelectorAll('.rch-mark').forEach(function(x){var id=x.dataset.qid,c=document.querySelector('.rch-corr[data-qid="'+CSS.escape(id)+'"]');g[id]={marks:Number(x.value),correction:c?c.value:''};});return g;}
function note(){var x=document.getElementById('rch-admin-note');return x?x.value.trim():'';}
function control(id,action){var n=note();if(action!=='Restore'&&n.length<2){B().toast('Add a short Admin note first.','bad');return;}if(action==='Archive'&&!confirm('Hide this request from Student and Teacher? The audit record will be preserved and Admin can restore it later.'))return;B().authed('bossbattle/admin/recheckControl',{requestId:id,action:action,note:n}).then(function(){B().toast(action==='Archive'?'Request archived.':'Admin action saved.','ok');detail(id);}).catch(function(x){B().fail(x,'Could not apply Admin action.');});}
function click(ev){
  var t=ev.target.closest&&ev.target.closest('[data-rch-open],[data-rch-back],[data-rch-resolve],[data-rch-review],[data-rch-control]');if(!t)return;
  if(t.hasAttribute('data-rch-open'))return detail(t.getAttribute('data-rch-open'));
  if(t.hasAttribute('data-rch-back')){document.getElementById('rch-detail').hidden=true;document.getElementById('rch-list').hidden=false;return load();}
  if(t.hasAttribute('data-rch-control'))return control(t.getAttribute('data-id'),t.getAttribute('data-rch-control'));
  if(t.hasAttribute('data-rch-resolve')){var id=t.getAttribute('data-rch-resolve'),n=note();B().authed('bossbattle/admin/recheckResolve',{requestId:id,grades:collect(),note:n}).then(function(){B().toast('Marks corrected and request closed.','ok');detail(id);}).catch(function(x){B().fail(x,'Could not resolve recheck.');});return;}
  var st=t.getAttribute('data-rch-review'),id=t.getAttribute('data-id'),n=note();B().authed('bossbattle/admin/recheckReview',{requestId:id,reviewStatus:st,note:n}).then(function(){B().toast('Teacher correction confirmed.','ok');detail(id);}).catch(function(x){B().fail(x,'Could not review recheck.');});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
