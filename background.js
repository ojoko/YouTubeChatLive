/**
 * Background Service Worker
 * Relays chat messages from chat_observer.js (inside chat iframe)
 * to content.js (on the main YouTube watch page), and stores the local
 * six-hour DVR comment buffer in extension-scoped IndexedDB.
 */

const BUFFER_DB_NAME = 'komeflow-timeshift';
const BUFFER_STORE_NAME = 'comments';
const BUFFER_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_LOADED_COMMENTS = 50000;
const MAX_STORED_COMMENTS = 50000;
let bufferDbPromise = null;
let lastBufferPruneAt = 0;

function openBufferDb() {
  if (bufferDbPromise) return bufferDbPromise;

  bufferDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(BUFFER_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(BUFFER_STORE_NAME, { keyPath: 'key' });
      store.createIndex('videoTime', ['videoId', 'playbackTime']);
      store.createIndex('receivedAt', 'receivedAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return bufferDbPromise;
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

function sanitizeBufferedComment(entry) {
  if (!entry || typeof entry.videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(entry.videoId)) return null;
  if (typeof entry.messageId !== 'string' || !entry.messageId || typeof entry.text !== 'string') return null;

  const playbackTime = Number(entry.playbackTime);
  const receivedAt = Number(entry.receivedAt);
  if (!Number.isFinite(playbackTime) || playbackTime < 0 || !Number.isFinite(receivedAt)) return null;

  const messageId = entry.messageId.slice(0, 512);
  return {
    key: `${entry.videoId}:${messageId}`,
    videoId: entry.videoId,
    messageId,
    text: entry.text.trim().slice(0, 500),
    isSuperChat: entry.isSuperChat === true,
    playbackTime,
    receivedAt
  };
}

async function pruneExpiredComments(now = Date.now()) {
  if (now - lastBufferPruneAt < 60000) return;
  lastBufferPruneAt = now;

  const db = await openBufferDb();
  const transaction = db.transaction(BUFFER_STORE_NAME, 'readwrite');
  const index = transaction.objectStore(BUFFER_STORE_NAME).index('receivedAt');
  const request = index.openCursor(IDBKeyRange.upperBound(now - BUFFER_TTL_MS));

  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
  await waitForTransaction(transaction);
}

async function saveBufferedComments(entries) {
  const sanitizedEntries = Array.isArray(entries)
    ? entries.slice(0, 500).map(sanitizeBufferedComment).filter((entry) => entry?.text)
    : [];
  if (sanitizedEntries.length === 0) return;

  const db = await openBufferDb();
  const transaction = db.transaction(BUFFER_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(BUFFER_STORE_NAME);
  for (const entry of sanitizedEntries) store.put(entry);
  await waitForTransaction(transaction);
  await pruneExpiredComments();
  await trimStoredComments();
}

async function trimStoredComments() {
  const db = await openBufferDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(BUFFER_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BUFFER_STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      let remainingToDelete = Math.max(0, countRequest.result - MAX_STORED_COMMENTS);
      if (remainingToDelete === 0) return;

      const cursorRequest = store.index('receivedAt').openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || remainingToDelete === 0) return;
        cursor.delete();
        remainingToDelete--;
        cursor.continue();
      };
    };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

async function clearBufferedComments() {
  const db = await openBufferDb();
  const transaction = db.transaction(BUFFER_STORE_NAME, 'readwrite');
  transaction.objectStore(BUFFER_STORE_NAME).clear();
  await waitForTransaction(transaction);
}

async function loadBufferedComments(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return [];
  await pruneExpiredComments();

  const db = await openBufferDb();
  const transaction = db.transaction(BUFFER_STORE_NAME, 'readonly');
  const transactionDone = waitForTransaction(transaction);
  const index = transaction.objectStore(BUFFER_STORE_NAME).index('videoTime');
  const range = IDBKeyRange.bound([videoId, 0], [videoId, Number.MAX_SAFE_INTEGER]);
  const request = index.getAll(range);
  const comments = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  await transactionDone;
  return comments.slice(-MAX_LOADED_COMMENTS);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderUrl = sender.url || '';

  if (message?.action === 'clearBufferedComments') {
    const isTrustedExtensionPage = sender.id === chrome.runtime.id && !sender.tab;
    if (!isTrustedExtensionPage) {
      sendResponse({ status: 'invalid' });
      return false;
    }
    clearBufferedComments()
      .then(() => sendResponse({ status: 'ok' }))
      .catch((error) => {
        console.warn('KomeFlow: failed to clear time-shift storage', error);
        sendResponse({ status: 'error' });
      });
    return true;
  }

  if (message?.action === 'bufferComments' || message?.action === 'loadBufferedComments') {
    // sender.url is the URL the document was loaded with, so after YouTube's
    // SPA navigation (home/search -> watch) it is not a watch URL. Accept the
    // top frame of any YouTube page; videoId is validated per entry.
    const isTrustedYouTubePage = /^https:\/\/www\.youtube\.com\//.test(senderUrl);
    if (!isTrustedYouTubePage || sender.frameId !== 0) {
      sendResponse({ status: 'invalid' });
      return false;
    }

    const operation = message.action === 'bufferComments'
      ? saveBufferedComments(message.entries).then(() => ({ status: 'ok' }))
      : loadBufferedComments(String(message.videoId || '')).then((comments) => ({ status: 'ok', comments }));

    operation
      .then(sendResponse)
      .catch((error) => {
        console.warn('KomeFlow: time-shift storage operation failed', error);
        sendResponse({ status: 'error' });
      });
    return true;
  }

  if (message?.action !== 'newChatMessage') return false;

  const isTrustedChatFrame = /^https:\/\/www\.youtube\.com\/live_chat(?:_replay)?(?:[/?]|$)/.test(senderUrl);
  const tabId = sender.tab?.id;
  const text = typeof message.text === 'string' ? message.text.trim().slice(0, 500) : '';

  if (!isTrustedChatFrame || !Number.isInteger(tabId) || sender.frameId === 0 || !text) {
    sendResponse({ status: 'invalid' });
    return false;
  }

  const payload = {
    action: 'chatComment',
    messageId: typeof message.messageId === 'string' ? message.messageId.slice(0, 512) : '',
    videoId: typeof message.videoId === 'string' ? message.videoId.slice(0, 32) : '',
    text,
    isSuperChat: message.isSuperChat === true
  };

  try {
    chrome.tabs.sendMessage(tabId, payload, { frameId: 0 }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'unavailable' });
        return;
      }
      sendResponse({ status: response?.status === 'ok' ? 'ok' : 'unavailable' });
    });
  } catch (error) {
    sendResponse({ status: 'unavailable' });
  }

  // Keep the response channel open until tabs.sendMessage completes.
  return true;
});
