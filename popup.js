/**
 * Chrome Extension Popup Logic
 * Syncs user settings with chrome.storage. Content scripts observe storage changes.
 */

document.addEventListener('DOMContentLoaded', () => {
  const uiLanguage = (chrome.i18n.getUILanguage() || 'en').replace('_', '-');
  const baseLanguage = uiLanguage.split('-')[0].toLowerCase();
  document.documentElement.lang = uiLanguage;
  const localizedTitle = chrome.i18n.getMessage('extensionName');
  if (localizedTitle) document.title = localizedTitle;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const message = chrome.i18n.getMessage(element.dataset.i18n);
    if (message) element.textContent = message;
  }
  for (const element of document.querySelectorAll('[data-i18n-title]')) {
    const message = chrome.i18n.getMessage(element.dataset.i18nTitle);
    if (message) element.title = message;
  }

  const enabledToggle = document.getElementById('enabledToggle');
  const displayModeSelect = document.getElementById('displayMode');
  const maxCommentsInput = document.getElementById('maxComments');
  const maxCommentsVal = document.getElementById('maxCommentsVal');
  const fontSizeInput = document.getElementById('fontSize');
  const fontSizeVal = document.getElementById('fontSizeVal');
  const flowSpeedInput = document.getElementById('flowSpeed');
  const flowSpeedVal = document.getElementById('flowSpeedVal');
  const screenAreaSelect = document.getElementById('screenArea');
  const timeShiftToggle = document.getElementById('timeShiftToggle');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const clearDataStatus = document.getElementById('clearDataStatus');
  const strokeColorInput = document.getElementById('strokeColor');
  const strokeWidthInput = document.getElementById('strokeWidth');
  const strokeWidthVal = document.getElementById('strokeWidthVal');
  const opacityInput = document.getElementById('opacity');
  const opacityVal = document.getElementById('opacityVal');
  const testCommentBtn = document.getElementById('testCommentBtn');

  const defaultSettings = {
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
  let saveTimer = null;
  let timeShiftConsentGranted = false;

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  // Load current settings
  chrome.storage.local.get(defaultSettings, (settings) => {
    if (chrome.runtime.lastError) {
      console.warn('KomeFlow: failed to load settings', chrome.runtime.lastError.message);
      settings = defaultSettings;
    }
    const maxComments = finiteNumber(settings.maxComments, 20);
    const fontSize = finiteNumber(settings.fontSize, 42);
    const flowDuration = finiteNumber(settings.flowDuration, 5);
    const strokeWidth = finiteNumber(settings.strokeWidth, 6);
    const opacityPercent = Math.round(finiteNumber(settings.opacity, 1) * 100);

    enabledToggle.checked = settings.enabled !== false;
    displayModeSelect.value = settings.displayMode || 'flow';
    maxCommentsInput.value = maxComments;
    maxCommentsVal.textContent = maxComments;
    fontSizeInput.value = fontSize;
    fontSizeVal.textContent = fontSize;
    flowSpeedInput.value = flowDuration;
    flowSpeedVal.textContent = flowDuration.toFixed(1);
    screenAreaSelect.value = finiteNumber(settings.displayArea, 1);
    timeShiftConsentGranted = settings.timeShiftConsentGranted === true;
    timeShiftToggle.checked = settings.timeShiftEnabled === true && timeShiftConsentGranted;
    if (settings.timeShiftEnabled === true && !timeShiftConsentGranted) {
      chrome.storage.local.set({ timeShiftEnabled: false });
    }
    strokeColorInput.value = /^#[0-9a-f]{6}$/i.test(settings.strokeColor) ? settings.strokeColor : '#000000';
    strokeWidthInput.value = strokeWidth;
    strokeWidthVal.textContent = strokeWidth;
    opacityInput.value = opacityPercent;
    opacityVal.textContent = opacityPercent;
  });

  function collectSettings() {
    return {
      enabled: enabledToggle.checked,
      displayMode: displayModeSelect.value,
      maxComments: parseInt(maxCommentsInput.value, 10),
      fontSize: parseInt(fontSizeInput.value, 10),
      flowDuration: parseFloat(flowSpeedInput.value),
      displayArea: parseFloat(screenAreaSelect.value),
      timeShiftEnabled: timeShiftToggle.checked,
      timeShiftConsentGranted,
      strokeColor: strokeColorInput.value,
      strokeWidth: parseInt(strokeWidthInput.value, 10),
      opacity: parseInt(opacityInput.value, 10) / 100
    };
  }

  function persistSettings() {
    clearTimeout(saveTimer);
    saveTimer = null;
    chrome.storage.local.set(collectSettings(), () => {
      if (chrome.runtime.lastError) {
        console.warn('KomeFlow: failed to save settings', chrome.runtime.lastError.message);
      }
    });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistSettings, 75);
  }

  enabledToggle.addEventListener('change', persistSettings);
  displayModeSelect.addEventListener('change', persistSettings);

  maxCommentsInput.addEventListener('input', () => {
    maxCommentsVal.textContent = maxCommentsInput.value;
    scheduleSave();
  });
  
  fontSizeInput.addEventListener('input', () => {
    fontSizeVal.textContent = fontSizeInput.value;
    scheduleSave();
  });

  flowSpeedInput.addEventListener('input', () => {
    flowSpeedVal.textContent = parseFloat(flowSpeedInput.value).toFixed(1);
    scheduleSave();
  });

  screenAreaSelect.addEventListener('change', persistSettings);
  timeShiftToggle.addEventListener('change', () => {
    if (timeShiftToggle.checked && !timeShiftConsentGranted) {
      const accepted = window.confirm(chrome.i18n.getMessage('timeShiftConsentPrompt'));
      if (!accepted) {
        timeShiftToggle.checked = false;
        return;
      }
      timeShiftConsentGranted = true;
    }
    persistSettings();
  });

  clearDataBtn.addEventListener('click', () => {
    timeShiftToggle.checked = false;
    clearTimeout(saveTimer);
    saveTimer = null;
    clearDataBtn.disabled = true;
    clearDataStatus.textContent = chrome.i18n.getMessage('clearingDataStatus');
    chrome.storage.local.set(collectSettings(), () => {
      if (chrome.runtime.lastError) {
        clearDataBtn.disabled = false;
        clearDataStatus.textContent = chrome.i18n.getMessage('clearDataError');
        return;
      }
      chrome.runtime.sendMessage({ action: 'clearBufferedComments' }, (response) => {
        clearDataBtn.disabled = false;
        clearDataStatus.textContent = chrome.runtime.lastError || response?.status !== 'ok'
          ? chrome.i18n.getMessage('clearDataError')
          : chrome.i18n.getMessage('clearDataSuccess');
      });
    });
  });
  strokeColorInput.addEventListener('input', scheduleSave);

  strokeWidthInput.addEventListener('input', () => {
    strokeWidthVal.textContent = strokeWidthInput.value;
    scheduleSave();
  });

  opacityInput.addEventListener('input', () => {
    opacityVal.textContent = opacityInput.value;
    scheduleSave();
  });

  for (const input of [maxCommentsInput, fontSizeInput, flowSpeedInput, strokeColorInput, strokeWidthInput, opacityInput]) {
    input.addEventListener('change', persistSettings);
  }

  testCommentBtn.addEventListener('click', () => {
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          const localizedSamples = {
            ja: [
                "88888888888888",
                "ｗｗｗｗｗｗｗｗｗｗ",
                "草",
                "神配信きたあああああああ！",
                "赤 ここめっちゃ好き！",
                "cyan ナイスぅうううう！"
            ],
            ko: [
              "멋진 방송이에요!",
              "ㅋㅋㅋㅋㅋㅋ",
              "대박!",
              "red 이 장면 정말 좋아요!",
              "cyan 나이스!",
              "KomeFlow에서 안녕하세요!"
            ],
            zhHans: [
              "直播太精彩了！",
              "哈哈哈哈",
              "太棒了！",
              "red 我喜欢这一段！",
              "cyan 漂亮！",
              "来自 KomeFlow 的问候！"
            ],
            zhHant: [
              "直播太精彩了！",
              "哈哈哈哈",
              "太棒了！",
              "red 我很喜歡這一段！",
              "cyan 漂亮！",
              "來自 KomeFlow 的問候！"
            ],
            en: [
                "Amazing stream!",
                "LOL LOL LOL",
                "That was awesome!",
                "red I love this part!",
                "cyan Nice!",
                "Hello from KomeFlow!"
            ]
          };
          const isTraditionalChinese = /^zh-(tw|hk|mo)\b/i.test(uiLanguage);
          const sampleTexts = baseLanguage === 'zh'
            ? localizedSamples[isTraditionalChinese ? 'zhHant' : 'zhHans']
            : localizedSamples[baseLanguage] || localizedSamples.en;
          const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'testComment',
            text: text
          }).catch((error) => {
            console.warn('KomeFlow: test comment could not be delivered', error);
          });
        }
      });
    }
  });
});
