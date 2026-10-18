// Regression tests for the content/chat scripts, run with a fake DOM:
//   node tests/lifecycle.test.cjs [extensionRoot]
// The fakes model YouTube states observed in real Chrome (Oct 2026): a
// collapsed #chatframe left at about:blank, regular videos carrying
// `ytp-livebadge-color` with a hidden live badge, ads playing in the main
// <video>, and chat renderers whose text may be stamped after insertion.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const contentSource = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const observerSource = fs.readFileSync(path.join(root, 'chat_observer.js'), 'utf8');

function createContentEnv() {
  const elements = new Map();
  const events = new Map();
  const timers = new Map();
  const sent = [];
  const engines = [];
  let nextTimer = 1;
  let messageListener;
  let clock = 1_000_000;

  function element(tag = 'div') {
    return {
      tagName: tag.toUpperCase(), isConnected: true, dataset: {}, style: {},
      appendChild(child) { child.isConnected = true; if (child.id) elements.set(child.id, child); },
      remove() { this.isConnected = false; if (elements.get(this.id) === this) elements.delete(this.id); },
      setAttribute() {}, classList: { contains() { return false; } },
      querySelector() { return null; }
    };
  }
  function video() {
    return {
      currentTime: 100, duration: Infinity, seeking: false, seekable: { length: 0 }, listeners: [],
      addEventListener(name) { this.listeners.push(name); },
      removeEventListener(name) { this.listeners.splice(this.listeners.indexOf(name), 1); }
    };
  }

  const state = {
    chatElement: null,
    flexyVideoId: null,
    visibleFrame: null,
    playerClasses: new Set(),
    badge: null,
    mainVideo: video(),
    previewVideo: null
  };
  const player = element();
  player.id = 'movie_player';
  player.classList = { contains: (name) => state.playerClasses.has(name) };
  player.querySelector = (selector) => (selector === '.ytp-live-badge' ? state.badge : null);

  const window = {
    location: { pathname: '/', search: '', hostname: 'www.youtube.com' },
    addEventListener(name, callback) { events.set(name, callback); }
  };
  const document = {
    body: element('body'),
    createElement: element,
    getElementById: (id) => elements.get(id) || null,
    querySelector(selector) {
      switch (selector) {
        case '#movie_player':
        case '.html5-video-player':
          return player;
        case '#movie_player video.html5-main-video':
        case '#movie_player video':
          return state.mainVideo;
        case 'video':
          return state.previewVideo || state.mainVideo;
        case 'ytd-watch-flexy':
          return {
            getAttribute: (name) => (name === 'video-id' ? state.flexyVideoId : null),
            querySelector: (sel) => (sel === 'ytd-live-chat-frame' ? state.chatElement : null)
          };
        case 'iframe#chatframe:not(#komeflow-hidden-chatframe)':
        case 'iframe#chatframe':
          return state.visibleFrame;
        default:
          return null;
      }
    }
  };
  class FakeDate extends Date {
    static now() { return clock; }
  }
  const storage = {
    timeShiftEnabled: false,
    timeShiftConsentGranted: false
  };
  const chrome = {
    runtime: {
      id: 'test-extension',
      lastError: undefined,
      onMessage: { addListener(fn) { messageListener = fn; } },
      sendMessage(message, callback) {
        if (!chrome.runtime.id) throw new Error('Extension context invalidated.');
        sent.push(message);
        const response = message.action === 'loadBufferedComments'
          ? { status: 'ok', comments: [] }
          : { status: 'ok' };
        if (callback) callback(response);
        return Promise.resolve(response);
      }
    },
    storage: {
      local: {
        get(defaults, callback) {
          if (!chrome.runtime.id) throw new Error('Extension context invalidated.');
          callback({ ...defaults, ...storage });
        }
      },
      onChanged: { addListener() {} }
    }
  };

  const context = {
    window, document, chrome, engines, console, URLSearchParams, Date: FakeDate,
    getComputedStyle: (el) => ({ display: el.display || 'inline-block' }),
    setInterval(callback, delay) { const id = nextTimer++; timers.set(id, { callback, delay, repeat: true }); return id; },
    clearInterval(id) { timers.delete(id); },
    setTimeout(callback, delay = 0) { const id = nextTimer++; timers.set(id, { callback, delay, repeat: false }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const fakeCompositor = `class GPUCompositorEngine {
    constructor(overlay, container) { this.overlay = overlay; this.container = container; this.comments = []; engines.push(this); }
    setConfig() {}
    addComment(text) { this.comments.push(text); }
    clearComments() {}
    destroy() { this.destroyed = true; }
  }`;
  const start = contentSource.indexOf('  class GPUCompositorEngine');
  const end = contentSource.indexOf('  const DEFAULT_SETTINGS');
  vm.runInNewContext(contentSource.slice(0, start) + fakeCompositor + '\n' + contentSource.slice(end), context);

  const env = {
    state, storage, chrome, sent, engines, elements, events, timers,
    route(pathname, search = '') { window.location.pathname = pathname; window.location.search = search; },
    advance(ms) { clock += ms; },
    // Runs the 1 s page monitor once, as the real interval would.
    tick() { for (const t of [...timers.values()]) if (t.repeat && t.delay === 1000) t.callback(); },
    runTimeouts() { for (const [id, t] of [...timers]) if (!t.repeat) { timers.delete(id); t.callback(); } },
    navigate(pathname, search) { env.route(pathname, search); events.get('yt-navigate-finish')(); env.runTimeouts(); },
    comment(text, extra = {}) {
      messageListener({ action: 'chatComment', text, messageId: extra.messageId || text, ...extra }, {}, () => {});
    },
    get engine() { return engines[engines.length - 1]; },
    get hiddenFrame() { return elements.get('komeflow-hidden-chatframe') || null; }
  };
  return env;
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

test('collapsed/about:blank YouTube chat frame does not block the hidden fallback', () => {
  const env = createContentEnv();
  env.state.chatElement = {};
  env.state.visibleFrame = {
    isConnected: true, src: '',
    contentWindow: { location: { href: 'about:blank' } },
    closest: () => ({ hasAttribute: (name) => name === 'collapsed' })
  };
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.tick();
  assert.equal(env.hiddenFrame, null, 'waits for YouTube\'s own frame first');
  env.advance(3500);
  env.tick();
  assert.ok(env.hiddenFrame, 'fallback frame starts after the grace period');
  assert.match(env.hiddenFrame.src, /live_chat\?v=WB0NXUtKdNw/);

  env.state.visibleFrame.contentWindow.location.href = 'https://www.youtube.com/live_chat?continuation=abc';
  env.state.visibleFrame.closest = () => ({ hasAttribute: () => false });
  env.tick();
  assert.equal(env.hiddenFrame, null, 'single chat source once YouTube\'s chat loads');
});

test('regular video without a chat frame never loads a hidden chat page', () => {
  const env = createContentEnv();
  env.navigate('/watch', '?v=jNQXAC9IVRw');
  env.advance(10000);
  env.tick();
  assert.equal(env.hiddenFrame, null);
});

test('live chat seen once keeps the fallback when the chat element disappears (fullscreen)', () => {
  const env = createContentEnv();
  env.state.chatElement = {};
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.state.chatElement = null;
  env.advance(3500);
  env.tick();
  assert.ok(env.hiddenFrame);
});

test('stale chat frame of the previous video right after SPA navigation is ignored', () => {
  const env = createContentEnv();
  // ytd-watch-flexy keeps the previous id and chat for ~2 s after the URL changes.
  env.state.chatElement = {};
  env.state.flexyVideoId = 'WB0NXUtKdNw';
  env.navigate('/watch', '?v=oUUVropifiU');
  env.state.chatElement = null;
  env.state.flexyVideoId = 'oUUVropifiU';
  env.advance(10000);
  env.tick();
  assert.equal(env.hiddenFrame, null);
});

test('DVR on: regular video with ytp-livebadge-color but hidden badge renders comments', () => {
  const env = createContentEnv();
  env.storage.timeShiftEnabled = true;
  env.storage.timeShiftConsentGranted = true;
  env.state.mainVideo.duration = 19;
  env.state.playerClasses.add('ytp-livebadge-color');
  env.state.badge = { display: 'none', classList: { contains: () => false } };
  env.navigate('/watch', '?v=jNQXAC9IVRw');
  env.comment('replay comment');
  assert.deepEqual(Array.from(env.engine.comments), ['replay comment']);
  assert.equal(env.sent.filter((m) => m.action === 'bufferComments').length, 0);
});

test('DVR on: ad playback is not treated as a rewound stream', () => {
  const env = createContentEnv();
  env.storage.timeShiftEnabled = true;
  env.storage.timeShiftConsentGranted = true;
  env.state.mainVideo.duration = 52.98;
  env.state.mainVideo.currentTime = 2;
  env.state.playerClasses.add('ytp-livebadge-color');
  env.state.playerClasses.add('ad-showing');
  env.state.badge = { display: 'inline-block', classList: { contains: () => false } };
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.comment('during ad');
  assert.deepEqual(Array.from(env.engine.comments), ['during ad']);
});

test('DVR on: live edge comments render and are buffered at stream time', () => {
  const env = createContentEnv();
  env.storage.timeShiftEnabled = true;
  env.storage.timeShiftConsentGranted = true;
  env.state.mainVideo.duration = 8426;
  env.state.mainVideo.currentTime = 4826;
  env.state.mainVideo.seekable = { length: 1, end: () => 8426 };
  env.state.playerClasses.add('ytp-livebadge-color');
  env.state.badge = { display: 'inline-block', classList: { contains: (c) => c === 'ytp-live-badge-is-livehead' } };
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.comment('at live head');
  assert.deepEqual(Array.from(env.engine.comments), ['at live head']);
  env.runTimeouts();
  const buffered = env.sent.find((m) => m.action === 'bufferComments');
  assert.ok(buffered, 'comment persisted for DVR');
  assert.equal(Math.round(buffered.entries[0].playbackTime), 4826, 'uses the calibrated live head, not seekable.end()');
});

test('DVR on: unloaded media (player error) does not calibrate the live head to 0', () => {
  const env = createContentEnv();
  env.storage.timeShiftEnabled = true;
  env.storage.timeShiftConsentGranted = true;
  env.state.mainVideo.currentTime = 0;
  env.state.mainVideo.readyState = 0;
  env.state.playerClasses.add('ytp-livebadge-color');
  env.state.badge = { display: 'inline-block', classList: { contains: (c) => c === 'ytp-live-badge-is-livehead' } };
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.comment('after error');
  env.runTimeouts();
  assert.deepEqual(Array.from(env.engine.comments), ['after error']);
  assert.equal(env.sent.filter((m) => m.action === 'bufferComments').length, 0);
});

test('timeshift binds to the main player video, not an earlier preview video', () => {
  const env = createContentEnv();
  env.state.previewVideo = { addEventListener() { throw new Error('bound preview video'); }, removeEventListener() {} };
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  assert.ok(env.state.mainVideo.listeners.includes('seeking'));
});

test('replacing the <video> of the same stream does not reload the DVR buffer', () => {
  const env = createContentEnv();
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  const loads = () => env.sent.filter((m) => m.action === 'loadBufferedComments').length;
  assert.equal(loads(), 1);
  const oldVideo = env.state.mainVideo;
  env.state.mainVideo = { ...oldVideo, listeners: [] };
  env.tick();
  assert.equal(loads(), 1);
  assert.ok(env.state.mainVideo.listeners.includes('seeking'));
  assert.equal(oldVideo.listeners.includes('seeking'), false);
});

test('same-video yt-navigate-finish does not rebuild the overlay', () => {
  const env = createContentEnv();
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  const count = env.engines.length;
  env.navigate('/watch', '?v=WB0NXUtKdNw&t=10');
  assert.equal(env.engines.length, count);
});

test('video A -> B drops A comments that arrive with A\'s id', () => {
  const env = createContentEnv();
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.navigate('/watch', '?v=6qIbcu2aqlc');
  env.comment('from A', { videoId: 'WB0NXUtKdNw', messageId: 'a1' });
  env.comment('from B', { videoId: '6qIbcu2aqlc', messageId: 'b1' });
  assert.deepEqual(Array.from(env.engine.comments), ['from B']);
});

test('extension reload: orphaned script stops cleanly instead of throwing every second', () => {
  const env = createContentEnv();
  env.navigate('/watch', '?v=WB0NXUtKdNw');
  env.elements.get('komeflow-comment-overlay').remove();
  delete env.chrome.runtime.id;
  env.tick();
  env.tick();
  assert.equal(env.elements.has('komeflow-comment-overlay'), false);
  assert.equal([...env.timers.values()].filter((t) => t.repeat && t.delay === 1000).length, 0);
});

function createObserverEnv() {
  const timers = [];
  const relayed = [];
  let observerCallback = null;
  const items = { isConnected: true };
  const document = {
    readyState: 'complete',
    scripts: [],
    querySelector: (selector) => (selector === 'yt-live-chat-item-list-renderer #items' ? items : null),
    querySelectorAll: (selector) => (selector === 'script:not([src])' ? document.scripts : [])
  };
  class MutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
    disconnect() {}
  }
  const context = {
    window: { location: { search: '' }, addEventListener() {}, parent: { postMessage() {} } },
    document, MutationObserver, URLSearchParams, console, Math, Date,
    Node: { ELEMENT_NODE: 1 },
    setInterval: () => 0, clearInterval() {},
    setTimeout(callback) { timers.push(callback); return timers.length; },
    chrome: { runtime: { sendMessage(message, callback) { relayed.push(message); callback({ status: 'ok' }); } } }
  };
  vm.runInNewContext(observerSource, context);
  return {
    relayed,
    document,
    add(node) { observerCallback([{ addedNodes: [node] }]); },
    flushTimers() { while (timers.length) timers.shift()(); }
  };
}

function chatNode(id, text) {
  const message = { innerText: text, textContent: text };
  return {
    nodeType: 1, id, isConnected: true, tagName: 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER', message,
    matches: () => false,
    getAttribute: () => null,
    querySelector: (selector) => (selector === '#message' ? message : null)
  };
}

test('chat text stamped after insertion is still relayed once', () => {
  const env = createObserverEnv();
  const node = chatNode('msg-1', '');
  env.add(node);
  assert.equal(env.relayed.length, 0);
  node.message.innerText = node.message.textContent = 'late text';
  env.flushTimers();
  assert.deepEqual(env.relayed.map((m) => m.text), ['late text']);
  env.add(node);
  env.flushTimers();
  assert.equal(env.relayed.length, 1);
});

test('YouTube chat frame messages carry the stream id from the chat page data', () => {
  const env = createObserverEnv();
  env.document.scripts.push({ textContent: 'var ytInitialData = {"topic":"chat~WB0NXUtKdNw","x":1};' });
  env.add(chatNode('msg-2', 'hello'));
  assert.equal(env.relayed[0].videoId, 'WB0NXUtKdNw');
});

test('background accepts DVR storage requests from a page reached by SPA navigation', async () => {
  const backgroundSource = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
  let listener;
  vm.runInNewContext(backgroundSource, {
    console, Promise, Number, Array, String,
    chrome: { runtime: { id: 'ext', onMessage: { addListener(fn) { listener = fn; } } }, tabs: { sendMessage() {} } }
  });
  const ask = (sender) => new Promise((resolve) => {
    // An invalid id returns before IndexedDB is touched.
    listener({ action: 'loadBufferedComments', videoId: 'x' }, sender, resolve);
  });
  // sender.url keeps the URL the document was loaded with (observed in Chrome).
  const fromSearch = await ask({ url: 'https://www.youtube.com/results?search_query=live', frameId: 0, tab: { id: 1 } });
  assert.equal(fromSearch.status, 'ok');
  const fromChatFrame = await ask({ url: 'https://www.youtube.com/live_chat?v=x', frameId: 3, tab: { id: 1 } });
  assert.equal(fromChatFrame.status, 'invalid');
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
    } catch (error) {
      failed++;
      console.log(`FAIL: ${name}\n      ${error.message.split('\n')[0]}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed (${root})`);
  process.exitCode = failed ? 1 : 0;
})();
