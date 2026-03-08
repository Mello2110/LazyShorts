/**
 * LazyShorts Service Worker
 * Background script for handling extension lifecycle events
 * and programmatic content script injection for SPA navigation
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  delaySeconds: 0,
  darkMode: 'auto', // 'light' | 'dark' | 'auto'
  skipOnDislike: true,
  skipCount: 0
};

/**
 * Initialize default settings on extension install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[LazyShorts] Extension installed - Setting up default configuration');
    
    try {
      // Set default settings
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      console.log('[LazyShorts] Default settings applied:', DEFAULT_SETTINGS);
    } catch (error) {
      console.error('[LazyShorts] Failed to set default settings:', error);
    }
  } else if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    console.log(`[LazyShorts] Extension updated from v${previousVersion} to v${currentVersion}`);
    
    // Future: Add migration logic here if settings schema changes
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
    // No response means the content script is not running
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
    // First check if the content script is already active
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
    // Common error: tab was closed or navigated away before injection completed
    console.warn('[LazyShorts] Failed to inject content script:', error.message);
  }
}

/**
 * Listen for SPA navigations (history.pushState / replaceState)
 * This fires when YouTube/TikTok navigate internally without a full page load
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(
  async (details) => {
    // Only care about main frame navigations
    if (details.frameId !== 0) return;
    
    const url = details.url;
    
    if (isTargetUrl(url)) {
      console.log('[LazyShorts] SPA navigation detected to target URL:', url);
      
      // Small delay to let the page settle after SPA navigation
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
 * Also listen for completed navigations (covers full page loads as fallback)
 * This is a safety net — the manifest content_scripts should handle most full loads,
 * but this catches edge cases like back/forward navigation.
 */
chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    
    const url = details.url;
    
    if (isTargetUrl(url)) {
      console.log('[LazyShorts] Full navigation completed to target URL:', url);
      
      // Delay slightly to avoid racing with manifest-based injection
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
 * Handle messages from content scripts or popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[LazyShorts] Message received:', message, 'from', sender);
  
  // Future: Add message handlers here if needed
  
  return false; // synchronous response
});

console.log('[LazyShorts] Service worker initialized with SPA navigation support');
