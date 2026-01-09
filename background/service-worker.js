/**
 * LazyShorts Service Worker
 * Background script for handling extension lifecycle events
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  delaySeconds: 0,
  darkMode: 'auto' // 'light' | 'dark' | 'auto'
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

/**
 * Handle messages from content scripts or popup (if needed in the future)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[LazyShorts] Message received:', message, 'from', sender);
  
  // Future: Add message handlers here if needed
  // Example: Coordinate between popup and content script
  
  return false; // synchronous response
});

console.log('[LazyShorts] Service worker initialized');
