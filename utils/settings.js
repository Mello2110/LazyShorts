/**
 * LazyShorts Settings Utility Module
 * Reusable functions for managing extension settings
 */

// Default settings configuration
const DEFAULT_SETTINGS = {
    enabled: true,
    delaySeconds: 0,
    darkMode: 'auto' // 'light' | 'dark' | 'auto'
};

/**
 * Get all settings from chrome.storage.sync
 * Falls back to defaults if storage fails or is empty
 * 
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
    try {
        const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
        return data;
    } catch (error) {
        console.error('[LazyShorts] Settings retrieval failed:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Update a single setting
 * Validates input before saving
 * 
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @returns {Promise<void>}
 * @throws {Error} If validation fails
 */
export async function updateSetting(key, value) {
    validateSetting(key, value);

    try {
        await chrome.storage.sync.set({ [key]: value });
        console.log(`[LazyShorts] Setting updated: ${key} = ${value}`);
    } catch (error) {
        if (error.message.includes('QUOTA_BYTES')) {
            throw new Error('Storage quota exceeded. Please reduce data or contact support.');
        }
        throw error;
    }
}

/**
 * Update multiple settings at once
 * 
 * @param {Object} settings - Object with key-value pairs to update
 * @returns {Promise<void>}
 */
export async function updateSettings(settings) {
    // Validate all settings first
    for (const [key, value] of Object.entries(settings)) {
        validateSetting(key, value);
    }

    try {
        await chrome.storage.sync.set(settings);
        console.log('[LazyShorts] Settings updated:', settings);
    } catch (error) {
        if (error.message.includes('QUOTA_BYTES')) {
            throw new Error('Storage quota exceeded. Please reduce data or contact support.');
        }
        throw error;
    }
}

/**
 * Reset all settings to defaults
 * 
 * @returns {Promise<void>}
 */
export async function resetSettings() {
    try {
        await chrome.storage.sync.set(DEFAULT_SETTINGS);
        console.log('[LazyShorts] Settings reset to defaults');
    } catch (error) {
        console.error('[LazyShorts] Failed to reset settings:', error);
        throw error;
    }
}

/**
 * Validate a single setting
 * 
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @throws {Error} If validation fails
 */
function validateSetting(key, value) {
    switch (key) {
        case 'enabled':
            if (typeof value !== 'boolean') {
                throw new Error('Setting "enabled" must be a boolean');
            }
            break;

        case 'delaySeconds':
            if (typeof value !== 'number') {
                throw new Error('Setting "delaySeconds" must be a number');
            }
            if (value < 0 || value > 5) {
                throw new Error('Setting "delaySeconds" must be between 0 and 5');
            }
            if (!Number.isInteger(value)) {
                throw new Error('Setting "delaySeconds" must be an integer');
            }
            break;

        case 'darkMode':
            if (typeof value !== 'string') {
                throw new Error('Setting "darkMode" must be a string');
            }
            if (!['light', 'dark', 'auto'].includes(value)) {
                throw new Error('Setting "darkMode" must be "light", "dark", or "auto"');
            }
            break;

        default:
            throw new Error(`Unknown setting key: "${key}"`);
    }
}

/**
 * Listen for settings changes
 * Calls callback when any setting changes
 * 
 * @param {Function} callback - Called with (changes, areaName)
 * @returns {Function} Unsubscribe function
 */
export function onSettingsChanged(callback) {
    const listener = (changes, areaName) => {
        if (areaName === 'sync') {
            callback(changes, areaName);
        }
    };

    chrome.storage.onChanged.addListener(listener);

    // Return unsubscribe function
    return () => {
        chrome.storage.onChanged.removeListener(listener);
    };
}

/**
 * Get storage quota info
 * Useful for debugging and monitoring
 * 
 * @returns {Promise<Object>} Quota information
 */
export async function getStorageQuota() {
    try {
        const bytesInUse = await chrome.storage.sync.getBytesInUse();
        const quota = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB
        const quotaPerItem = chrome.storage.sync.QUOTA_BYTES_PER_ITEM || 8192; // 8KB

        return {
            bytesInUse,
            quota,
            quotaPerItem,
            percentUsed: (bytesInUse / quota * 100).toFixed(2),
            available: quota - bytesInUse
        };
    } catch (error) {
        console.error('[LazyShorts] Failed to get storage quota:', error);
        return null;
    }
}

// Export defaults for testing
export { DEFAULT_SETTINGS };
