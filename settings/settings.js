/**
 * LazyShorts Settings Page Script
 * Handles settings page interactions
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const skipOnDislikeToggle = document.getElementById('skipOnDislikeToggle');
const delayRange = document.getElementById('delayRange');
const delayValue = document.getElementById('delayValue');
const themeLight = document.getElementById('themeLight');
const themeDark = document.getElementById('themeDark');
const themeAuto = document.getElementById('themeAuto');
const resetBtn = document.getElementById('resetBtn');
const skipCountDisplay = document.getElementById('skipCountDisplay');
const resetCountBtn = document.getElementById('resetCountBtn');
const versionDisplay = document.getElementById('versionDisplay');

// Default settings
const DEFAULT_SETTINGS = {
    enabled: true,
    delaySeconds: 0,
    darkMode: 'auto',
    skipOnDislike: true
};

/**
 * Initialize settings page
 */
async function init() {
    console.log('[LazyShorts Settings] Initializing...');

    // Load current settings
    await loadSettings();

    // Load skip count
    await loadSkipCount();

    // Display version from manifest
    if (versionDisplay) {
        versionDisplay.textContent = `Version ${chrome.runtime.getManifest().version}`;
    }

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

        // Update skip on dislike toggle
        if (skipOnDislikeToggle) {
            skipOnDislikeToggle.checked = settings.skipOnDislike;
        }

        // Update delay slider
        delayRange.value = settings.delaySeconds;
        delayValue.textContent = settings.delaySeconds;

        // Update theme switcher
        updateThemeSwitcher(settings.darkMode);

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

    // Toggle skip on dislike
    if (skipOnDislikeToggle) {
        skipOnDislikeToggle.addEventListener('change', handleSkipOnDislikeToggle);
    }

    // Delay slider
    delayRange.addEventListener('input', handleDelayInput);
    delayRange.addEventListener('change', handleDelayChange);

    // Theme switcher buttons
    if (themeLight) themeLight.addEventListener('click', () => handleThemeChange('light'));
    if (themeDark) themeDark.addEventListener('click', () => handleThemeChange('dark'));
    if (themeAuto) themeAuto.addEventListener('click', () => handleThemeChange('auto'));

    // Reset settings button
    resetBtn.addEventListener('click', handleReset);

    // Reset counter button
    if (resetCountBtn) {
        resetCountBtn.addEventListener('click', handleResetCount);
    }

    // Listen for storage changes (sync with popup)
    chrome.storage.onChanged.addListener(handleStorageChange);
}

/**
 * Update theme switcher button states
 * @param {string} theme - 'light' | 'dark' | 'auto'
 */
function updateThemeSwitcher(theme) {
    // Remove active class from all buttons
    [themeLight, themeDark, themeAuto].forEach(btn => {
        if (btn) btn.classList.remove('theme-switcher__btn--active');
    });

    // Add active class to current theme button
    switch (theme) {
        case 'light':
            if (themeLight) themeLight.classList.add('theme-switcher__btn--active');
            break;
        case 'dark':
            if (themeDark) themeDark.classList.add('theme-switcher__btn--active');
            break;
        case 'auto':
        default:
            if (themeAuto) themeAuto.classList.add('theme-switcher__btn--active');
            break;
    }
}

/**
 * Load skip count from storage and update display
 */
async function loadSkipCount() {
    try {
        const { skipCount = 0 } = await chrome.storage.sync.get('skipCount');
        updateSkipCountDisplay(skipCount);
        console.log('[LazyShorts Settings] Skip count loaded:', skipCount);
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to load skip count:', error);
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
 * Handle reset counter button click
 */
async function handleResetCount() {
    const confirmed = confirm('Are you sure you want to reset the skip counter to 0?');

    if (!confirmed) {
        return;
    }

    try {
        await chrome.storage.sync.set({ skipCount: 0 });
        updateSkipCountDisplay(0);
        console.log('[LazyShorts Settings] Skip count reset to 0');

        // Visual feedback
        if (resetCountBtn) {
            const originalText = resetCountBtn.textContent;
            resetCountBtn.textContent = '✓ Reset successful';
            resetCountBtn.disabled = true;
            setTimeout(() => {
                resetCountBtn.textContent = originalText;
                resetCountBtn.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to reset skip count:', error);
        alert('Failed to reset counter. Please try again.');
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
        console.log('[LazyShorts Settings] Auto-skip', enabled ? 'enabled' : 'disabled');
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update setting:', error);
        event.target.checked = !enabled; // Revert on error
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
        console.log('[LazyShorts Settings] Skip on dislike', enabled ? 'enabled' : 'disabled');
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update skip on dislike:', error);
        event.target.checked = !enabled;
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

        // Update button states
        updateThemeSwitcher(theme);

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
        updateThemeSwitcher(theme);
        applyTheme(theme);
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

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
