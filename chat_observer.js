/**
 * Chat Observer Script - Runs INSIDE the YouTube live_chat iframe
 * Detects new chat messages via MutationObserver and sends them
 * to the parent page's content.js via chrome.runtime messaging.
 */

(function () {
  'use strict';

  if (window.__niconico_chat_observer_injected) return;
  window.__niconico_chat_observer_injected = true;

  let chatObserver = null;
  let processedComments = new Set();
  let retryCount = 0;
  const MAX_RETRIES = 40; // Up to ~60 seconds of retrying

  function startObserving() {
    // Multiple possible selectors for YouTube's chat item list
    const chatItemsContainer =
      document.querySelector('yt-live-chat-item-list-renderer #items') ||
      document.querySelector('#items.yt-live-chat-item-list-renderer') ||
      document.querySelector('#chat-messages #items') ||
      document.querySelector('#item-list #items');

    if (!chatItemsContainer) {
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        setTimeout(startObserving, 1500);
      }
      return;
    }

    if (chatObserver) chatObserver.disconnect();

    chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Extract message text from various YouTube chat element types
          let text = '';

          // Standard text message
          const msgEl = node.querySelector('#message');
          if (msgEl) {
            text = msgEl.innerText || msgEl.textContent || '';
          }

          // Paid message (super chat) - also grab the message
          if (!text) {
            const paidMsgEl = node.querySelector('#content #message') || node.querySelector('.yt-live-chat-paid-message-renderer #message');
            if (paidMsgEl) {
              text = paidMsgEl.innerText || paidMsgEl.textContent || '';
            }
          }

          text = text.trim();
          if (!text) continue;

          // Dedup by element id or text content
          const msgId = node.id || (text + '_' + Date.now());
          if (processedComments.has(msgId)) continue;

          processedComments.add(msgId);

          // Keep set size bounded
          if (processedComments.size > 300) {
            const first = processedComments.values().next().value;
            processedComments.delete(first);
          }

          // Determine if this is a super chat
          const isSuperChat = node.tagName &&
            (node.tagName.toLowerCase().includes('paid') ||
             node.tagName.toLowerCase().includes('superchat'));

          // Send to parent page's content.js via chrome.runtime
          try {
            chrome.runtime.sendMessage({
              action: 'newChatMessage',
              text: text,
              isSuperChat: isSuperChat
            });
          } catch (e) {
            // Fallback: postMessage to parent window
            try {
              window.parent.postMessage({
                type: '__niconico_chat_message__',
                text: text,
                isSuperChat: isSuperChat
              }, 'https://www.youtube.com');
            } catch (e2) {}
          }
        }
      }
    });

    chatObserver.observe(chatItemsContainer, { childList: true, subtree: false });
  }

  startObserving();
})();
