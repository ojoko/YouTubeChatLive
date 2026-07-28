/**
 * YouTube Live NicoNico Comment Extension - Content Script (Main Page)
 * Includes Hidden Chat Frame Fallback so comments flow even when Chat Sidebar is CLOSED/HIDDEN or in Fullscreen.
 */

(function () {
  'use strict';

  if (window.__niconico_extension_injected) return;
  window.__niconico_extension_injected = true;

  /* ==========================================================================
     GPU Compositor Accelerated NicoNico Engine
     ========================================================================== */
  class GPUCompositorEngine {
    constructor(overlayContainer, playerContainer) {
      this.overlay = overlayContainer;
      this.container = playerContainer;

      this.lanes = [];

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
      this.config = { ...this.config, ...newConfig };
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
      this.measureCtx.font = `800 ${fontSize}px 'M PLUS Rounded 1c', sans-serif`;
      return Math.max(30, this.measureCtx.measureText(text).width);
    }

    addComment(rawText, options = {}) {
      if (!this.config.enabled || !rawText) return;
      if (this.activeCount >= (this.config.maxComments || 20)) return;

      const mode = this.config.displayMode || 'flow';

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
      commentEl.className = 'nico-comment';
      commentEl.textContent = cleanText;
      commentEl.style.top = `${topY}px`;
      commentEl.style.fontSize = `${fontSize}px`;
      commentEl.style.color = options.isSuperChat ? '#ffd700' : color;
      commentEl.style.setProperty('--nico-stroke-color', this.config.strokeColor);
      commentEl.style.setProperty('--nico-stroke-width', `${this.config.strokeWidth}px`);
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

      const animation = commentEl.animate(
        [
          { transform: `translate3d(${startX}px, 0, 0)` },
          { transform: `translate3d(${endX}px, 0, 0)` }
        ],
        { duration: durationMs, easing: 'linear', fill: 'forwards' }
      );

      animation.onfinish = () => {
        if (commentEl.parentNode) commentEl.parentNode.removeChild(commentEl);
        this.activeCount--;
      };
    }

    addLeftFixedComment(rawText, options = {}) {
      const { cleanText, color } = this.parseCommentCommands(rawText, options.color || '#FFFFFF');
      const fontSize = options.fontSize || this.config.fontSize;
      const durationMs = (options.flowDuration || this.config.flowDuration) * 1000;

      const laneIndex = this.findOptimalLaneFixed(durationMs);
      const laneHeight = fontSize * 1.4;
      const topY = laneIndex * laneHeight + 10;

      const commentEl = document.createElement('div');
      commentEl.className = 'nico-comment mode-left-fixed';
      commentEl.textContent = cleanText;
      commentEl.style.top = `${topY}px`;
      commentEl.style.fontSize = `${fontSize}px`;
      commentEl.style.color = options.isSuperChat ? '#ffd700' : color;
      commentEl.style.setProperty('--nico-stroke-color', this.config.strokeColor);
      commentEl.style.setProperty('--nico-stroke-width', `${this.config.strokeWidth}px`);

      this.overlay.appendChild(commentEl);
      this.activeCount++;

      const now = performance.now();
      this.lanes[laneIndex] = {
        startTime: now,
        durationMs: durationMs
      };

      const animation = commentEl.animate(
        [
          { transform: 'translate3d(-40px, 0, 0)', opacity: 0, offset: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: 0.1 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: 0.85 },
          { transform: 'translate3d(-30px, 0, 0)', opacity: 0, offset: 1 }
        ],
        { duration: durationMs, easing: 'ease-out', fill: 'forwards' }
      );

      animation.onfinish = () => {
        if (commentEl.parentNode) commentEl.parentNode.removeChild(commentEl);
        this.activeCount--;
      };
    }

    addCenterFixedComment(rawText, options = {}) {
      const { cleanText, color } = this.parseCommentCommands(rawText, options.color || '#FFFFFF');
      const fontSize = options.fontSize || this.config.fontSize;
      const durationMs = (options.flowDuration || this.config.flowDuration) * 1000;

      const laneIndex = this.findOptimalLaneFixed(durationMs);
      const laneHeight = fontSize * 1.3;
      const topY = laneIndex * laneHeight + 10;

      const commentEl = document.createElement('div');
      commentEl.className = 'nico-comment mode-center-fixed';
      commentEl.textContent = cleanText;
      commentEl.style.top = `${topY}px`;
      commentEl.style.fontSize = `${fontSize}px`;
      commentEl.style.color = options.isSuperChat ? '#ffd700' : color;
      commentEl.style.setProperty('--nico-stroke-color', this.config.strokeColor);
      commentEl.style.setProperty('--nico-stroke-width', `${this.config.strokeWidth}px`);

      this.overlay.appendChild(commentEl);
      this.activeCount++;

      const now = performance.now();
      this.lanes[laneIndex] = {
        startTime: now,
        durationMs: durationMs
      };

      const animation = commentEl.animate(
        [
          { opacity: 0, transform: 'translate3d(-50%, -10px, 0)', offset: 0 },
          { opacity: 1, transform: 'translate3d(-50%, 0, 0)', offset: 0.1 },
          { opacity: 1, transform: 'translate3d(-50%, 0, 0)', offset: 0.88 },
          { opacity: 0, transform: 'translate3d(-50%, 10px, 0)', offset: 1 }
        ],
        { duration: durationMs, easing: 'ease-in-out', fill: 'forwards' }
      );

      animation.onfinish = () => {
        if (commentEl.parentNode) commentEl.parentNode.removeChild(commentEl);
        this.activeCount--;
      };
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
  let engine = null;

  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('v')) return urlParams.get('v');
    const match = window.location.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : '';
  }

  /**
   * Ensures live chat is being read EVEN IF the user hides/closes the chat sidebar on YouTube!
   */
  function ensureChatSource() {
    const videoId = getVideoId();
    if (!videoId) return;

    // Check if YouTube's own visible chat iframe exists
    const visibleChatFrame = document.querySelector('iframe#chatframe');

    // If visible chat frame is missing (e.g. user collapsed/closed chat sidebar or in fullscreen)
    if (!visibleChatFrame) {
      let hiddenFrame = document.getElementById('niconico-hidden-chatframe');
      if (!hiddenFrame) {
        hiddenFrame = document.createElement('iframe');
        hiddenFrame.id = 'niconico-hidden-chatframe';
        hiddenFrame.style.cssText = 'display:none!important;width:0!important;height:0!important;border:none!important;visibility:hidden!important;position:absolute!important;left:-9999px!important;';
        hiddenFrame.src = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}`;
        document.body.appendChild(hiddenFrame);
      }
    }
  }

  function initOverlay() {
    const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player') || document.querySelector('video')?.parentElement;
    if (!playerContainer) {
      setTimeout(initOverlay, 1000);
      return;
    }

    let overlay = document.getElementById('niconico-comment-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'niconico-comment-overlay';
      playerContainer.appendChild(overlay);
    }

    if (!engine) {
      engine = new GPUCompositorEngine(overlay, playerContainer);
    }

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        { enabled: true, displayMode: 'flow', maxComments: 20, fontSize: 42, flowDuration: 5.0, displayArea: 1.0, strokeColor: '#000000', strokeWidth: 6, opacity: 1.0 },
        (res) => { if (engine) engine.setConfig(res); }
      );
    }

    // Ensure background chat fetcher is running even if chat sidebar is closed!
    ensureChatSource();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'chatComment') {
      if (engine) engine.addComment(request.text, { isSuperChat: request.isSuperChat });
      sendResponse({ status: 'ok' });
    } else if (request.action === 'updateSettings') {
      if (engine) engine.setConfig(request.settings);
      sendResponse({ status: 'ok' });
    } else if (request.action === 'testComment') {
      if (engine) engine.addComment(request.text || 'テストコメント888888');
      sendResponse({ status: 'ok' });
    }
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://www.youtube.com') return;
    if (event.data && event.data.type === '__niconico_chat_message__') {
      if (engine) engine.addComment(event.data.text, { isSuperChat: event.data.isSuperChat });
    }
  });

  initOverlay();

  // Periodically ensure hidden chat source is active if sidebar was toggled
  setInterval(ensureChatSource, 4000);

  window.addEventListener('yt-navigate-finish', () => {
    window.__niconico_extension_injected = false;
    engine = null;
    const oldOverlay = document.getElementById('niconico-comment-overlay');
    if (oldOverlay) oldOverlay.remove();
    const oldHidden = document.getElementById('niconico-hidden-chatframe');
    if (oldHidden) oldHidden.remove();
    setTimeout(initOverlay, 800);
  });

})();
