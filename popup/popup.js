/**
 * LazyShorts Popup Script
 * Handles popup UI interactions, real-time status checking, and settings synchronization
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const skipOnDislikeToggle = document.getElementById('skipOnDislikeToggle');
const delayRange = document.getElementById('delayRange');
const delayValue = document.getElementById('delayValue');
const masterToggleDesc = document.getElementById('masterToggleDesc');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const quickSkipBtn = document.getElementById('quickSkipBtn');
const settingsBtn = document.getElementById('settingsBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const skipCountDisplay = document.getElementById('skipCountDisplay');
const presetChips = document.querySelectorAll('.popup__preset-chip');
const toastEl = document.getElementById('toast');

// Current state
let currentTheme = 'auto';
let toastTimeout = null;
let activeTabId = null;

/**
 * Initialize popup
 */
async function init() {
    await loadSettings();
    await loadSkipCount();
    await checkTabStatus();
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
        if (enableToggle) {
            enableToggle.checked = settings.enabled;
            updateMasterToggleDesc(settings.enabled);
        }

        if (skipOnDislikeToggle) {
            skipOnDislikeToggle.checked = settings.skipOnDislike;
        }

        // Update delay slider and preset chips
        if (delayRange) {
            delayRange.value = settings.delaySeconds;
        }
        if (delayValue) {
            delayValue.textContent = settings.delaySeconds;
        }
        updateActivePresetChip(settings.delaySeconds);

        // Apply theme
        currentTheme = settings.darkMode;
        applyTheme(currentTheme);
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to load settings:', error);
    }
}

/**
 * Update master toggle description text
 */
function updateMasterToggleDesc(isEnabled) {
    if (!masterToggleDesc) return;
    masterToggleDesc.textContent = isEnabled
        ? 'Advances automatically when video ends'
        : 'Auto-advance is paused';
}

/**
 * Highlight active delay preset chip
 */
function updateActivePresetChip(delaySeconds) {
    presetChips.forEach(chip => {
        const chipDelay = parseInt(chip.getAttribute('data-delay'), 10);
        if (chipDelay === delaySeconds) {
            chip.classList.add('popup__preset-chip--active');
        } else {
            chip.classList.remove('popup__preset-chip--active');
        }
    });
}

/**
 * Load skip count from storage and update display
 */
async function loadSkipCount() {
    try {
        const { skipCount = 0 } = await chrome.storage.sync.get('skipCount');
        if (skipCountDisplay) {
            skipCountDisplay.textContent = new Intl.NumberFormat().format(skipCount);
        }
    } catch (error) {
        console.error('[LazyShorts Popup] Failed to load skip count:', error);
    }
}

/**
 * Check active tab to see if LazyShorts is active on it
 */
async function checkTabStatus() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            setTabStatus('inactive', 'No active tab');
            return;
        }

        const activeTab = tabs[0];
        activeTabId = activeTab.id;
        const url = activeTab.url || '';

        // First attempt: ping content script on active tab
        try {
            const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_STATUS' });
            if (response && response.isTargetPage) {
                const name = response.platform === 'youtube' ? 'YouTube Shorts' : (response.platform === 'tiktok' ? 'TikTok' : 'Supported video');
                if (response.active) {
                    setTabStatus('active', `Active on ${name}`, true);
                } else {
                    setTabStatus('warning', `Paused for ${name}`, false);
                }
                return;
            }
        } catch (e) {
            // Content script not answering (e.g. non-target page or needs page reload)
        }

        // Fallback check URL patterns
        if (url.includes('youtube.com/shorts')) {
            setTabStatus('warning', 'YouTube Shorts (Reload to activate)', false);
        } else if (url.includes('tiktok.com')) {
            setTabStatus('warning', 'TikTok (Reload to activate)', false);
        } else {
            setTabStatus('inactive', 'Inactive on this page', false);
        }
    } catch (error) {
        setTabStatus('inactive', 'Inactive', false);
    }
}

/**
 * Update the status badge in popup header
 */
function setTabStatus(status, text, canSkip = false) {
    if (!statusDot || !statusText) return;

    statusDot.className = 'popup__status-dot';
    statusText.textContent = text;

    if (status === 'active') {
        statusDot.classList.add('popup__status-dot--active');
    } else if (status === 'warning') {
        statusDot.classList.add('popup__status-dot--warning');
    } else {
        statusDot.classList.add('popup__status-dot--inactive');
    }

    if (quickSkipBtn) {
        quickSkipBtn.disabled = !canSkip;
        quickSkipBtn.title = canSkip ? 'Immediately skip to next video' : 'Available when watching YouTube Shorts or TikTok';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Master toggle
    if (enableToggle) {
        enableToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            try {
                await chrome.storage.sync.set({ enabled });
                updateMasterToggleDesc(enabled);
                showToast(enabled ? '✓ Auto-advance enabled' : '✗ Auto-advance paused');
                await checkTabStatus();
            } catch (err) {
                e.target.checked = !enabled;
                showToast('Failed to save setting', 'error');
            }
        });
    }

    // Skip on dislike toggle
    if (skipOnDislikeToggle) {
        skipOnDislikeToggle.addEventListener('change', async (e) => {
            const skipOnDislike = e.target.checked;
            try {
                await chrome.storage.sync.set({ skipOnDislike });
                showToast(skipOnDislike ? '✓ Skip on dislike enabled' : '✗ Skip on dislike disabled');
            } catch (err) {
                e.target.checked = !skipOnDislike;
                showToast('Failed to save setting', 'error');
            }
        });
    }

    // Delay slider
    if (delayRange) {
        delayRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (delayValue) delayValue.textContent = val;
            updateActivePresetChip(val);
        });

        delayRange.addEventListener('change', async (e) => {
            const delaySeconds = parseInt(e.target.value, 10);
            await saveDelay(delaySeconds);
        });
    }

    // Preset chips
    presetChips.forEach(chip => {
        chip.addEventListener('click', async () => {
            const delay = parseInt(chip.getAttribute('data-delay'), 10);
            if (delayRange) delayRange.value = delay;
            if (delayValue) delayValue.textContent = delay;
            updateActivePresetChip(delay);
            await saveDelay(delay);
        });
    });

    // Quick skip button
    if (quickSkipBtn) {
        quickSkipBtn.addEventListener('click', async () => {
            if (!activeTabId) return;
            try {
                await chrome.tabs.sendMessage(activeTabId, { type: 'SKIP_NOW' });
                showToast('✓ Skipped to next video');
            } catch (e) {
                showToast('Failed to skip video', 'error');
            }
        });
    }

    // Theme toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', handleThemeToggle);
    }

    // Open settings
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
        });
    }

    // Storage sync listener
    chrome.storage.onChanged.addListener(handleStorageChange);
}

/**
 * Save delay value helper
 */
async function saveDelay(delaySeconds) {
    try {
        await chrome.storage.sync.set({ delaySeconds });
        showToast(delaySeconds === 0 ? 'Delay: Instant (0s)' : `Delay: ${delaySeconds}s`);
    } catch (err) {
        showToast('Failed to update delay', 'error');
    }
}

/**
 * Handle theme toggle
 */
async function handleThemeToggle() {
    let effective = currentTheme;
    if (currentTheme === 'auto') {
        effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    const nextTheme = effective === 'dark' ? 'light' : 'dark';
    try {
        await chrome.storage.sync.set({ darkMode: nextTheme });
        currentTheme = nextTheme;
        applyTheme(nextTheme);
        showToast(`Theme: ${nextTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}`);
    } catch (e) {
        console.error('Failed to toggle theme:', e);
    }
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
    if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

/**
 * Listen for storage updates
 */
function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync') return;

    if (changes.enabled && enableToggle) {
        enableToggle.checked = changes.enabled.newValue;
        updateMasterToggleDesc(changes.enabled.newValue);
    }
    if (changes.skipOnDislike && skipOnDislikeToggle) {
        skipOnDislikeToggle.checked = changes.skipOnDislike.newValue;
    }
    if (changes.delaySeconds) {
        const val = changes.delaySeconds.newValue;
        if (delayRange) delayRange.value = val;
        if (delayValue) delayValue.textContent = val;
        updateActivePresetChip(val);
    }
    if (changes.darkMode) {
        currentTheme = changes.darkMode.newValue;
        applyTheme(currentTheme);
    }
    if (changes.skipCount && skipCountDisplay) {
        skipCountDisplay.textContent = new Intl.NumberFormat().format(changes.skipCount.newValue);
    }
}

/**
 * Toast notifications
 */
function showToast(message, type = 'success') {
    if (!toastEl) return;

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastEl.className = 'popup__toast';
    toastEl.textContent = message;

    if (type === 'error') {
        toastEl.classList.add('popup__toast--error');
    }

    void toastEl.offsetWidth;
    toastEl.classList.add('popup__toast--visible');

    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('popup__toast--visible');
    }, 1800);
}

document.addEventListener('DOMContentLoaded', init);
