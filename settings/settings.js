/**
 * LazyShorts Settings Page Script
 * Handles settings page interactions and real-time syncing
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const enableYouTubeToggle = document.getElementById('enableYouTubeToggle');
const enableTikTokToggle = document.getElementById('enableTikTokToggle');
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
    enableYouTube: true,
    enableTikTok: true,
    delaySeconds: 0,
    darkMode: 'auto',
    skipOnDislike: true
};

/**
 * Initialize settings page
 */
async function init() {
    console.log('[LazyShorts Settings] Initializing...');

    await loadSettings();
    await loadSkipCount();

    if (versionDisplay) {
        versionDisplay.textContent = `Version ${chrome.runtime.getManifest().version}`;
    }

    setupEventListeners();
    console.log('[LazyShorts Settings] Initialized');
}

/**
 * Load settings from storage and update UI
 */
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

        // Update main toggle
        if (enableToggle) {
            enableToggle.checked = settings.enabled !== false;
        }

        // Update platform toggles
        if (enableYouTubeToggle) {
            enableYouTubeToggle.checked = settings.enableYouTube !== false;
        }
        if (enableTikTokToggle) {
            enableTikTokToggle.checked = settings.enableTikTok !== false;
        }

        // Update skip on dislike toggle
        if (skipOnDislikeToggle) {
            skipOnDislikeToggle.checked = settings.skipOnDislike !== false;
        }

        // Update delay slider
        if (delayRange && delayValue) {
            delayRange.value = settings.delaySeconds || 0;
            delayValue.textContent = settings.delaySeconds || 0;
        }

        // Update theme switcher
        updateThemeSwitcher(settings.darkMode || 'auto');
        applyTheme(settings.darkMode || 'auto');

        console.log('[LazyShorts Settings] Settings loaded:', settings);
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to load settings:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Master auto-skip toggle
    if (enableToggle) {
        enableToggle.addEventListener('change', handleToggleChange);
    }

    // Platform toggles
    if (enableYouTubeToggle) {
        enableYouTubeToggle.addEventListener('change', async (e) => {
            await chrome.storage.sync.set({ enableYouTube: e.target.checked });
        });
    }

    if (enableTikTokToggle) {
        enableTikTokToggle.addEventListener('change', async (e) => {
            await chrome.storage.sync.set({ enableTikTok: e.target.checked });
        });
    }

    // Toggle skip on dislike / not interested
    if (skipOnDislikeToggle) {
        skipOnDislikeToggle.addEventListener('change', handleSkipOnDislikeToggle);
    }

    // Delay slider
    if (delayRange) {
        delayRange.addEventListener('input', handleDelayInput);
        delayRange.addEventListener('change', handleDelayChange);
    }

    // Theme switcher buttons
    if (themeLight) themeLight.addEventListener('click', () => handleThemeChange('light'));
    if (themeDark) themeDark.addEventListener('click', () => handleThemeChange('dark'));
    if (themeAuto) themeAuto.addEventListener('click', () => handleThemeChange('auto'));

    // Reset settings button
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }

    // Reset counter button
    if (resetCountBtn) {
        resetCountBtn.addEventListener('click', handleResetCount);
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener(handleStorageChange);
}

/**
 * Update theme switcher button states
 */
function updateThemeSwitcher(theme) {
    [themeLight, themeDark, themeAuto].forEach(btn => {
        if (btn) btn.classList.remove('theme-switcher__btn--active');
    });

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
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to load skip count:', error);
    }
}

/**
 * Update skip count display
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
    if (!confirmed) return;

    try {
        await chrome.storage.sync.set({ skipCount: 0 });
        updateSkipCountDisplay(0);

        if (resetCountBtn) {
            const originalText = resetCountBtn.textContent;
            resetCountBtn.textContent = '✓ Counter Reset';
            resetCountBtn.disabled = true;
            setTimeout(() => {
                resetCountBtn.textContent = originalText;
                resetCountBtn.disabled = false;
            }, 1800);
        }
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to reset skip count:', error);
        alert('Failed to reset counter. Please try again.');
    }
}

/**
 * Handle master toggle change
 */
async function handleToggleChange(event) {
    const enabled = event.target.checked;
    try {
        await chrome.storage.sync.set({ enabled });
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update setting:', error);
        event.target.checked = !enabled;
    }
}

/**
 * Handle skip on dislike toggle change
 */
async function handleSkipOnDislikeToggle(event) {
    const enabled = event.target.checked;
    try {
        await chrome.storage.sync.set({ skipOnDislike: enabled });
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update skip on dislike:', error);
        event.target.checked = !enabled;
    }
}

/**
 * Handle delay slider input
 */
function handleDelayInput(event) {
    const value = parseInt(event.target.value, 10);
    if (delayValue) {
        delayValue.textContent = value;
    }
}

/**
 * Handle delay slider change
 */
async function handleDelayChange(event) {
    const delaySeconds = parseInt(event.target.value, 10);
    try {
        await chrome.storage.sync.set({ delaySeconds });
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update delay:', error);
    }
}

/**
 * Handle theme change
 */
async function handleThemeChange(theme) {
    try {
        await chrome.storage.sync.set({ darkMode: theme });
        updateThemeSwitcher(theme);
        applyTheme(theme);
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to update theme:', error);
    }
}

/**
 * Apply theme to page
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
    const confirmed = confirm(
        'Are you sure you want to reset all settings to their default values?'
    );
    if (!confirmed) return;

    try {
        await chrome.storage.sync.set(DEFAULT_SETTINGS);
        await loadSettings();
        alert('Settings have been reset to defaults');
    } catch (error) {
        console.error('[LazyShorts Settings] Failed to reset settings:', error);
        alert('Failed to reset settings. Please try again.');
    }
}

/**
 * Handle storage changes
 */
function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync') return;

    if (changes.enabled && enableToggle) {
        enableToggle.checked = changes.enabled.newValue;
    }
    if (changes.enableYouTube && enableYouTubeToggle) {
        enableYouTubeToggle.checked = changes.enableYouTube.newValue;
    }
    if (changes.enableTikTok && enableTikTokToggle) {
        enableTikTokToggle.checked = changes.enableTikTok.newValue;
    }
    if (changes.delaySeconds && delayRange && delayValue) {
        delayRange.value = changes.delaySeconds.newValue;
        delayValue.textContent = changes.delaySeconds.newValue;
    }
    if (changes.darkMode) {
        const theme = changes.darkMode.newValue;
        updateThemeSwitcher(theme);
        applyTheme(theme);
    }
    if (changes.skipCount) {
        updateSkipCountDisplay(changes.skipCount.newValue);
    }
    if (changes.skipOnDislike && skipOnDislikeToggle) {
        skipOnDislikeToggle.checked = changes.skipOnDislike.newValue;
    }
}

document.addEventListener('DOMContentLoaded', init);
