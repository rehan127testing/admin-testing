(function () {
  'use strict';

  function bridge() { return window.WHATeacherRecheckBridge; }
  function esc(value) {
    var b = bridge();
    return b ? b.esc(value == null ? '' : String(value)) : String(value == null ? '' : value);
  }

  function injectStyles() {
    if (document.getElementById('wha-teacher-attention-styles')) return;
    var style = document.createElement('style');
    style.id = 'wha-teacher-attention-styles';
    style.textContent = [
      '.t-attn{margin:0 0 1rem;padding:1rem;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow)}',
      '.t-attn__head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:.75rem}',
      '.t-attn__title{display:flex;align-items:center;gap:.55rem;font-weight:800;color:var(--ink)}',
      '.t-attn__dot{width:.6rem;height:.6rem;border-radius:999px;background:var(--warn);box-shadow:0 0 0 4px color-mix(in srgb,var(--warn) 14%,transparent)}',
      '.t-attn.is-clear .t-attn__dot{background:var(--ok);box-shadow:0 0 0 4px color-mix(in srgb,var(--ok) 14%,transparent)}',
      '.t-attn__counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem;margin-bottom:.75rem}',
      '.t-attn__count{padding:.65rem .75rem;background:var(--line-soft);border:1px solid var(--line);border-radius:var(--r-md)}',
      '.t-attn__num{display:block;font-size:1.35rem;line-height:1.1;font-weight:800;color:var(--brand-deep);font-variant-numeric:tabular-nums}',
      '.t-attn__label{display:block;margin-top:.15rem;font-size:.75rem;color:var(--muted)}',
      '.t-attn__list{display:flex;flex-direction:column;gap:.5rem}',
      '.t-attn__item{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.7rem .8rem;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface)}',
      '.t-attn__item-main{min-width:0}',
      '.t-attn__item-title{font-weight:700;color:var(--ink)}',
      '.t-attn__meta{font-size:.8rem;color:var(--muted);overflow-wrap:anywhere}',
      '.t-attn__empty{padding:.75rem;border:1px dashed var(--line);border-radius:var(--r-md);color:var(--muted);text-align:center}',
      '.t-attn__error{padding:.75rem;border:1px solid var(--line);border-radius:var(--r-md);color:var(--bad)}',
      '@media(max-width:42rem){.t-attn__counts{grid-template-columns:1fr}.t-attn__item{align-items:flex-start;flex-direction:column}.t-attn__item .btn{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureAttentionCard() {
    var app = document.getElementById('t-app');
    var tabs = app && app.querySelector('.t-tabs');
    if (!app || !tabs) return null;
    var host = document.getElementById('t-needs-attention');
    if (host) return host;
    host = document.createElement('section');
    host.id = 't-needs-attention';
    host.className = 't-attn';
    host.setAttribute('aria-live', 'polite');
    host.innerHTML = '<div class="t-attn__head"><div class="t-attn__title"><span class="t-attn__dot" aria-hidden="true"></span><span>Needs Attention</span></div><button class="btn btn--quiet btn--sm" type="button" data-attn-refresh>Refresh</button></div><div id="t-attn-body"><p class="muted" style="margin:0">Loading action queue…</p></div>';
    tabs.parentNode.insertBefore(host, tabs);
    host.addEventListener('click', onAttentionClick);
    return host;
  }

  function activateTab(name) {
    var tab = document.querySelector('.t-tab[data-tab="' + name + '"]');
    if (tab) tab.click();
  }

  function onAttentionClick(event) {
    var target = event.target.closest && event.target.closest('[data-attn-refresh],[data-attn-go]');
    if (!target) return;
    if (target.hasAttribute('data-attn-refresh')) return loadAttention();
    var destination = target.getAttribute('data-attn-go');
    if (destination === 'grading') activateTab('grading');
    if (destination === 'rechecking') activateTab('rechecking');
  }

  function loadAttention() {
    var b = bridge();
    var host = ensureAttentionCard();
    var body = document.getElementById('t-attn-body');
    if (!b || !host || !body || document.getElementById('t-app').hidden) return;
    body.innerHTML = '<p class="muted" style="margin:0">Loading action queue…</p>';
    b.authed('teacher/needsAttention', {}).then(function (data) {
      var counts = data.counts || {};
      var items = data.items || [];
      var total = Number(counts.total) || 0;
      var boss = Number(counts.ungradedSubmissions) || 0;
      var rechecks = Number(counts.rechecksNeedingReview) || 0;
      host.classList.toggle('is-clear', total === 0);
      var html = '<div class="t-attn__counts">' +
        countBox(total, 'Total pending') +
        countBox(boss, 'Boss grading') +
        countBox(rechecks, 'Rechecks') +
        '</div>';
      if (!items.length) {
        html += '<div class="t-attn__empty"><strong>You\'re all caught up.</strong><br>No Boss submission or returned recheck currently needs your action.</div>';
      } else {
        html += '<div class="t-attn__list">' + items.map(attentionItem).join('') + '</div>';
      }
      body.innerHTML = html;
    }).catch(function (err) {
      body.innerHTML = '<div class="t-attn__error">Could not load the action queue. Use Refresh to try again.</div>';
      b.fail(err, 'Could not load Needs Attention.');
    });
  }

  function countBox(value, label) {
    return '<div class="t-attn__count"><span class="t-attn__num">' + esc(value) + '</span><span class="t-attn__label">' + esc(label) + '</span></div>';
  }

  function attentionItem(item) {
    var isRecheck = item.kind === 'Recheck';
    var destination = isRecheck ? 'rechecking' : 'grading';
    var action = isRecheck ? 'Open rechecking' : 'Open grading';
    var classText = item.classLevel ? ' · Class ' + esc(item.classLevel) : '';
    var paperText = item.paperId ? ' · Paper ' + esc(item.paperId) : '';
    return '<div class="t-attn__item"><div class="t-attn__item-main"><div class="t-attn__item-title">' + esc(item.title || (isRecheck ? 'Rechecking needs review' : 'Boss Battle needs grading')) + '</div><div class="t-attn__meta">' + esc(item.studentName || 'Student') + ' · ' + esc(item.subject || '') + classText + paperText + '</div></div><button class="btn btn--secondary btn--sm" type="button" data-attn-go="' + destination + '">' + action + '</button></div>';
  }

  function ensureRechecking() {
    var b = bridge();
    var tabs = document.querySelector('.t-tabs');
    var app = document.getElementById('t-app');
    if (!b || !tabs || !app) return;
    var tab = document.querySelector('[data-tab="rechecking"]');
    var panel = document.querySelector('[data-panel="rechecking"]');
    if (!tab) {
      tab = document.createElement('button');
      tab.className = 't-tab'; tab.type = 'button'; tab.dataset.tab = 'rechecking'; tab.textContent = 'Rechecking';
      tabs.appendChild(tab);
    }
    if (!panel) {
      panel = document.createElement('section');
      panel.dataset.panel = 'rechecking'; panel.hidden = true;
      panel.innerHTML = '<header class="head"><div><h1 class="head__title">Rechecking</h1><p class="head__sub">Lifetime history for marking claims in your assigned subjects. Resolved cards stay visible unless Admin archives them.</p></div><div style="display:flex;gap:.5rem;align-items:center;"><select id="tr-filter" class="input" style="width:auto;"><option value="">All history</option><option value="Open">Open</option><option value="Resolved">Resolved</option></select><button class="btn btn--quiet btn--sm" id="tr-refresh" type="button">Refresh</button></div></header><div id="tr-list"><p class="muted">Loading…</p></div><div id="tr-detail" hidden></div>';
      app.appendChild(panel);
    }
    tab.addEventListener('click', function () {
      document.querySelectorAll('.t-tab').forEach(function (x) { x.setAttribute('aria-current', x === tab ? 'true' : 'false'); });
      document.querySelectorAll('#t-app [data-panel]').forEach(function (p) { p.hidden = p !== panel; });
      loadRechecks();
    });
    panel.addEventListener('click', onRecheckClick);
    var refresh = document.getElementById('tr-refresh'); if (refresh) refresh.addEventListener('click', loadRechecks);
    var filter = document.getElementById('tr-filter'); if (filter) filter.addEventListener('change', loadRechecks);
  }

  function recheckLabel(row) {
    if (row.status === 'Open' && row.adminReviewStatus === 'NeedsStudentInfo') return 'Waiting for student';
    if (row.status === 'Open' && row.adminReviewStatus === 'NeedsReview') return 'Admin sent back';
    if (row.status === 'Open') return 'Open';
    if (row.finalOutcome === 'CheckingCorrect') return 'Closed · checking correct';
    if (row.adminReviewStatus === 'Confirmed') return 'Closed · confirmed';
    return 'Resolved · admin review pending';
  }

  function loadRechecks() {
    var list = document.getElementById('tr-list');
    var detail = document.getElementById('tr-detail');
    if (!list || !bridge()) return;
    list.hidden = false; if (detail) detail.hidden = true;
    list.innerHTML = '<p class="muted">Loading…</p>';
    var filter = document.getElementById('tr-filter');
    bridge().authed('teacher/rechecks', { status: filter ? filter.value : '' }).then(function (data) {
      var rows = data.requests || [];
      list.innerHTML = rows.length ? rows.map(function (row) {
        return '<div class="pp-row"><div class="pp-row__main"><div class="pp-row__title">' + esc(row.studentName) + ' · ' + esc(row.paperId) + '</div><div class="cell-sub">Class ' + esc(row.classLevel) + ' · ' + esc(row.subject) + ' · Questions ' + esc((row.claimedQuestionIds || []).join(', ')) + '</div><div style="margin-top:.3rem;">' + esc(row.studentReason) + '</div><div class="cell-sub" style="margin-top:.3rem;">Request ' + esc(row.requestId) + (row.studentRevisionCount ? ' · student edits ' + esc(row.studentRevisionCount) : '') + '</div></div><div class="pp-row__side"><span class="gr-pill gr-pill--' + (row.status === 'Open' ? 'recheckrequested' : 'graded') + '">' + esc(recheckLabel(row)) + '</span><button class="btn btn--secondary btn--sm" data-tr-open="' + esc(row.requestId) + '">Open</button></div></div>';
      }).join('') : '<div class="empty"><p>No rechecking requests for your subjects in this view.</p></div>';
    }).catch(function (err) { bridge().fail(err, 'Could not load rechecks.'); });
  }

  function openRecheck(id) {
    var list = document.getElementById('tr-list');
    var host = document.getElementById('tr-detail');
    if (!host) return;
    if (list) list.hidden = true; host.hidden = false; host.innerHTML = '<p class="muted">Loading…</p>';
    bridge().authed('teacher/recheckDetail', { requestId: id }).then(renderRecheck).catch(function (err) { bridge().fail(err, 'Could not load recheck.'); });
  }

  function renderRecheck(data) {
    var r = data.request || {}, submission = data.submission || {}, paper = data.paper || {};
    var before = (r.beforeSnapshot && r.beforeSnapshot.questions) || [], beforeMap = {}, itemMap = {};
    before.forEach(function (x) { beforeMap[x.qId] = x; });
    (submission.items || []).forEach(function (x) { itemMap[x.qId] = x; });
    var waiting = r.adminReviewStatus === 'NeedsStudentInfo';
    var canEdit = r.status === 'Open' && !waiting;
    var questions = (r.claimedQuestionIds || []).map(function (id) {
      var q = itemMap[id] || {}, old = beforeMap[id] || {};
      var answer = Array.isArray(q.yourAnswer) ? q.yourAnswer.join(' → ') : q.yourAnswer;
      var edit = canEdit ? '<div class="gr-q__grade"><label>Rechecked marks <input class="input tr-mark" data-qid="' + esc(id) + '" type="number" min="0" max="' + esc(q.marks) + '" step="0.5" value="' + esc(q.awardedMarks) + '"></label><label>Correction / explanation <textarea class="input tr-corr" data-qid="' + esc(id) + '" rows="2">' + esc(q.correction || '') + '</textarea></label></div>' : '';
      return '<div class="gr-q"><div class="gr-q__head"><strong>Q' + esc(q.order || id) + '. ' + esc(q.text || id) + '</strong><span>' + esc(q.marks) + ' marks</span></div><div class="gr-q__ans"><strong>Student answer</strong><div>' + esc(answer) + '</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.6rem 0;"><div class="panel"><strong>Original</strong><br>' + esc(old.awardedMarks) + ' / ' + esc(old.maxMarks) + '<br>' + esc(old.correction || 'No feedback') + '</div><div class="panel"><strong>Current</strong><br>' + esc(q.awardedMarks) + ' / ' + esc(q.marks) + '<br>' + esc(q.correction || 'No feedback') + '</div></div>' + edit + '</div>';
    }).join('');
    var action = waiting ? '<div class="panel" style="margin-top:1rem"><strong>Waiting for student clarification.</strong><p>Admin asked the student to edit or explain the claim. You cannot resubmit marks until the student responds.</p></div>' : canEdit ? '<div class="panel" style="margin-top:1rem"><label class="field"><span class="field__label">Teacher recheck note</span><textarea class="input" id="tr-note" rows="3" placeholder="Explain what you confirmed or corrected."></textarea></label><button class="btn btn--primary" data-tr-resolve="' + esc(r.requestId) + '">Submit corrected recheck</button></div>' : '<div class="panel" style="margin-top:1rem">This request remains in your history. Current Admin review: <strong>' + esc(r.adminReviewStatus) + '</strong>' + (r.adminNote ? '<p><strong>Admin note:</strong> ' + esc(r.adminNote) + '</p>' : '') + '</div>';
    document.getElementById('tr-detail').innerHTML = '<button class="btn btn--quiet btn--sm" data-tr-back>‹ All rechecks</button><div class="head" style="margin-top:1rem"><div><h1 class="head__title">' + esc(paper.title) + '</h1><p class="head__sub">' + esc(r.studentName) + ' · ' + esc(r.studentId) + ' · Paper ' + esc(r.paperId) + ' · ' + esc(recheckLabel(r)) + '</p></div></div><div class="panel"><strong>Student claim</strong><p>' + esc(r.studentReason) + '</p>' + (r.adminNote ? '<p><strong>Admin note:</strong> ' + esc(r.adminNote) + '</p>' : '') + '</div>' + questions + action;
  }

  function collectGrades() {
    var grades = {};
    document.querySelectorAll('.tr-mark').forEach(function (input) {
      var id = input.dataset.qid;
      var correction = document.querySelector('.tr-corr[data-qid="' + CSS.escape(id) + '"]');
      grades[id] = { marks: Number(input.value), correction: correction ? correction.value : '' };
    });
    return grades;
  }

  function onRecheckClick(event) {
    var target = event.target.closest && event.target.closest('[data-tr-open],[data-tr-back],[data-tr-resolve]');
    if (!target) return;
    if (target.hasAttribute('data-tr-open')) return openRecheck(target.getAttribute('data-tr-open'));
    if (target.hasAttribute('data-tr-back')) return loadRechecks();
    var id = target.getAttribute('data-tr-resolve');
    bridge().authed('teacher/recheckResolve', { requestId: id, grades: collectGrades(), note: (document.getElementById('tr-note') || {}).value || '' }).then(function () {
      bridge().toast('Recheck submitted. The card stays in history for Admin review.', 'ok');
      openRecheck(id); loadAttention();
    }).catch(function (err) { bridge().fail(err, 'Could not submit recheck.'); });
  }

  function watchLogin() {
    var app = document.getElementById('t-app');
    if (!app) return;
    var wasVisible = !app.hidden;
    if (wasVisible) loadAttention();
    new MutationObserver(function () {
      var visible = !app.hidden;
      if (visible && !wasVisible) loadAttention();
      wasVisible = visible;
    }).observe(app, { attributes: true, attributeFilter: ['hidden'] });
  }

  function boot() {
    if (!bridge()) return;
    injectStyles();
    ensureRechecking();
    ensureAttentionCard();
    watchLogin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
