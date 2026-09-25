/**
 * W.H. Academy — Staff Notification Center
 * Admin + Teacher top-right bell
 * 2026-09-25
 *
 * Backend: v9.3
 * Routes:
 *   staff/notifications/list
 *   staff/notifications/markRead
 *   staff/notifications/markAllRead
 *
 * This module intentionally uses the existing authenticated bridges:
 *   window.WHAAdminRecheckBridge
 *   window.WHATeacherRecheckBridge
 *
 * It never reads tokens directly and never talks to Supabase tables directly.
 */
(function () {
  'use strict';

  if (window.WHAStaffNotifications) return;

  const POLL_MS = 30000;
  const bellSvg =
    '<svg viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>' +
    '<path stroke-linecap="round" d="M10 21h4"/>' +
    '</svg>';

  const state = {
    role: '',
    notifications: [],
    unreadCount: 0,
    loadedOnce: false,
    loading: false,
    mounted: false,
    panelOpen: false,
    seenIds: new Set()
  };

  let pollTimer = null;
  let authObserver = null;

  function isVisible(el) {
    if (!el || el.hidden) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function roleInfo() {
    const teacherApp = document.getElementById('t-app');
    if (teacherApp && isVisible(teacherApp) && window.WHATeacherRecheckBridge) {
      return { role: 'Teacher', bridge: window.WHATeacherRecheckBridge };
    }

    const adminApp = document.getElementById('console');
    if (adminApp && isVisible(adminApp) && window.WHAAdminRecheckBridge) {
      return { role: 'Admin', bridge: window.WHAAdminRecheckBridge };
    }

    return null;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatTime(value) {
    const d = new Date(String(value || ''));
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(d);
    } catch (_) {
      return d.toLocaleString();
    }
  }

  function typeLabel(type) {
    const labels = {
      BossSubmission: 'Boss Battle',
      Recheck: 'Rechecking',
      Announcement: 'Announcement',
      Security: 'Security',
      AccountStatus: 'Account'
    };
    return labels[String(type || '')] || 'Update';
  }

  function countText(value) {
    const n = Number(value) || 0;
    return n > 99 ? '99+' : String(n);
  }

  function currentBridge() {
    const info = roleInfo();
    return info && info.bridge;
  }

  function call(operation, params) {
    const bridge = currentBridge();
    if (!bridge || typeof bridge.authed !== 'function') {
      return Promise.reject(new Error('Staff session is not available.'));
    }
    return bridge.authed(operation, params || {});
  }

  function toast(message, kind) {
    const bridge = currentBridge();
    if (bridge && typeof bridge.toast === 'function') {
      bridge.toast(message, kind || '');
    }
  }

  function ensureBell() {
    if (document.querySelector('[data-wha-staff-notification-trigger]')) {
      updateBadge();
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wha-staff-notification-bell';
    button.setAttribute('data-wha-staff-notification-trigger', '1');
    button.setAttribute('aria-label', 'Open notifications');
    button.setAttribute('aria-haspopup', 'dialog');
    button.title = 'Notifications';
    button.innerHTML =
      '<span class="wha-staff-notification-bell__icon">' + bellSvg + '</span>' +
      '<span class="wha-staff-notification-badge" data-wha-staff-notification-count hidden>0</span>';
    button.addEventListener('click', openPanel);

    if (state.role === 'Teacher') {
      const topbar = document.querySelector('#t-app .t-topbar');
      const signout = document.getElementById('t-signout');
      if (topbar) {
        const host = el('span', 'wha-staff-notification-host wha-staff-notification-host--teacher');
        host.appendChild(button);
        if (signout && signout.parentElement === topbar) topbar.insertBefore(host, signout);
        else topbar.appendChild(host);
        return;
      }
    }

    const host = el('div', 'wha-staff-notification-host wha-staff-notification-host--admin');
    host.appendChild(button);
    document.body.appendChild(host);
  }

  function removeBell() {
    document.querySelectorAll('.wha-staff-notification-host').forEach((node) => node.remove());
  }

  function updateBadge() {
    document.querySelectorAll('[data-wha-staff-notification-count]').forEach((badge) => {
      const count = Number(state.unreadCount) || 0;
      badge.textContent = countText(count);
      badge.hidden = count <= 0;
      badge.setAttribute('aria-label', count + ' unread notification' + (count === 1 ? '' : 's'));
    });
  }

  function ensurePanel() {
    if (document.getElementById('wha-staff-notification-backdrop')) return;

    const backdrop = el('div', 'wha-staff-notification-backdrop');
    backdrop.id = 'wha-staff-notification-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closePanel();
    });

    const panel = el('section', 'wha-staff-notification-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'wha-staff-notification-title');

    const header = el('div', 'wha-staff-notification-panel__header');
    const headingWrap = el('div', 'wha-staff-notification-panel__heading');
    const heading = el('h2', '', 'Notifications');
    heading.id = 'wha-staff-notification-title';
    const subtitle = el('p', '', 'Action-needed updates for your role');
    headingWrap.append(heading, subtitle);

    const close = el('button', 'wha-staff-notification-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close notifications');
    close.addEventListener('click', closePanel);

    header.append(headingWrap, close);

    const toolbar = el('div', 'wha-staff-notification-toolbar');
    const count = el('span', 'wha-staff-notification-toolbar__count', '');
    count.id = 'wha-staff-notification-unread';
    const markAll = el('button', 'wha-staff-notification-mark-all', 'Mark all as read');
    markAll.type = 'button';
    markAll.id = 'wha-staff-notification-mark-all';
    markAll.addEventListener('click', markAllRead);
    toolbar.append(count, markAll);

    const list = el('div', 'wha-staff-notification-list');
    list.id = 'wha-staff-notification-list';
    list.setAttribute('aria-live', 'polite');

    panel.append(header, toolbar, list);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
  }

  function normalize(payload) {
    const rows = Array.isArray(payload && payload.notifications) ? payload.notifications : [];
    return {
      unreadCount: Math.max(0, Number(payload && payload.unreadCount) || 0),
      notifications: rows.map((row) => ({
        notificationId: String(row.notificationId || ''),
        notificationType: String(row.notificationType || ''),
        title: String(row.title || ''),
        message: String(row.message || ''),
        createdAt: String(row.createdAt || ''),
        expiresAt: row.expiresAt || null,
        isRead: !!row.isRead,
        readAt: row.readAt || null
      })).filter((row) => row.notificationId)
    };
  }

  function render() {
    updateBadge();
    ensurePanel();

    const list = document.getElementById('wha-staff-notification-list');
    const count = document.getElementById('wha-staff-notification-unread');
    const markAll = document.getElementById('wha-staff-notification-mark-all');
    if (!list || !count || !markAll) return;

    count.textContent = state.unreadCount
      ? state.unreadCount + ' unread'
      : 'You are all caught up';
    markAll.hidden = state.unreadCount <= 0;
    markAll.disabled = state.loading;

    list.replaceChildren();

    if (state.loading && !state.loadedOnce) {
      const box = el('div', 'wha-staff-notification-state');
      box.append(
        el('div', 'wha-staff-notification-state__icon', '…'),
        el('strong', '', 'Loading notifications'),
        el('p', '', 'Getting the latest updates for your role.')
      );
      list.appendChild(box);
      return;
    }

    if (!state.notifications.length) {
      const box = el('div', 'wha-staff-notification-state');
      box.append(
        el('div', 'wha-staff-notification-state__icon', '✓'),
        el('strong', '', 'No notifications yet'),
        el('p', '', 'Only meaningful and action-needed updates will appear here.')
      );
      list.appendChild(box);
      return;
    }

    state.notifications.forEach((item) => {
      const card = el('article',
        'wha-staff-notification-item' + (item.isRead ? '' : ' is-unread'));

      const top = el('div', 'wha-staff-notification-item__top');
      const type = el('span', 'wha-staff-notification-type', typeLabel(item.notificationType));
      const time = el('time', 'wha-staff-notification-time', formatTime(item.createdAt));
      if (item.createdAt) time.dateTime = item.createdAt;
      top.append(type, time);

      const titleRow = el('div', 'wha-staff-notification-item__title-row');
      if (!item.isRead) {
        const dot = el('span', 'wha-staff-notification-unread-dot');
        dot.setAttribute('aria-label', 'Unread');
        titleRow.appendChild(dot);
      }
      titleRow.appendChild(
        el('h3', 'wha-staff-notification-item__title',
          item.title || 'W.H. Academy notification')
      );

      const message = el('p', 'wha-staff-notification-item__message', item.message || '');
      card.append(top, titleRow, message);

      if (!item.isRead) {
        const footer = el('div', 'wha-staff-notification-item__footer');
        const readButton = el('button', 'wha-staff-notification-read', 'Mark as read');
        readButton.type = 'button';
        readButton.addEventListener('click', (event) => {
          event.stopPropagation();
          markRead(item.notificationId);
        });
        footer.appendChild(readButton);
        card.appendChild(footer);

        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Mark notification as read: ' + (item.title || 'Notification'));
        card.addEventListener('click', (event) => {
          if (!event.target.closest('button')) markRead(item.notificationId);
        });
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            markRead(item.notificationId);
          }
        });
      }

      list.appendChild(card);
    });
  }

  function maybeToast(nextRows) {
    const nextIds = new Set(nextRows.map((row) => row.notificationId));
    if (!state.loadedOnce) {
      state.seenIds = nextIds;
      return;
    }

    nextRows
      .filter((row) => !row.isRead && !state.seenIds.has(row.notificationId))
      .slice(0, 2)
      .forEach((row) => {
        toast((row.title ? row.title + ': ' : '') + row.message, 'ok');
      });

    state.seenIds = nextIds;
  }

  async function refresh(userInitiated) {
    if (!state.mounted || state.loading || !navigator.onLine) return;
    state.loading = true;
    if (state.panelOpen) render();

    try {
      const payload = await call('staff/notifications/list', {});
      const next = normalize(payload);
      maybeToast(next.notifications);
      state.notifications = next.notifications;
      state.unreadCount = next.unreadCount;
      state.loadedOnce = true;
    } catch (err) {
      if (userInitiated) {
        toast((err && err.message) || 'Could not load notifications.', 'bad');
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  async function markRead(notificationId) {
    const id = String(notificationId || '');
    const item = state.notifications.find((row) => row.notificationId === id);
    if (!item || item.isRead) return;

    item.isRead = true;
    item.readAt = new Date().toISOString();
    state.unreadCount = Math.max(0, state.unreadCount - 1);
    render();

    try {
      await call('staff/notifications/markRead', { notificationId: id });
    } catch (err) {
      item.isRead = false;
      item.readAt = null;
      state.unreadCount += 1;
      render();
      toast((err && err.message) || 'Could not mark notification as read.', 'bad');
    }
  }

  async function markAllRead() {
    const unread = state.notifications.filter((row) => !row.isRead);
    if (!unread.length) return;

    const previous = state.unreadCount;
    unread.forEach((row) => {
      row.isRead = true;
      row.readAt = new Date().toISOString();
    });
    state.unreadCount = 0;
    render();

    try {
      await call('staff/notifications/markAllRead', {});
    } catch (err) {
      unread.forEach((row) => {
        row.isRead = false;
        row.readAt = null;
      });
      state.unreadCount = previous;
      render();
      toast((err && err.message) || 'Could not mark notifications as read.', 'bad');
    }
  }

  function openPanel() {
    ensurePanel();
    const backdrop = document.getElementById('wha-staff-notification-backdrop');
    if (!backdrop) return;

    state.panelOpen = true;
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    document.body.classList.add('wha-staff-notification-open');
    render();
    refresh(true);

    const close = backdrop.querySelector('.wha-staff-notification-close');
    if (close) close.focus();
  }

  function closePanel() {
    const backdrop = document.getElementById('wha-staff-notification-backdrop');
    if (!backdrop) return;

    state.panelOpen = false;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('wha-staff-notification-open');
    setTimeout(() => {
      if (!state.panelOpen) backdrop.hidden = true;
    }, 180);

    const trigger = document.querySelector('[data-wha-staff-notification-trigger]');
    if (trigger) trigger.focus();
  }

  function mount(role) {
    if (state.mounted && state.role === role) {
      ensureBell();
      return;
    }

    unmount();
    state.role = role;
    state.mounted = true;
    state.loadedOnce = false;
    state.loading = false;
    state.notifications = [];
    state.unreadCount = 0;
    state.seenIds = new Set();

    document.body.dataset.whaNotificationRole = role.toLowerCase();
    ensureBell();
    ensurePanel();
    render();
    refresh(false);

    pollTimer = window.setInterval(() => {
      if (!document.hidden && navigator.onLine) refresh(false);
    }, POLL_MS);
  }

  function unmount() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    removeBell();
    const backdrop = document.getElementById('wha-staff-notification-backdrop');
    if (backdrop) backdrop.remove();
    document.body.classList.remove('wha-staff-notification-open');
    delete document.body.dataset.whaNotificationRole;

    state.mounted = false;
    state.panelOpen = false;
  }

  function syncAuthState() {
    const info = roleInfo();
    if (!info) {
      if (state.mounted) unmount();
      return;
    }
    mount(info.role);
  }

  function boot() {
    syncAuthState();

    let queued = false;
    authObserver = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        syncAuthState();
      });
    });

    authObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'style', 'aria-hidden']
    });

    window.addEventListener('focus', () => {
      syncAuthState();
      if (state.mounted) refresh(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncAuthState();
        if (state.mounted) refresh(false);
      }
    });
    window.addEventListener('online', () => {
      if (state.mounted) refresh(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.panelOpen) closePanel();
    });
  }

  window.WHAStaffNotifications = {
    refresh: () => refresh(true),
    open: openPanel,
    close: closePanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
