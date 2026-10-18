/**
 * Chat Observer Script - Runs INSIDE the YouTube live_chat iframe
 * Detects new chat messages via MutationObserver and sends them
 * to the parent page's content.js via chrome.runtime messaging.
 */

(function () {
  'use strict';

  if (window.__komeflow_chat_observer_injected) return;
  window.__komeflow_chat_observer_injected = true;

  let chatObserver = null;
  let observedContainer = null;
  const processedComments = new Set();
  const HEALTH_CHECK_INTERVAL_MS = 2000;
  const TEXT_RETRY_LIMIT = 4;
  const TEXT_RETRY_DELAY_MS = 250;

  function getChatContainer() {
    return document.querySelector('yt-live-chat-item-list-renderer #items') ||
      document.querySelector('#items.yt-live-chat-item-list-renderer') ||
      document.querySelector('#chat-messages #items') ||
      document.querySelector('#item-list #items');
  }

  function postToParent(payload) {
    try {
      window.parent.postMessage({
        type: '__komeflow_chat_message__',
        messageId: payload.messageId,
        videoId: payload.videoId,
        text: payload.text,
        isSuperChat: payload.isSuperChat
      }, 'https://www.youtube.com');
    } catch (error) {
      console.warn('KomeFlow: parent fallback failed', error);
    }
  }

  function relayComment(payload) {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError || response?.status !== 'ok') {
          postToParent(payload);
        }
      });
    } catch (error) {
      postToParent(payload);
    }
  }

  // YouTube's own chat frame URL carries only a continuation token. Its
  // initial data names the stream ("topic":"chat~<videoId>"), which lets the
  // page drop messages from the previous video's chat right after SPA
  // navigation. Unknown stays '' and is accepted as before.
  let cachedChatVideoId = null;
  function getChatVideoId() {
    if (cachedChatVideoId !== null) return cachedChatVideoId;
    const fromUrl = new URLSearchParams(window.location.search).get('v') || '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(fromUrl)) return (cachedChatVideoId = fromUrl);
    for (const script of document.querySelectorAll('script:not([src])')) {
      const match = script.textContent.match(/"topic":"chat~([a-zA-Z0-9_-]{11})"/);
      if (match) return (cachedChatVideoId = match[1]);
    }
    if (document.readyState === 'complete') cachedChatVideoId = '';
    return '';
  }

  function hashMessageKey(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function processChatNode(node, attempt = 0) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    let text = '';
    const msgEl = node.matches?.('#message') ? node : node.querySelector('#message');
    if (msgEl) text = msgEl.innerText || msgEl.textContent || '';

    text = text.trim().slice(0, 500);
    if (!text) {
      // Renderers can be attached before their data is stamped; the observer
      // only watches childList of #items, so re-check the node shortly.
      if (attempt < TEXT_RETRY_LIMIT && node.isConnected) {
        setTimeout(() => processChatNode(node, attempt + 1), TEXT_RETRY_DELAY_MS);
      }
      return;
    }

    const author = (node.querySelector('#author-name')?.textContent || '').trim().slice(0, 100);
    const timestamp = (node.querySelector('#timestamp')?.textContent || '').trim().slice(0, 30);
    const stableId = node.id || node.getAttribute('data-id');
    const fallbackBucket = Math.floor(Date.now() / 2000);
    const messageId = stableId ||
      `fallback:${hashMessageKey(`${author}|${text}|${timestamp}|${fallbackBucket}`)}`;
    if (processedComments.has(messageId)) return;

    processedComments.add(messageId);
    if (processedComments.size > 500) {
      processedComments.delete(processedComments.values().next().value);
    }

    const tagName = node.tagName?.toLowerCase() || '';
    const isSuperChat = tagName.includes('paid') || tagName.includes('superchat');
    const videoId = getChatVideoId();

    relayComment({
      action: 'newChatMessage',
      messageId,
      videoId,
      text,
      isSuperChat
    });
  }

  function startObserving() {
    const chatItemsContainer = getChatContainer();
    if (!chatItemsContainer || chatItemsContainer === observedContainer) return;

    chatObserver?.disconnect();
    observedContainer = chatItemsContainer;

    chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          processChatNode(node);
        }
      }
    });

    chatObserver.observe(chatItemsContainer, { childList: true, subtree: false });
  }

  startObserving();
  const healthCheckTimer = setInterval(() => {
    if (!observedContainer?.isConnected) {
      chatObserver?.disconnect();
      observedContainer = null;
    }
    startObserving();
  }, HEALTH_CHECK_INTERVAL_MS);

  window.addEventListener('pagehide', () => {
    clearInterval(healthCheckTimer);
    chatObserver?.disconnect();
    observedContainer = null;
    processedComments.clear();
  });
})();
