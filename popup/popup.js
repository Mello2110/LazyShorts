/**
 * LazyShorts Popup Script
 * Handles popup UI interactions
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const settingsBtn = document.getElementById('settingsBtn');
const coffeeBtn = document.getElementById('coffeeBtn');

/**
 * Initialize popup
 */
async function init() {
    console.log('[LazyShorts Popup] Initializing...');

    // Load current settings
    await loadSettings();

    // Setup event listeners
    setupEventListeners();

    console.log('[LazyShorts Popup] Initialized');
}

/**
 * Load settings from storage and update UI
 */
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get({
            enabled: true,
            delaySeconds: 0,
            darkMode: 'auto'
        });

        // Update toggle state
        enableToggle.checked = settings.enabled;

        // Apply theme
        applyTheme(settings.darkMode);

        console.log('[LazyShorts Popup] Settings loaded:', settings);
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to load settings:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Toggle auto-skip on/off
    enableToggle.addEventListener('change', handleToggleChange);

    // Open settings page
    settingsBtn.addEventListener('click', openSettings);

    // Open Buy Me a Coffee page
    coffeeBtn.addEventListener('click', openCoffeePage);

    // Listen for storage changes (sync with settings page)
    chrome.storage.onChanged.addListener(handleStorageChange);
}

/**
 * Handle toggle change
 * @param {Event} event 
 */
async function handleToggleChange(event) {
    const enabled = event.target.checked;

    try {
        await chrome.storage.sync.set({ enabled });
        console.log('[LazyShorts Popup] Auto-skip', enabled ? 'enabled' : 'disabled');

        // Visual feedback (optional)
        showFeedback(enabled ? 'Auto-skip enabled' : 'Auto-skip disabled');
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to update setting:', error);

        // Revert toggle on error
        event.target.checked = !enabled;
        showFeedback('Failed to update setting', 'error');
    }
}

/**
 * Open settings page in new tab
 */
function openSettings() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('settings/settings.html')
    });

    // Close popup after opening settings
    // window.close();
}

/**
 * Open Buy Me a Coffee page in new tab
 */
function openCoffeePage() {
    chrome.tabs.create({
        url: 'https://buymeacoffee.com/mellowsolutions'
    });
}

/**
 * Handle storage changes from other sources (e.g., settings page)
 * @param {Object} changes 
 * @param {string} areaName 
 */
function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync') return;

    // Update toggle if enabled state changed
    if (changes.enabled) {
        enableToggle.checked = changes.enabled.newValue;
    }

    // Update theme if darkMode changed
    if (changes.darkMode) {
        applyTheme(changes.darkMode.newValue);
    }
}

/**
 * Apply theme to popup
 * @param {string} theme - 'light' | 'dark' | 'auto'
 */
function applyTheme(theme) {
    if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

/**
 * Show feedback message (optional enhancement)
 * @param {string} message 
 * @param {string} type - 'success' | 'error'
 */
function showFeedback(message, type = 'success') {
    // Simple console log for now
    // Could be enhanced with a toast notification
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
