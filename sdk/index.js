/**
 * Analytics Engine tracking SDK.
 *
 * Usage:
 *   <script src="https://cdn.example.com/index.js"
 *           data-tracking-id="TP-xxxx"
 *           data-api-base="https://host/analytics-backend"
 *           defer></script>
 */
(() => {
  'use strict';

  // ==== configuration ====================================================

  const sdkScriptTag = document.currentScript;
  const TRACKING_PROPERTY_ID = sdkScriptTag?.getAttribute('data-tracking-id');
  const API_BASE_URL = sdkScriptTag?.getAttribute('data-api-base');

  if (!TRACKING_PROPERTY_ID) {
    console.error('[AE SDK] missing data-tracking-id on script tag; tracking disabled');
    return;
  }
  if (!API_BASE_URL) {
    console.error('[AE SDK] missing data-api-base on script tag; tracking disabled');
    return;
  }

  const SESSION_START_URL = `${API_BASE_URL}/api/v1/session/start`;
  const SESSION_END_URL = `${API_BASE_URL}/api/v1/session/end`;
  const EVENT_REGISTER_URL = `${API_BASE_URL}/api/v1/event/register`;

  const STORAGE_KEY_VISITOR = '_ae_visitor';
  const STORAGE_KEY_SESSION = '_ae_session';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const BATCH_MAX_SIZE = 10;
  const BATCH_FLUSH_INTERVAL_MS = 5000;
  const SCROLL_MILESTONES = [25, 50, 75, 100];

  // Mirrors com.analytics.engine.backend.enums.EventType — keep in sync with the backend.
  const EventType = {
    PAGE_VIEW: 'PAGE_VIEW',
    BUTTON_CLICK: 'BUTTON_CLICK',
    LINK_CLICK: 'LINK_CLICK',
    SCROLL: 'SCROLL',
    FORM_SUBMIT: 'FORM_SUBMIT',
  };

  // ==== generic utilities =================================================

  /** @returns {string} Current time as an ISO-8601 UTC string (matches `Instant` on the backend). */
  const nowIso = () => new Date().toISOString();

  /**
   * Generates a v4 UUID, preferring the native crypto API with a Math.random fallback
   * for older browsers.
   * @returns {string}
   */
  const generateUUID = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // ==== visitor & session persistence =====================================
  // localStorage (not sessionStorage) for both visitor and session so a visit
  // spanning multiple tabs shares one session instead of one per tab.

  /**
   * Reads and JSON-parses a localStorage key, swallowing any storage/parse errors.
   * @param {string} key
   * @returns {*|null} Parsed value, or null if missing or unavailable.
   */
  const readStorage = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  /**
   * JSON-stringifies and writes a value to localStorage. Errors (private browsing,
   * quota exceeded, storage disabled) are swallowed — tracking must never break the host page.
   * @param {string} key
   * @param {*} value
   */
  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage disabled/full/private-mode — tracking degrades silently, never breaks the host page
    }
  };

  /** @returns {{visitorId: string, firstSeen: string}|null} The stored visitor, or null if none yet. */
  const getStoredVisitor = () => readStorage(STORAGE_KEY_VISITOR);

  /**
   * Returns the stored visitor, creating and persisting a new one (fresh visitorId +
   * firstSeen) the first time this browser is ever seen.
   * @returns {{visitorId: string, firstSeen: string}}
   */
  const ensureVisitor = () => {
    let storedVisitor = getStoredVisitor();
    if (!storedVisitor) {
      storedVisitor = { visitorId: generateUUID(), firstSeen: nowIso() };
      writeStorage(STORAGE_KEY_VISITOR, storedVisitor);
    }
    return storedVisitor;
  };

  /** @returns {object|null} The stored session, or null if none exists. */
  const getStoredSession = () => readStorage(STORAGE_KEY_SESSION);

  /** Persists the session object to localStorage. @param {object} session */
  const saveSession = (session) => writeStorage(STORAGE_KEY_SESSION, session);

  /**
   * @param {object|null} session
   * @param {number} now - `Date.now()` timestamp to compare against.
   * @returns {boolean} True if there's no session, or its last activity is older than SESSION_TIMEOUT_MS.
   */
  const hasSessionExpired = (session, now) =>
    !session || now - new Date(session.lastActivityAt).getTime() >= SESSION_TIMEOUT_MS;

  // ==== network transport ==================================================

  /**
   * Fires a JSON POST via fetch with `keepalive` so the request can survive page teardown.
   * Network/parse errors are swallowed — analytics must never surface errors to the host page.
   * @param {string} url
   * @param {object} data
   */
  const postJson = (url, data) => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true
    }).catch(() => {});
  };

  /**
   * Sends a JSON POST via `navigator.sendBeacon` for calls fired during unload/tab-hide,
   * falling back to a regular fetch post if the beacon can't be queued (unsupported, or
   * payload over the beacon size limit).
   * @param {string} url
   * @param {object} data
   */
  const postJsonBeacon = (url, data) => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const queuedByBrowser = navigator.sendBeacon?.(url, blob);
    if (!queuedByBrowser) postJson(url, data);
  };

  // ==== session lifecycle ==================================================

  let visitor;
  let currentSession;

  /**
   * POSTs /session/start for a newly created session.
   * @param {object} session
   */
  const sendSessionStart = (session) => {
    postJson(SESSION_START_URL, {
      trackingId: TRACKING_PROPERTY_ID,
      visitorId: visitor.visitorId,
      sessionId: session.sessionId,
      firstSeen: visitor.firstSeen,
      startedAt: session.startedAt,
      lastActivityAt: session.startedAt,
      landingPage: location.pathname,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  /**
   * POSTs /session/end for a session that is ending (or was found already expired).
   * @param {object} session
   * @param {string} endedAt - ISO timestamp to record as the end time. Pass the session's
   *   own lastActivityAt (not "now") when ending a session discovered expired after the fact,
   *   so duration isn't inflated by how long it sat idle before anyone noticed.
   * @param {string} exitPage
   */
  const sendSessionEnd = (session, endedAt, exitPage) => {
    postJsonBeacon(SESSION_END_URL, {
      trackingId: TRACKING_PROPERTY_ID,
      visitorId: visitor.visitorId,
      sessionId: session.sessionId,
      endedAt,
      lastActivityAt: session.lastActivityAt,
      lastSeen: endedAt,
      exitPage,
      pageViews: session.pageViews,
      eventCount: session.eventCount,
      bounced: session.eventCount <= 1
    });
  };

  /**
   * Creates, persists, and announces (/session/start) a brand-new session.
   * @returns {object} The new session.
   */
  const startNewSession = () => {
    const ts = nowIso();
    const session = { sessionId: generateUUID(), startedAt: ts, lastActivityAt: ts, pageViews: 0, eventCount: 0 };
    saveSession(session);
    sendSessionStart(session);
    return session;
  };

  /**
   * Returns the currently valid session, transparently rotating to a new one if the stored
   * session has expired (ending the old one first). Always re-reads from localStorage rather
   * than trusting the in-memory cache — another tab may have already rotated the session while
   * this tab was idle, and re-reading lets this tab pick that up instead of diverging from it.
   * @returns {object}
   */
  const ensureActiveSession = () => {
    const now = Date.now();
    let session = getStoredSession();
    if (hasSessionExpired(session, now)) {
      if (session) sendSessionEnd(session, session.lastActivityAt, location.pathname);
      session = startNewSession();
    }
    currentSession = session;
    return session;
  };

  // ==== outgoing event queue ===============================================
  // TODO(backend): /api/v1/event/register only accepts a single EventRequest, so this
  // queue can only smooth *flush timing* client-side — every queued item still becomes
  // its own HTTP call. Real batching needs a backend batch endpoint (e.g. EventRequest[])
  // backed by a message queue (Kafka/SQS/RabbitMQ) so the SDK can hand off N events in
  // one call and the backend fans them out asynchronously.

  const eventQueue = [];

  /**
   * Sends every currently queued event and empties the queue.
   * @param {boolean} useBeacon - Use sendBeacon instead of fetch (for unload/tab-hide flushes).
   */
  const flushEventQueue = (useBeacon) => {
    if (!eventQueue.length) return;
    const items = eventQueue.splice(0, eventQueue.length);
    for (const item of items) {
      useBeacon ? postJsonBeacon(EVENT_REGISTER_URL, item) : postJson(EVENT_REGISTER_URL, item);
    }
  };

  /**
   * Adds an event to the outgoing queue, flushing immediately once it hits the batch size cap.
   * @param {object} eventRequest
   */
  const enqueueEvent = (eventRequest) => {
    eventQueue.push(eventRequest);
    if (eventQueue.length >= BATCH_MAX_SIZE) flushEventQueue(false);
  };

  // ==== core tracking ======================================================

  /**
   * Core tracking entry point: validates the eventType, rotates/extends the session, and
   * queues the resulting EventRequest for delivery. Every autocapture handler and the
   * public API below funnel through this one function.
   * @param {string} eventType - One of the EventType enum values.
   * @param {object} [payload] - Arbitrary event-specific properties.
   */
  const track = (eventType, payload) => {
    if (!EventType[eventType]) {
      console.warn('[AE SDK] unknown eventType:', eventType);
      return;
    }
    const session = ensureActiveSession();
    const ts = nowIso();
    session.lastActivityAt = ts;
    session.eventCount += 1;
    if (eventType === EventType.PAGE_VIEW) session.pageViews += 1;
    saveSession(session);

    enqueueEvent({
      visitorId: visitor.visitorId,
      sessionId: session.sessionId,
      trackingId: TRACKING_PROPERTY_ID,
      eventType,
      eventTime: ts,
      lastActivityAt: ts,
      payload: payload ?? {},
      pagePath: location.pathname,
      pageTitle: document.title
    });
  };

  /** Fires the single PAGE_VIEW event for this page load. */
  const firePageView = () => track(EventType.PAGE_VIEW, {});

  // ==== autocapture: clicks ================================================
  // Full autocapture by default. Clicks are only classified into LINK_CLICK/BUTTON_CLICK
  // for semantically interactive elements (links, buttons, submits, role=button) —
  // clicks on plain divs/spans are not tracked, since the fixed backend EventType enum
  // has no generic "click" bucket to put them in.

  /** @param {MouseEvent} e */
  const handleClick = (e) => {
    const interactiveTarget = e.target.closest?.('a[href], button, [type="submit"], [role="button"]');
    if (!interactiveTarget) return;

    let eventType;
    let payload;

    if (interactiveTarget.tagName === 'A') {
      eventType = EventType.LINK_CLICK;
      payload = { href: interactiveTarget.href, text: interactiveTarget.textContent.trim().slice(0, 200) };
    } else {
      eventType = EventType.BUTTON_CLICK;
      payload = { text: interactiveTarget.textContent.trim().slice(0, 200), id: interactiveTarget.id || undefined };
    }

    track(eventType, payload);
  };

  // ==== autocapture: form submit ===========================================

  /** @param {SubmitEvent} e */
  const handleFormSubmit = (e) => {
    const submittedForm = e.target;
    track(EventType.FORM_SUBMIT, {
      formId: submittedForm.id || undefined,
      formName: submittedForm.getAttribute('name') || undefined,
      action: submittedForm.action
    });
  };

  // ==== autocapture: scroll depth ==========================================

  const reachedScrollMilestones = new Set();

  /**
   * Computes current scroll depth as a percentage and fires a SCROLL event the first time
   * each milestone (25/50/75/100) is crossed for this page load.
   */
  const checkScrollDepthMilestones = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const scrolledPct = Math.round((scrollTop / docHeight) * 100);
    for (const milestone of SCROLL_MILESTONES) {
      if (scrolledPct >= milestone && !reachedScrollMilestones.has(milestone)) {
        reachedScrollMilestones.add(milestone);
        track(EventType.SCROLL, { depth: milestone });
      }
    }
  };

  // rAF-throttled so a fast scroll doesn't run checkScrollDepthMilestones dozens of times per second.
  let isScrollUpdateScheduled = false;
  const handleScroll = () => {
    if (isScrollUpdateScheduled) return;
    isScrollUpdateScheduled = true;
    requestAnimationFrame(() => {
      checkScrollDepthMilestones();
      isScrollUpdateScheduled = false;
    });
  };

  // ==== exit handling ======================================================
  // visibilitychange->hidden only flushes the queue (cheap, safe, fires on every tab
  // switch). pagehide is the actual best-effort /session/end signal since it approximates
  // "this page instance is going away" (navigation, close, refresh) much better than
  // visibilitychange, which also fires on a harmless alt-tab.
  //
  // Known v1 limitation: if the page is restored from bfcache after pagehide fired
  // (pageshow with persisted=true), the SDK has no way to "unsend" that session/end — it
  // will just keep sending events under the same sessionId if still inside the 30 min
  // window. Rare in practice; not engineered around for v1.

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flushEventQueue(true);
  };

  const handlePageHide = () => {
    flushEventQueue(true);
    if (currentSession) {
      sendSessionEnd(currentSession, nowIso(), location.pathname);
    }
  };

  // ==== orchestration ======================================================
  // Everything above is a definition; main() is the only place that actually
  // registers listeners, starts timers, and kicks off the first session/pageview.

  const main = () => {
    document.addEventListener('click', handleClick, false);
    document.addEventListener('submit', handleFormSubmit, false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    setInterval(() => flushEventQueue(false), BATCH_FLUSH_INTERVAL_MS);

    visitor = ensureVisitor();
    ensureActiveSession();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', firePageView);
    } else {
      firePageView();
    }
  };

  main();

  // TODO(v2): SPA route-change tracking. Patch history.pushState/replaceState and listen
  // to popstate to emit a synthetic PAGE_VIEW on virtual navigations — plain browser
  // navigation events don't fire for client-side routing, so SPA embedders currently only
  // get one pageview for the whole session no matter how many routes they visit.

  // TODO(v2): periodic heartbeat. Right now session activity only extends via real tracked
  // events, so a user who opens a long page and reads/scrolls-without-crossing-a-milestone
  // without any other interaction can have their session expire after 30 min while the tab
  // is still open, undercounting true engagement time. A heartbeat (~5 min interval, paused
  // while the tab is hidden) would fix that, at the cost of a recurring background request
  // per session and needing its own throttling story on mobile, where backgrounded-tab
  // timers get deprioritized/frozen by the OS and won't fire reliably anyway.

  // TODO(v2): split this file into src/config.js, storage.js, transport.js, session.js,
  // eventQueue.js, tracking.js (+ an index.js entry) once we add a bundler (esbuild) —
  // deferred because document.currentScript only works reading attrs off a classic
  // top-level <script>, so real ES modules need a build step to stay a single drop-in file.
})();
