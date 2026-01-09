/**
 * LazyShorts Settings Page Script
 * Handles settings page interactions
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const delayRange = document.getElementById('delayRange');
const delayValue = document.getElementById('delayValue');
const themeLight = document.getElementById('themeLight');
const themeDark = document.getElementById('themeDark');
const themeAuto = document.getElementById('themeAuto');
const resetBtn = document.getElementById('resetBtn');

// Default settings
const DEFAULT_SETTINGS = {
    enabled: true,
    delaySeconds: 0,
    darkMode: 'auto'
};

/**
 * Initialize settings page
 */
async function init() {
    console.log('[LazyShorts Settings] Initializing...');

    // Load current settings
    await loadSettings();

    // Setup event listeners
    setupEventListeners();

    console.log('[LazyShorts Settings] Initialized');
}

/**
 * Load settings from storage and update UI
 */
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

        // Update toggle
        enableToggle.checked = settings.enabled;

        // Update delay slider
        delayRange.value = settings.delaySeconds;
        delayValue.textContent = settings.delaySeconds;

        // Update theme radio buttons
        switch (settings.darkMode) {
            case 'light':
                themeLight.checked = true;
                break;
            case 'dark':
                themeDark.checked = true;
                break;
            case 'auto':
            default:
                themeAuto.checked = true;
                break;
        }

        // Apply theme
        applyTheme(settings.darkMode);

        console.log('[LazyShorts Settings] Settings loaded:', settings);
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to load settings:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Toggle auto-skip
    enableToggle.addEventListener('change', handleToggleChange);

    // Delay slider
    delayRange.addEventListener('input', handleDelayInput);
    delayRange.addEventListener('change', handleDelayChange);

    // Theme radio buttons
    themeLight.addEventListener('change', () => handleThemeChange('light'));
    themeDark.addEventListener('change', () => handleThemeChange('dark'));
    themeAuto.addEventListener('change', () => handleThemeChange('auto'));

    // Reset button
    resetBtn.addEventListener('click', handleReset);

    // Listen for storage changes (sync with popup)
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
        console.log('[LazyShorts Settings] Auto-skip', enabled ? 'enabled' : 'disabled');
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update setting:', error);
        event.target.checked = !enabled; // Revert on error
    }
}

/**
 * Handle delay slider input (live update)
 * @param {Event} event 
 */
function handleDelayInput(event) {
    const value = parseInt(event.target.value, 10);
    delayValue.textContent = value;
}

/**
 * Handle delay slider change (save to storage)
 * @param {Event} event 
 */
async function handleDelayChange(event) {
    const delaySeconds = parseInt(event.target.value, 10);

    try {
        await chrome.storage.sync.set({ delaySeconds });
        console.log('[LazyShorts Settings] Delay updated:', delaySeconds);
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update delay:', error);
    }
}

/**
 * Handle theme change
 * @param {string} theme - 'light' | 'dark' | 'auto'
 */
async function handleThemeChange(theme) {
    try {
        await chrome.storage.sync.set({ darkMode: theme });
        console.log('[LazyShorts Settings] Theme updated:', theme);

        // Apply theme immediately
        applyTheme(theme);
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update theme:', error);
    }
}

/**
 * Apply theme to page
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
 * Handle reset button click
 */
async function handleReset() {
    // Confirm with user
    const confirmed = confirm(
        'Are you sure you want to reset all settings to their default values?'
    );

    if (!confirmed) {
        return;
    }

    try {
        // Reset to defaults
        await chrome.storage.sync.set(DEFAULT_SETTINGS);
        console.log('[LazyShorts Settings] Settings reset to defaults');

        // Reload settings to update UI
        await loadSettings();

        // User feedback
        alert('Settings have been reset to defaults');
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to reset settings:', error);
        alert('Failed to reset settings. Please try again.');
    }
}

/**
 * Handle storage changes from other sources (e.g., popup)
 * @param {Object} changes 
 * @param {string} areaName 
 */
function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync') return;

    console.log('[LazyShorts Settings] Storage changed:', changes);

    // Update UI for changed settings
    if (changes.enabled) {
        enableToggle.checked = changes.enabled.newValue;
    }

    if (changes.delaySeconds) {
        delayRange.value = changes.delaySeconds.newValue;
        delayValue.textContent = changes.delaySeconds.newValue;
    }

    if (changes.darkMode) {
        const theme = changes.darkMode.newValue;
        switch (theme) {
            case 'light':
                themeLight.checked = true;
                break;
            case 'dark':
                themeDark.checked = true;
                break;
            case 'auto':
                themeAuto.checked = true;
                break;
        }
        applyTheme(theme);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
