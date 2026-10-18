/**
 * KomeFlow live-comment overlay - Content Script (Main Page)
 * Includes Hidden Chat Frame Fallback so comments flow even when Chat Sidebar is CLOSED/HIDDEN or in Fullscreen.
 */

(function () {
  'use strict';

  if (window.__komeflow_extension_injected) return;
  window.__komeflow_extension_injected = true;

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  /* ==========================================================================
     GPU-accelerated KomeFlow rendering engine
     ========================================================================== */
  class GPUCompositorEngine {
    constructor(overlayContainer, playerContainer) {
      this.overlay = overlayContainer;
      this.container = playerContainer;

      this.lanes = [];
      this.animations = new Set();

      this.config = {
        enabled: true,
        displayMode: 'flow',
        maxComments: 20,
        fontSize: 42,
        flowDuration: 5.0,
        strokeColor: '#000000',
        strokeWidth: 6,
        displayArea: 1.0,
        opacity: 1.0
      };

      this.activeCount = 0;
      this.measureCtx = document.createElement('canvas').getContext('2d');
      this.updateLanesCount();
    }

    getContainerWidth() {
      return (this.container && this.container.clientWidth > 100)
        ? this.container.clientWidth
        : (window.innerWidth || 1280);
    }

    getContainerHeight() {
      return (this.container && this.container.clientHeight > 100)
        ? this.container.clientHeight
        : (window.innerHeight || 720);
    }

    updateLanesCount() {
      const containerHeight = this.getContainerHeight();
      const laneHeight = this.config.fontSize * (this.config.displayMode === 'left-fixed' ? 1.4 : 1.25);
      const maxAvailableHeight = containerHeight * this.config.displayArea;
      const numLanes = Math.max(1, Math.floor(maxAvailableHeight / laneHeight));

      if (this.lanes.length !== numLanes) {
        const oldLanes = this.lanes;
        this.lanes = new Array(numLanes).fill(null);
        for (let i = 0; i < Math.min(oldLanes.length, numLanes); i++) {
          this.lanes[i] = oldLanes[i];
        }
      }
    }

    setConfig(newConfig) {
      const next = { ...this.config, ...newConfig };
      this.config = {
        enabled: typeof next.enabled === 'boolean' ? next.enabled : true,
        displayMode: ['flow', 'left-fixed', 'top-bottom-fixed'].includes(next.displayMode)
          ? next.displayMode
          : 'flow',
        maxComments: Math.round(clampNumber(next.maxComments, 3, 60, 20)),
        fontSize: Math.round(clampNumber(next.fontSize, 20, 80, 42)),
        flowDuration: clampNumber(next.flowDuration, 2, 10, 5),
        strokeColor: /^#[0-9a-f]{6}$/i.test(next.strokeColor) ? next.strokeColor : '#000000',
        strokeWidth: Math.round(clampNumber(next.strokeWidth, 0, 12, 6)),
        displayArea: clampNumber(next.displayArea, 0.33, 1, 1),
        opacity: clampNumber(next.opacity, 0.3, 1, 1)
      };
      this.updateLanesCount();

      if (this.overlay) {
        this.overlay.style.opacity = this.config.opacity;
        this.overlay.style.display = this.config.enabled ? 'block' : 'none';
      }
    }

    parseCommentCommands(text, customColor = '#FFFFFF') {
      let color = customColor;
      let cleanText = text.trim();

      if (/^(red|赤)\s*/i.test(cleanText)) {
        color = '#ff3366';
        cleanText = cleanText.replace(/^(red|赤)\s*/i, '');
      } else if (/^(cyan|シアン|青)\s*/i.test(cleanText)) {
        color = '#00f0ff';
        cleanText = cleanText.replace(/^(cyan|シアン|青)\s*/i, '');
      } else if (/^(yellow|黄)\s*/i.test(cleanText)) {
        color = '#ffcc00';
        cleanText = cleanText.replace(/^(yellow|黄)\s*/i, '');
      } else if (/^(green|緑)\s*/i.test(cleanText)) {
        color = '#00ff88';
        cleanText = cleanText.replace(/^(green|緑)\s*/i, '');
      } else if (/^(pink|ピンク)\s*/i.test(cleanText)) {
        color = '#ff66cc';
        cleanText = cleanText.replace(/^(pink|ピンク)\s*/i, '');
      }

      return { cleanText, color };
    }

    measureTextWidth(text, fontSize) {
      this.measureCtx.font = `800 ${fontSize}px 'Yu Gothic UI', 'Meiryo', sans-serif`;
      return Math.max(30, this.measureCtx.measureText(text).width);
    }

    animateComment(commentEl, keyframes, timing) {
      const animation = commentEl.animate(keyframes, timing);
      this.animations.add(animation);

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        this.animations.delete(animation);
        commentEl.remove();
        this.activeCount = Math.max(0, this.activeCount - 1);
      };

      animation.addEventListener('finish', cleanup, { once: true });
      animation.addEventListener('cancel', cleanup, { once: true });
      return animation;
    }

    clearComments() {
      for (const animation of [...this.animations]) {
        animation.cancel();
      }
      this.animations.clear();
      this.overlay?.querySelectorAll('.komeflow-comment').forEach((node) => node.remove());
      this.activeCount = 0;
      this.lanes.fill(null);
    }

    destroy() {
      this.clearComments();
      this.lanes = [];
    }

    addComment(rawText, options = {}) {
      if (!this.config.enabled || !rawText) return;
      if (this.activeCount >= (this.config.maxComments || 20)) return;

      const mode = this.config.displayMode || 'flow';
      const { cleanText } = this.parseCommentCommands(rawText);
      if (!cleanText) return;

      if (mode === 'left-fixed') {
        this.addLeftFixedComment(rawText, options);
      } else if (mode === 'top-bottom-fixed') {
        this.addCenterFixedComment(rawText, options);
      } else {
        this.addFlowComment(rawText, options);
      }
    }

    addFlowComment(rawText, options = {}) {
      const containerWidth = this.getContainerWidth();
      const { cleanText, color } = this.parseCommentCommands(rawText, options.color || '#FFFFFF');
      const fontSize = options.fontSize || this.config.fontSize;

      const textWidth = this.measureTextWidth(cleanText, fontSize);
      const durationMs = (options.flowDuration || this.config.flowDuration) * 1000;
      const totalDistance = containerWidth + textWidth + 100;
      const velocity = totalDistance / durationMs;

      const laneIndex = this.findOptimalLaneFlow(containerWidth, textWidth, velocity);
      const laneHeight = fontSize * 1.25;
      const topY = laneIndex * laneHeight;

      const startX = containerWidth + 10;
      const endX = -textWidth - 100;

      const commentEl = document.createElement('div');
      commentEl.className = 'komeflow-comment';
      commentEl.textContent = cleanText;
      commentEl.style.top = `${topY}px`;
      commentEl.style.fontSize = `${fontSize}px`;
      commentEl.style.color = options.isSuperChat ? '#ffd700' : color;
      commentEl.style.setProperty('--komeflow-stroke-color', this.config.strokeColor);
      commentEl.style.setProperty('--komeflow-stroke-width', `${this.config.strokeWidth}px`);
      commentEl.style.transform = `translate3d(${startX}px, 0, 0)`;

      this.overlay.appendChild(commentEl);
      this.activeCount++;

      const now = performance.now();
      this.lanes[laneIndex] = {
        startTime: now,
        durationMs: durationMs,
        velocity: velocity,
        width: textWidth,
        lane: laneIndex
      };

      this.animateComment(
        commentEl,
        [
          { transform: `translate3d(${startX}px, 0, 0)` },
          { transform: `translate3d(${endX}px, 0, 0)` }
        ],
        { duration: durationMs, easing: 'linear', fill: 'forwards' }
      );
    }

    addLeftFixedComment(rawText, options = {}) {
      const { cleanText, color } = this.parseCommentCommands(rawText, options.color || '#FFFFFF');
      const fontSize = options.fontSize || this.config.fontSize;
      const durationMs = (options.flowDuration || this.config.flowDuration) * 1000;

      const laneIndex = this.findOptimalLaneFixed(durationMs);
      const laneHeight = fontSize * 1.4;
      const topY = laneIndex * laneHeight + 10;

      const commentEl = document.createElement('div');
      commentEl.className = 'komeflow-comment mode-left-fixed';
      commentEl.textContent = cleanText;
      commentEl.style.top = `${topY}px`;
      commentEl.style.fontSize = `${fontSize}px`;
      commentEl.style.color = options.isSuperChat ? '#ffd700' : color;
      commentEl.style.setProperty('--komeflow-stroke-color', this.config.strokeColor);
      commentEl.style.setProperty('--komeflow-stroke-width', `${this.config.strokeWidth}px`);

      this.overlay.appendChild(commentEl);
      this.activeCount++;

      const now = performance.now();
      this.lanes[laneIndex] = {
        startTime: now,
        durationMs: durationMs
      };

      this.animateComment(
        commentEl,
        [
          { transform: 'translate3d(-40px, 0, 0)', opacity: 0, offset: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: 0.1 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: 0.85 },
          { transform: 'translate3d(-30px, 0, 0)', opacity: 0, offset: 1 }
        ],
        { duration: durationMs, easing: 'ease-out', fill: 'forwards' }
      );
    }

    addCenterFixedComment(rawText, options = {}) {
      const { cleanText, color } = this.parseCommentCommands(rawText, options.color || '#FFFFFF');
      const fontSize = options.fontSize || this.config.fontSize;
      const durationMs = (options.flowDuration || this.config.flowDuration) * 1000;

      const laneIndex = this.findOptimalLaneFixed(durationMs);
      const laneHeight = fontSize * 1.3;
      const topY = laneIndex * laneHeight + 10;

      const commentEl = document.createElement('div');
      commentEl.className = 'komeflow-comment mode-center-fixed';
      commentEl.textContent = cleanText;
      commentEl.style.top = `${topY}px`;
      commentEl.style.fontSize = `${fontSize}px`;
      commentEl.style.color = options.isSuperChat ? '#ffd700' : color;
      commentEl.style.setProperty('--komeflow-stroke-color', this.config.strokeColor);
      commentEl.style.setProperty('--komeflow-stroke-width', `${this.config.strokeWidth}px`);

      this.overlay.appendChild(commentEl);
      this.activeCount++;

      const now = performance.now();
      this.lanes[laneIndex] = {
        startTime: now,
        durationMs: durationMs
      };

      this.animateComment(
        commentEl,
        [
          { opacity: 0, transform: 'translate3d(-50%, -10px, 0)', offset: 0 },
          { opacity: 1, transform: 'translate3d(-50%, 0, 0)', offset: 0.1 },
          { opacity: 1, transform: 'translate3d(-50%, 0, 0)', offset: 0.88 },
          { opacity: 0, transform: 'translate3d(-50%, 10px, 0)', offset: 1 }
        ],
        { duration: durationMs, easing: 'ease-in-out', fill: 'forwards' }
      );
    }

    findOptimalLaneFlow(containerWidth, newWidth, newVelocity) {
      this.updateLanesCount();
      const numLanes = this.lanes.length;
      if (numLanes === 0) return 0;

      const now = performance.now();
      const MIN_GAP = 30;

      for (let i = 0; i < numLanes; i++) {
        const prev = this.lanes[i];
        if (!prev) return i;

        const elapsedTime = now - prev.startTime;
        const prevX = (containerWidth + 10) - (prev.velocity * elapsedTime);
        const prevRightEdge = prevX + prev.width;

        if (prevRightEdge + MIN_GAP <= containerWidth) {
          if (newVelocity <= prev.velocity) {
            return i;
          }
          const timeToExitPrev = prevRightEdge / prev.velocity;
          const distanceNewMoves = newVelocity * timeToExitPrev;
          if ((containerWidth - distanceNewMoves) >= (prevRightEdge - (prev.velocity * timeToExitPrev) + MIN_GAP)) {
            return i;
          }
        }
      }

      let bestLane = 0;
      let oldestTime = Infinity;
      for (let i = 0; i < numLanes; i++) {
        const prev = this.lanes[i];
        if (!prev) return i;
        if (prev.startTime < oldestTime) {
          oldestTime = prev.startTime;
          bestLane = i;
        }
      }

      return bestLane;
    }

    findOptimalLaneFixed(durationMs) {
      this.updateLanesCount();
      const numLanes = this.lanes.length;
      if (numLanes === 0) return 0;

      const now = performance.now();

      for (let i = 0; i < numLanes; i++) {
        const prev = this.lanes[i];
        if (!prev) return i;

        if (now - prev.startTime >= prev.durationMs) {
          return i;
        }
      }

      let bestLane = 0;
      let oldestTime = Infinity;
      for (let i = 0; i < numLanes; i++) {
        const prev = this.lanes[i];
        if (!prev) return i;
        if (prev.startTime < oldestTime) {
          oldestTime = prev.startTime;
          bestLane = i;
        }
      }

      return bestLane;
    }
  }

  /* ==========================================================================
     Initialization & Messaging & Hidden Chat Frame Fallback
     ========================================================================== */
  const DEFAULT_SETTINGS = {
    enabled: true,
    displayMode: 'flow',
    maxComments: 20,
    fontSize: 42,
    flowDuration: 5.0,
    displayArea: 1.0,
    strokeColor: '#000000',
    strokeWidth: 6,
    opacity: 1.0,
    timeShiftEnabled: false,
    timeShiftConsentGranted: false
  };

  const MESSAGE_TTL_MS = 15000;
  const MAX_SEEN_MESSAGES = 500;
  const MAX_PENDING_COMMENTS = 50;
  const TIME_SHIFT_MAX_ENTRIES = 50000;
  const LIVE_EDGE_THRESHOLD_SECONDS = 8;
  const REPLAY_LOOKAHEAD_SECONDS = 0.35;
  const CHAT_FALLBACK_GRACE_MS = 3000;
  const LIVE_CHAT_URL_PATTERN = /^https:\/\/www\.youtube\.com\/live_chat(?:_replay)?(?:[/?]|$)/;

  let engine = null;
  let initRetryTimer = null;
  let navigationTimer = null;
  let chatSourceInterval = null;
  let activeVideoId = '';
  let pageGeneration = 0;
  let liveChatSeenVideoId = '';
  let chatFrameUnavailableSince = 0;
  let timeShiftTimer = null;
  let timeShiftEnabled = false;
  let timeShiftPreferenceEnabled = false;
  let timeShiftConsentGranted = false;
  let timeShiftVideo = null;
  let timeShiftVideoId = '';
  let timeShiftComments = [];
  let timeShiftMessageIds = new Set();
  let timeShiftReplayCursor = 0;
  let timeShiftLastPlaybackTime = null;
  let calibratedLiveMediaTime = null;
  let calibratedLiveWallTime = null;
  let wasTimeShifted = false;
  let pendingBufferWrites = [];
  let bufferFlushTimer = null;
  const seenMessages = new Map();
  const pendingComments = [];

  function getVideoId() {
    if (window.location.pathname !== '/watch' &&
        !/^\/live\/[a-zA-Z0-9_-]{11}(?:\/|$)/.test(window.location.pathname)) return '';
    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/watch') {
      const videoId = urlParams.get('v') || '';
      return /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : '';
    }
    const match = window.location.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : '';
  }

  // Other <video> elements (e.g. home-feed inline previews) can precede the
  // main player in document order.
  function getMainVideo() {
    return document.querySelector('#movie_player video.html5-main-video') ||
      document.querySelector('#movie_player video') ||
      document.querySelector('video');
  }

  function isExtensionContextValid() {
    try {
      return Boolean(chrome.runtime?.id);
    } catch (error) {
      return false;
    }
  }

  function safeSendMessage(message, callback) {
    if (!isExtensionContextValid()) return false;
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        callback?.(error ? null : response, error);
      });
      return true;
    } catch (error) {
      callback?.(null, error);
      return false;
    }
  }

  // YouTube keeps #chatframe in the DOM while chat is collapsed (user-hidden or
  // during ads) and points it at about:blank, so existence alone is not enough.
  function isChatFrameLoaded(frame) {
    if (!frame?.isConnected) return false;
    if (frame.closest('ytd-live-chat-frame')?.hasAttribute('collapsed')) return false;
    try {
      return LIVE_CHAT_URL_PATTERN.test(frame.contentWindow?.location.href || '');
    } catch (error) {
      return LIVE_CHAT_URL_PATTERN.test(frame.src || '');
    }
  }

  /**
   * Ensures live chat is being read EVEN IF the user hides/closes the chat sidebar on YouTube!
   */
  function ensureChatSource() {
    const videoId = getVideoId();
    const hiddenFrame = document.getElementById('komeflow-hidden-chatframe');
    if (!videoId) {
      hiddenFrame?.remove();
      return;
    }
    initializeTimeShift(videoId);

    // Regular videos have no chat frame; remember chat once seen so that
    // layouts which temporarily drop it (e.g. fullscreen) keep the fallback.
    // For ~2 s after an SPA navigation ytd-watch-flexy still carries the
    // previous video's id and chat frame, so only trust it once it matches.
    const watchFlexy = document.querySelector('ytd-watch-flexy');
    const flexyVideoId = watchFlexy?.getAttribute('video-id');
    if ((!flexyVideoId || flexyVideoId === videoId) && watchFlexy?.querySelector('ytd-live-chat-frame')) {
      liveChatSeenVideoId = videoId;
    }

    const visibleChatFrame = document.querySelector('iframe#chatframe:not(#komeflow-hidden-chatframe)');

    // Use exactly one chat source. Keeping both frames creates duplicate comments.
    if (isChatFrameLoaded(visibleChatFrame)) {
      chatFrameUnavailableSince = 0;
      hiddenFrame?.remove();
      return;
    }
    if (liveChatSeenVideoId !== videoId) {
      hiddenFrame?.remove();
      return;
    }

    // Visible chat is collapsed, unloaded or missing (hidden sidebar, ads, fullscreen)
    if (hiddenFrame?.dataset.videoId === videoId) return;
    hiddenFrame?.remove();
    // Give YouTube's own frame a moment to load before starting a second one.
    const now = Date.now();
    if (!chatFrameUnavailableSince) chatFrameUnavailableSince = now;
    if (now - chatFrameUnavailableSince < CHAT_FALLBACK_GRACE_MS) return;
    if (!document.body) return;

    const newHiddenFrame = document.createElement('iframe');
    newHiddenFrame.id = 'komeflow-hidden-chatframe';
    newHiddenFrame.dataset.videoId = videoId;
    newHiddenFrame.title = 'YouTube live chat source';
    newHiddenFrame.tabIndex = -1;
    newHiddenFrame.setAttribute('aria-hidden', 'true');
    newHiddenFrame.style.cssText = 'position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;border:0!important;opacity:0!important;pointer-events:none!important;';
    newHiddenFrame.src = `https://www.youtube.com/live_chat?v=${encodeURIComponent(videoId)}&embed_domain=${encodeURIComponent(window.location.hostname)}`;
    document.body.appendChild(newHiddenFrame);
  }

  function scheduleInit(delay = 1000) {
    clearTimeout(initRetryTimer);
    initRetryTimer = setTimeout(initOverlay, delay);
  }

  function flushPendingComments() {
    if (!engine) return;
    while (pendingComments.length > 0) {
      const comment = pendingComments.shift();
      renderComment(comment);
    }
  }

  function pruneSeenMessages(now) {
    for (const [id, timestamp] of seenMessages) {
      if (now - timestamp <= MESSAGE_TTL_MS && seenMessages.size <= MAX_SEEN_MESSAGES) break;
      seenMessages.delete(id);
    }
  }

  function renderComment(comment) {
    if (!comment?.text) return;
    if (engine) {
      engine.addComment(comment.text, { isSuperChat: comment.isSuperChat });
    } else {
      pendingComments.push(comment);
      if (pendingComments.length > MAX_PENDING_COMMENTS) pendingComments.shift();
    }
  }

  function getLivePlaybackState(video = getMainVideo()) {
    if (!video) return null;

    const player = document.querySelector('#movie_player');
    // Ads play in the same <video>; their currentTime is not stream time.
    if (player?.classList.contains('ad-showing')) return null;
    // No media loaded (player error, source switch): currentTime is 0 rather
    // than stream time while the live-head badge may still be shown.
    if (video.readyState === 0) return null;

    let seekableEnd = video.currentTime;
    if (video.seekable?.length) {
      try {
        seekableEnd = video.seekable.end(video.seekable.length - 1);
      } catch (error) {}
    }

    const liveBadge = player?.querySelector('.ytp-live-badge');
    // YouTube no longer consistently exposes an infinite media duration or the
    // legacy `ytp-live` class. `ytp-livebadge-color` is also set on regular
    // videos, so rely on the live badge actually being displayed.
    const isLiveBadgeShown = Boolean(liveBadge) && getComputedStyle(liveBadge).display !== 'none';
    const isActiveLive = video.duration === Infinity ||
      player?.classList.contains('ytp-live') ||
      isLiveBadgeShown;
    const hasLiveHeadSignal = liveBadge?.classList.contains('ytp-live-badge-is-livehead') === true;
    const isAtLiveEdge = hasLiveHeadSignal ||
      (!isLiveBadgeShown && Math.max(0, seekableEnd - video.currentTime) <= LIVE_EDGE_THRESHOLD_SECONDS);

    // Some long-running YouTube streams expose a seekable end far ahead of the
    // actual live head. Calibrate from YouTube's own live-head indicator and
    // advance that media time using the wall clock while the viewer is rewound.
    if (isAtLiveEdge) {
      calibratedLiveMediaTime = video.currentTime;
      calibratedLiveWallTime = Date.now();
    }
    const liveEdge = calibratedLiveMediaTime === null
      ? seekableEnd
      : calibratedLiveMediaTime + Math.max(0, Date.now() - calibratedLiveWallTime) / 1000;

    return {
      video,
      isActiveLive,
      isAtLiveEdge,
      currentTime: video.currentTime,
      liveEdge,
      secondsBehindLive: Math.max(0, liveEdge - video.currentTime)
    };
  }

  function lowerBoundCommentTime(playbackTime) {
    let low = 0;
    let high = timeShiftComments.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (timeShiftComments[middle].playbackTime < playbackTime) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function resetReplayCursor(playbackTime, clearVisible = true) {
    timeShiftReplayCursor = lowerBoundCommentTime(Math.max(0, playbackTime - 0.25));
    timeShiftLastPlaybackTime = playbackTime - 0.25;
    if (clearVisible) engine?.clearComments();
  }

  function mergeTimeShiftComments(entries) {
    let requiresSort = false;
    for (const entry of entries || []) {
      if (!entry?.messageId || timeShiftMessageIds.has(entry.messageId)) continue;
      if (!Number.isFinite(entry.playbackTime) || !entry.text) continue;
      const previous = timeShiftComments[timeShiftComments.length - 1];
      if (previous && entry.playbackTime < previous.playbackTime) requiresSort = true;
      timeShiftMessageIds.add(entry.messageId);
      timeShiftComments.push({
        messageId: String(entry.messageId),
        text: String(entry.text).slice(0, 500),
        isSuperChat: entry.isSuperChat === true,
        playbackTime: Number(entry.playbackTime),
        receivedAt: Number(entry.receivedAt) || Date.now()
      });
    }

    if (requiresSort) timeShiftComments.sort((a, b) => a.playbackTime - b.playbackTime);
    if (timeShiftComments.length > TIME_SHIFT_MAX_ENTRIES) {
      const removedCount = timeShiftComments.length - TIME_SHIFT_MAX_ENTRIES;
      timeShiftComments.splice(0, removedCount);
      timeShiftReplayCursor = Math.max(0, timeShiftReplayCursor - removedCount);
      timeShiftMessageIds = new Set(timeShiftComments.map((comment) => comment.messageId));
    }
  }

  function sendBufferWrite(entries) {
    // Callback form: promise-returning sendMessage needs Chrome 99+, while the
    // manifest allows Chrome 93.
    safeSendMessage({ action: 'bufferComments', entries }, (response, error) => {
      if (error || response?.status !== 'ok') {
        console.warn('KomeFlow: failed to persist time-shift comments', error?.message || response?.status);
      }
    });
  }

  function flushBufferWrites() {
    clearTimeout(bufferFlushTimer);
    bufferFlushTimer = null;
    if (pendingBufferWrites.length === 0) return;

    sendBufferWrite(pendingBufferWrites.splice(0, 500));
    if (pendingBufferWrites.length > 0) bufferFlushTimer = setTimeout(flushBufferWrites, 250);
  }

  function flushAllBufferWrites() {
    clearTimeout(bufferFlushTimer);
    bufferFlushTimer = null;
    while (pendingBufferWrites.length > 0) {
      sendBufferWrite(pendingBufferWrites.splice(0, 500));
    }
  }

  function queueBufferWrite(entry) {
    pendingBufferWrites.push(entry);
    if (pendingBufferWrites.length >= 100) {
      flushBufferWrites();
    } else if (!bufferFlushTimer) {
      bufferFlushTimer = setTimeout(flushBufferWrites, 1000);
    }
  }

  function loadTimeShiftComments(videoId) {
    safeSendMessage({ action: 'loadBufferedComments', videoId }, (response) => {
      if (response?.status !== 'ok' || videoId !== timeShiftVideoId) return;
      mergeTimeShiftComments(response.comments);
      const state = getLivePlaybackState(timeShiftVideo);
      if (!state?.isActiveLive) return;
      if (!state.isAtLiveEdge) {
        wasTimeShifted = true;
        resetReplayCursor(state.currentTime, false);
      } else {
        timeShiftReplayCursor = timeShiftComments.length;
        timeShiftLastPlaybackTime = state.currentTime;
      }
    });
  }

  function handleVideoSeeking() {
    const state = getLivePlaybackState(timeShiftVideo);
    if (!timeShiftEnabled || !state?.isActiveLive) return;
    wasTimeShifted = !state.isAtLiveEdge;
    resetReplayCursor(state.currentTime);
  }

  function tickTimeShiftReplay() {
    if (!timeShiftEnabled || !timeShiftVideo || timeShiftVideo.seeking) return;
    const state = getLivePlaybackState(timeShiftVideo);
    if (!state?.isActiveLive) return;

    if (state.isAtLiveEdge) {
      if (wasTimeShifted) engine?.clearComments();
      wasTimeShifted = false;
      timeShiftReplayCursor = timeShiftComments.length;
      timeShiftLastPlaybackTime = state.currentTime;
      return;
    }

    if (!wasTimeShifted) {
      wasTimeShifted = true;
      resetReplayCursor(state.currentTime);
    }

    if (timeShiftLastPlaybackTime === null ||
        state.currentTime < timeShiftLastPlaybackTime - 0.75 ||
        state.currentTime - timeShiftLastPlaybackTime > 3) {
      resetReplayCursor(state.currentTime);
    }

    const windowStart = Math.max(0, timeShiftLastPlaybackTime - 0.1);
    const windowEnd = state.currentTime + REPLAY_LOOKAHEAD_SECONDS;
    while (timeShiftReplayCursor < timeShiftComments.length &&
           timeShiftComments[timeShiftReplayCursor].playbackTime <= windowEnd) {
      const comment = timeShiftComments[timeShiftReplayCursor++];
      if (comment.playbackTime >= windowStart) renderComment(comment);
    }
    timeShiftLastPlaybackTime = state.currentTime;
  }

  function initializeTimeShift(videoId) {
    const video = getMainVideo();
    if (!video || !videoId) return;
    if (timeShiftVideo === video && timeShiftVideoId === videoId) return;

    if (timeShiftVideo) timeShiftVideo.removeEventListener('seeking', handleVideoSeeking);
    if (timeShiftVideoId === videoId) {
      // YouTube replaced the media element of the same stream: keep the
      // in-memory buffer (it may hold entries not yet persisted).
      timeShiftVideo = video;
      timeShiftLastPlaybackTime = video.currentTime;
      timeShiftVideo.addEventListener('seeking', handleVideoSeeking);
      return;
    }
    clearInterval(timeShiftTimer);
    timeShiftVideo = video;
    timeShiftVideoId = videoId;
    timeShiftComments = [];
    timeShiftMessageIds = new Set();
    timeShiftReplayCursor = 0;
    timeShiftLastPlaybackTime = video.currentTime;
    calibratedLiveMediaTime = null;
    calibratedLiveWallTime = null;
    wasTimeShifted = false;
    timeShiftVideo.addEventListener('seeking', handleVideoSeeking);
    timeShiftTimer = setInterval(tickTimeShiftReplay, 250);
    loadTimeShiftComments(videoId);
  }

  function teardownTimeShift() {
    flushAllBufferWrites();
    clearInterval(timeShiftTimer);
    timeShiftVideo?.removeEventListener('seeking', handleVideoSeeking);
    timeShiftVideo = null;
    timeShiftVideoId = '';
    timeShiftComments = [];
    timeShiftMessageIds.clear();
    timeShiftReplayCursor = 0;
    timeShiftLastPlaybackTime = null;
    calibratedLiveMediaTime = null;
    calibratedLiveWallTime = null;
    wasTimeShifted = false;
  }

  function setTimeShiftAccess(preferenceEnabled, consentGranted, clearVisible = true) {
    const previouslyEnabled = timeShiftEnabled;
    timeShiftPreferenceEnabled = preferenceEnabled === true;
    timeShiftConsentGranted = consentGranted === true;
    timeShiftEnabled = timeShiftPreferenceEnabled && timeShiftConsentGranted;

    if (timeShiftEnabled && !previouslyEnabled) {
      handleVideoSeeking();
    } else if (!timeShiftEnabled && previouslyEnabled) {
      wasTimeShifted = false;
      timeShiftReplayCursor = timeShiftComments.length;
      timeShiftLastPlaybackTime = timeShiftVideo?.currentTime ?? null;
      if (clearVisible) engine?.clearComments();
    }
  }

  function acceptComment(data) {
    if (!data || typeof data.text !== 'string') return false;
    const text = data.text.trim().slice(0, 500);
    if (!text) return false;
    const currentVideoId = getVideoId();
    if (!currentVideoId || currentVideoId !== activeVideoId) return true;
    if (data.videoId && currentVideoId && data.videoId !== currentVideoId) return true;

    const now = Date.now();
    const messageId = typeof data.messageId === 'string'
      ? data.messageId.slice(0, 512)
      : '';
    if (messageId && seenMessages.has(messageId)) return true;
    if (messageId) seenMessages.set(messageId, now);
    pruneSeenMessages(now);

    const comment = { text, isSuperChat: data.isSuperChat === true };
    const playbackState = getLivePlaybackState(timeShiftVideo);
    if (!timeShiftEnabled || !playbackState?.isActiveLive || !messageId) {
      renderComment(comment);
      return true;
    }

    const bufferedComment = {
      videoId: currentVideoId,
      messageId,
      text,
      isSuperChat: comment.isSuperChat,
      playbackTime: playbackState.liveEdge,
      receivedAt: now
    };
    mergeTimeShiftComments([bufferedComment]);
    queueBufferWrite(bufferedComment);

    if (playbackState.isAtLiveEdge) {
      renderComment(comment);
      timeShiftReplayCursor = timeShiftComments.length;
      timeShiftLastPlaybackTime = playbackState.currentTime;
    }
    return true;
  }

  function initOverlay() {
    initRetryTimer = null;
    const videoId = getVideoId();
    if (!videoId) return;
    activeVideoId = videoId;
    const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player') || document.querySelector('video')?.parentElement;
    if (!playerContainer) {
      scheduleInit();
      return;
    }

    let overlay = document.getElementById('komeflow-comment-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'komeflow-comment-overlay';
      playerContainer.appendChild(overlay);
    }

    if (engine && (engine.container !== playerContainer || engine.overlay !== overlay)) {
      engine.destroy();
      engine = null;
    }
    if (!engine) {
      engine = new GPUCompositorEngine(overlay, playerContainer);
    }

    initializeTimeShift(videoId);
    const generation = pageGeneration;
    try {
      chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
        if (generation !== pageGeneration || videoId !== getVideoId()) return;
        if (chrome.runtime.lastError) {
          console.warn('KomeFlow: failed to load settings', chrome.runtime.lastError.message);
          return;
        }
        setTimeShiftAccess(
          settings.timeShiftEnabled === true,
          settings.timeShiftConsentGranted === true,
          false
        );
        if (engine) {
          engine.setConfig(settings);
          flushPendingComments();
        }
      });
    } catch (error) {
      // The extension was reloaded or removed; this script is orphaned.
      shutdownOrphanedScript();
      return;
    }

    // Ensure background chat fetcher is running even if chat sidebar is closed!
    ensureChatSource();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || typeof request.action !== 'string') return false;
    if (request.action === 'chatComment') {
      const accepted = acceptComment(request);
      sendResponse({ status: accepted ? 'ok' : 'invalid' });
    } else if (request.action === 'updateSettings') {
      if (Object.hasOwn(request.settings || {}, 'timeShiftEnabled') ||
          Object.hasOwn(request.settings || {}, 'timeShiftConsentGranted')) {
        setTimeShiftAccess(
          Object.hasOwn(request.settings || {}, 'timeShiftEnabled')
            ? request.settings.timeShiftEnabled === true
            : timeShiftPreferenceEnabled,
          Object.hasOwn(request.settings || {}, 'timeShiftConsentGranted')
            ? request.settings.timeShiftConsentGranted === true
            : timeShiftConsentGranted
        );
      }
      if (engine) engine.setConfig(request.settings);
      sendResponse({ status: 'ok' });
    } else if (request.action === 'testComment') {
      if (engine) engine.addComment(request.text || 'テストコメント888888');
      sendResponse({ status: 'ok' });
    }
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://www.youtube.com') return;
    const frames = [
      document.querySelector('iframe#chatframe'),
      document.getElementById('komeflow-hidden-chatframe')
    ].filter(Boolean);
    if (!frames.some((frame) => frame.contentWindow === event.source)) return;
    if (event.data?.type !== '__komeflow_chat_message__') return;
    acceptComment(event.data);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.timeShiftEnabled || changes.timeShiftConsentGranted) {
      setTimeShiftAccess(
        changes.timeShiftEnabled
          ? changes.timeShiftEnabled.newValue === true
          : timeShiftPreferenceEnabled,
        changes.timeShiftConsentGranted
          ? changes.timeShiftConsentGranted.newValue === true
          : timeShiftConsentGranted
      );
    }
    if (!engine) return;
    const changedSettings = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (changes[key]) changedSettings[key] = changes[key].newValue ?? DEFAULT_SETTINGS[key];
    }
    if (Object.keys(changedSettings).length > 0) engine.setConfig(changedSettings);
  });

  initOverlay();

  // URL and attachment checks recover even when YouTube omits a navigation
  // event or replaces the player after yt-navigate-finish.
  function reconcilePage() {
    if (!isExtensionContextValid()) {
      shutdownOrphanedScript();
      return;
    }
    const videoId = getVideoId();
    if (videoId !== activeVideoId) {
      teardownPage();
      if (videoId) initOverlay();
      return;
    }
    if (!videoId) return;
    if (!engine || !engine.container.isConnected || !engine.overlay.isConnected) {
      initOverlay();
    } else {
      ensureChatSource();
    }
  }

  function startPageMonitor() {
    clearInterval(chatSourceInterval);
    chatSourceInterval = setInterval(reconcilePage, 1000);
  }
  startPageMonitor();

  function teardownPage() {
    pageGeneration++;
    activeVideoId = '';
    liveChatSeenVideoId = '';
    chatFrameUnavailableSince = 0;
    clearTimeout(initRetryTimer);
    clearTimeout(navigationTimer);
    teardownTimeShift();
    engine?.destroy();
    engine = null;
    document.getElementById('komeflow-comment-overlay')?.remove();
    document.getElementById('komeflow-hidden-chatframe')?.remove();
    seenMessages.clear();
    pendingComments.length = 0;
  }

  // Stops all work once the extension context is gone (extension reloaded,
  // updated or removed) instead of throwing from every timer tick.
  function shutdownOrphanedScript() {
    clearInterval(chatSourceInterval);
    chatSourceInterval = null;
    pendingBufferWrites.length = 0;
    teardownPage();
  }

  window.addEventListener('yt-navigate-finish', () => {
    // reconcilePage tears down only when the video actually changed; the
    // delayed pass catches a player that is swapped in after the event.
    reconcilePage();
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(reconcilePage, 800);
  });

  window.addEventListener('pagehide', () => {
    teardownPage();
    clearInterval(chatSourceInterval);
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !isExtensionContextValid()) return;
    reconcilePage();
    startPageMonitor();
  });

})();
