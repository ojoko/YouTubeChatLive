/**
 * Background Service Worker
 * Relays chat messages from chat_observer.js (inside chat iframe)
 * to content.js (on the main YouTube watch page).
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'newChatMessage') {
    // Relay to the tab that sent it (the main page's content script)
    const tabId = sender.tab && sender.tab.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'chatComment',
        text: message.text,
        isSuperChat: message.isSuperChat || false
      }).catch(() => {});
    }
  }
  return false;
});
