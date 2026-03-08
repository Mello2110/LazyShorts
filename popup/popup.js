/**
 * LazyShorts Popup Script
 * Handles popup UI interactions
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const skipOnDislikeToggle = document.getElementById('skipOnDislikeToggle');
const delayRange = document.getElementById('delayRange');
const delayValue = document.getElementById('delayValue');
const settingsBtn = document.getElementById('settingsBtn');
const coffeeBtn = document.getElementById('coffeeBtn');
const skipCountDisplay = document.getElementById('skipCountDisplay');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toastEl = document.getElementById('toast');

// Current theme state
let currentTheme = 'auto';
let toastTimeout = null;

/**
 * Initialize popup
 */
async function init() {
    // Load current settings
    await loadSettings();

    // Load skip count
    await loadSkipCount();

    // Setup event listeners
    setupEventListeners();
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

        // Update delay slider
        if (delayRange) {
            delayRange.value = settings.delaySeconds;
        }
        if (delayValue) {
            delayValue.textContent = settings.delaySeconds;
        }

        // Store and apply theme
        currentTheme = settings.darkMode;
        applyTheme(currentTheme);
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

    // Delay slider
    if (delayRange) {
        delayRange.addEventListener('input', handleDelayInput);
        delayRange.addEventListener('change', handleDelayChange);
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
        showToast(`Theme: ${newTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}`);
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
        showToast(enabled ? '✓ Auto-skip enabled' : '✗ Auto-skip disabled');
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to update setting:', error);
        event.target.checked = !enabled;
        showToast('Failed to update setting', 'error');
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
        showToast(enabled ? '✓ Skip on dislike enabled' : '✗ Skip on dislike disabled');
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to update skip on dislike:', error);
        event.target.checked = !enabled;
        showToast('Failed to update setting', 'error');
    }
}

/**
 * Handle delay slider input (live update label)
 * @param {Event} event 
 */
function handleDelayInput(event) {
    const value = parseInt(event.target.value, 10);
    if (delayValue) {
        delayValue.textContent = value;
    }
}

/**
 * Handle delay slider change (save to storage)
 * @param {Event} event 
 */
async function handleDelayChange(event) {
    const delaySeconds = parseInt(event.target.value, 10);

    try {
        await chrome.storage.sync.set({ delaySeconds });
        showToast(`Delay: ${delaySeconds}s`);
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to update delay:', error);
        showToast('Failed to update delay', 'error');
    }
}

/**
 * Open settings page in new tab
 */
function openSettings() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('settings/settings.html')
    });
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

    // Update delay slider if changed
    if (changes.delaySeconds) {
        if (delayRange) delayRange.value = changes.delaySeconds.newValue;
        if (delayValue) delayValue.textContent = changes.delaySeconds.newValue;
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
 * Show a toast notification
 * @param {string} message - Toast message text
 * @param {string} type - 'success' | 'error'
 */
function showToast(message, type = 'success') {
    if (!toastEl) return;

    // Clear existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Reset classes
    toastEl.className = 'popup__toast';
    toastEl.textContent = message;

    if (type === 'error') {
        toastEl.classList.add('popup__toast--error');
    }

    // Force reflow for animation restart
    void toastEl.offsetWidth;

    // Show
    toastEl.classList.add('popup__toast--visible');

    // Auto-hide after 2 seconds
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('popup__toast--visible');
    }, 2000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
