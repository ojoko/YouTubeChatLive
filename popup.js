/**
 * Chrome Extension Popup Logic
 * Syncs user settings with chrome.storage and sends real-time updates to content script.
 */

document.addEventListener('DOMContentLoaded', () => {
  const enabledToggle = document.getElementById('enabledToggle');
  const displayModeSelect = document.getElementById('displayMode');
  const maxCommentsInput = document.getElementById('maxComments');
  const maxCommentsVal = document.getElementById('maxCommentsVal');
  const fontSizeInput = document.getElementById('fontSize');
  const fontSizeVal = document.getElementById('fontSizeVal');
  const flowSpeedInput = document.getElementById('flowSpeed');
  const flowSpeedVal = document.getElementById('flowSpeedVal');
  const screenAreaSelect = document.getElementById('screenArea');
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
    opacity: 1.0
  };

  // Load current settings
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(defaultSettings, (settings) => {
      enabledToggle.checked = settings.enabled;
      displayModeSelect.value = settings.displayMode || 'flow';
      maxCommentsInput.value = settings.maxComments || 20;
      maxCommentsVal.textContent = settings.maxComments || 20;
      fontSizeInput.value = settings.fontSize;
      fontSizeVal.textContent = settings.fontSize;
      flowSpeedInput.value = settings.flowDuration;
      flowSpeedVal.textContent = settings.flowDuration.toFixed(1);
      screenAreaSelect.value = settings.displayArea;
      strokeColorInput.value = settings.strokeColor;
      strokeWidthInput.value = settings.strokeWidth;
      strokeWidthVal.textContent = settings.strokeWidth;
      opacityInput.value = Math.round(settings.opacity * 100);
      opacityVal.textContent = Math.round(settings.opacity * 100);
    });
  }

  function saveAndNotify() {
    const settings = {
      enabled: enabledToggle.checked,
      displayMode: displayModeSelect.value,
      maxComments: parseInt(maxCommentsInput.value, 10),
      fontSize: parseInt(fontSizeInput.value, 10),
      flowDuration: parseFloat(flowSpeedInput.value),
      displayArea: parseFloat(screenAreaSelect.value),
      strokeColor: strokeColorInput.value,
      strokeWidth: parseInt(strokeWidthInput.value, 10),
      opacity: parseInt(opacityInput.value, 10) / 100
    };

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(settings);
    }

    // Send to active tab content script
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: settings
          }).catch(() => {});
        }
      });
    }
  }

  enabledToggle.addEventListener('change', saveAndNotify);
  displayModeSelect.addEventListener('change', saveAndNotify);

  maxCommentsInput.addEventListener('input', () => {
    maxCommentsVal.textContent = maxCommentsInput.value;
    saveAndNotify();
  });
  
  fontSizeInput.addEventListener('input', () => {
    fontSizeVal.textContent = fontSizeInput.value;
    saveAndNotify();
  });

  flowSpeedInput.addEventListener('input', () => {
    flowSpeedVal.textContent = parseFloat(flowSpeedInput.value).toFixed(1);
    saveAndNotify();
  });

  screenAreaSelect.addEventListener('change', saveAndNotify);
  strokeColorInput.addEventListener('input', saveAndNotify);

  strokeWidthInput.addEventListener('input', () => {
    strokeWidthVal.textContent = strokeWidthInput.value;
    saveAndNotify();
  });

  opacityInput.addEventListener('input', () => {
    opacityVal.textContent = opacityInput.value;
    saveAndNotify();
  });

  testCommentBtn.addEventListener('click', () => {
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          const sampleTexts = [
            "88888888888888",
            "ｗｗｗｗｗｗｗｗｗｗ",
            "草",
            "神配信きたあああああああ！",
            "赤 ここめっちゃ好き！",
            "cyan ナイスぅうううう！"
          ];
          const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'testComment',
            text: text
          }).catch(() => {});
        }
      });
    }
  });
});
