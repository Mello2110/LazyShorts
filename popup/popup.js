/**
 * LazyShorts Popup Script
 * Handles popup UI interactions
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const skipOnDislikeToggle = document.getElementById('skipOnDislikeToggle');
const settingsBtn = document.getElementById('settingsBtn');
const coffeeBtn = document.getElementById('coffeeBtn');
const skipCountDisplay = document.getElementById('skipCountDisplay');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Current theme state
let currentTheme = 'auto';

/**
 * Initialize popup
 */
async function init() {
    console.log('[LazyShorts Popup] Initializing...');

    // Load current settings
    await loadSettings();

    // Load skip count
    await loadSkipCount();

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
            darkMode: 'auto',
            skipOnDislike: true
        });

        // Update toggle states
        enableToggle.checked = settings.enabled;
        if (skipOnDislikeToggle) {
            skipOnDislikeToggle.checked = settings.skipOnDislike;
        }

        // Store and apply theme
        currentTheme = settings.darkMode;
        applyTheme(currentTheme);

        console.log('[LazyShorts Popup] Settings loaded:', settings);
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to load settings:', error);
    }
}

/**
 * Load skip count from storage and update display
 */
async function loadSkipCount() {
    try {
        const { skipCount = 0 } = await chrome.storage.sync.get('skipCount');
        updateSkipCountDisplay(skipCount);
        console.log('[LazyShorts Popup] Skip count loaded:', skipCount);
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to load skip count:', error);
    }
}

/**
 * Update the skip count display with formatted number
 * @param {number} count 
 */
function updateSkipCountDisplay(count) {
    if (skipCountDisplay) {
        skipCountDisplay.textContent = new Intl.NumberFormat().format(count);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Toggle auto-skip on/off
    enableToggle.addEventListener('change', handleToggleChange);

    // Toggle skip on dislike on/off
    if (skipOnDislikeToggle) {
        skipOnDislikeToggle.addEventListener('change', handleSkipOnDislikeToggle);
    }

    // Toggle dark mode
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', handleThemeToggle);
    }

    // Open settings page
    settingsBtn.addEventListener('click', openSettings);

    // Open Buy Me a Coffee page
    coffeeBtn.addEventListener('click', openCoffeePage);

    // Listen for storage changes (sync with settings page)
    chrome.storage.onChanged.addListener(handleStorageChange);
}

/**
 * Handle theme toggle button click
 * Cycles: auto -> light -> dark -> auto (or light <-> dark if already set)
 */
async function handleThemeToggle() {
    // Determine effective current theme
    let effectiveTheme = currentTheme;
    if (currentTheme === 'auto') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Toggle to opposite theme
    const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';

    try {
        await chrome.storage.sync.set({ darkMode: newTheme });
        currentTheme = newTheme;
        applyTheme(newTheme);
        console.log('[LazyShorts Popup] Theme toggled to:', newTheme);
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to toggle theme:', error);
    }
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
 * Handle skip on dislike toggle change
 * @param {Event} event 
 */
async function handleSkipOnDislikeToggle(event) {
    const enabled = event.target.checked;

    try {
        await chrome.storage.sync.set({ skipOnDislike: enabled });
        console.log('[LazyShorts Popup] Skip on dislike', enabled ? 'enabled' : 'disabled');
        showFeedback(enabled ? 'Skip on dislike enabled' : 'Skip on dislike disabled');
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to update skip on dislike:', error);
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
        currentTheme = changes.darkMode.newValue;
        applyTheme(currentTheme);
    }

    // Update skip count display if changed
    if (changes.skipCount) {
        updateSkipCountDisplay(changes.skipCount.newValue);
    }

    // Update skip on dislike toggle if changed
    if (changes.skipOnDislike && skipOnDislikeToggle) {
        skipOnDislikeToggle.checked = changes.skipOnDislike.newValue;
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
