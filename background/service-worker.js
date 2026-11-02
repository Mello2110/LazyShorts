/**
 * LazyShorts Service Worker
 * Background script for handling extension lifecycle events
 * and programmatic content script injection for SPA navigation
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  enableYouTube: true,
  enableTikTok: true,
  delaySeconds: 0,
  darkMode: 'auto', // 'light' | 'dark' | 'auto'
  skipOnDislike: true,
  skipCount: 0
};

/**
 * Initialize default settings on extension install or update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[LazyShorts] Extension installed - Setting up default configuration');
    try {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      console.log('[LazyShorts] Default settings applied:', DEFAULT_SETTINGS);
    } catch (error) {
      console.error('[LazyShorts] Failed to set default settings:', error);
    }
  } else if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    console.log(`[LazyShorts] Extension updated from v${previousVersion} to v${currentVersion}`);

    // Ensure new settings fields exist for existing users
    try {
      const current = await chrome.storage.sync.get(null);
      const updates = {};
      for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
        if (current[key] === undefined) {
          updates[key] = val;
        }
      }
      if (Object.keys(updates).length > 0) {
        await chrome.storage.sync.set(updates);
        console.log('[LazyShorts] Migration applied new setting keys:', updates);
      }
    } catch (e) {
      console.error('[LazyShorts] Failed to apply settings migration:', e);
    }
  }
});

/**
 * Listen for storage changes and log them (for debugging)
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    console.log('[LazyShorts] Settings changed:', changes);
  }
});

// ============================================
// SPA NAVIGATION DETECTION
// ============================================

/**
 * URL patterns that should trigger content script injection
 */
const TARGET_URL_PATTERNS = [
  /^https?:\/\/(www\.|m\.)?youtube\.com\/shorts\//,
  /^https?:\/\/(www\.|m\.)?tiktok\.com\//
];

/**
 * Check if a URL matches any target pattern
 * @param {string} url
 * @returns {boolean}
 */
function isTargetUrl(url) {
  return TARGET_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if a content script is already running on a tab by sending a ping
 * @param {number} tabId
 * @returns {Promise<boolean>}
 */
async function isContentScriptActive(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'LAZY_SHORTS_PING' });
    return response && response.active === true;
  } catch (error) {
    return false;
  }
}

/**
 * Programmatically inject the content script into a tab
 * @param {number} tabId
 * @param {string} url - The URL that triggered the injection (for logging)
 */
async function injectContentScript(tabId, url) {
  try {
    const alreadyActive = await isContentScriptActive(tabId);
    if (alreadyActive) {
      console.log('[LazyShorts] Content script already active on tab', tabId);
      return;
    }

    console.log('[LazyShorts] Injecting content script into tab', tabId, 'for URL:', url);
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/content.js']
    });
    console.log('[LazyShorts] Content script injected successfully into tab', tabId);
  } catch (error) {
    console.warn('[LazyShorts] Failed to inject content script:', error.message);
  }
}

/**
 * Listen for SPA navigations (history.pushState / replaceState)
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;

    if (isTargetUrl(url)) {
      console.log('[LazyShorts] SPA navigation detected to target URL:', url);
      setTimeout(() => {
        injectContentScript(details.tabId, url);
      }, 300);
    }
  },
  {
    url: [
      { hostContains: 'youtube.com' },
      { hostContains: 'tiktok.com' }
    ]
  }
);

/**
 * Also listen for completed navigations
 */
chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;

    if (isTargetUrl(url)) {
      console.log('[LazyShorts] Full navigation completed to target URL:', url);
      setTimeout(() => {
        injectContentScript(details.tabId, url);
      }, 500);
    }
  },
  {
    url: [
      { hostContains: 'youtube.com' },
      { hostContains: 'tiktok.com' }
    ]
  }
);

/**
 * Handle runtime messages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[LazyShorts] Message received in worker:', message, 'from', sender);
  return false;
});

console.log('[LazyShorts] Service worker initialized with SPA navigation support');
