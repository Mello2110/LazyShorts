/**
 * LazyShorts Content Script
 * Automatically advances to the next YouTube Short when current one finishes
 */

// Selector arrays with fallbacks for YouTube DOM changes
const SELECTORS = {
    nextButton: [
        'button[aria-label*="Next"]',
        'button[aria-label*="next"]',
        'button[aria-label*="Nächste"]',
        '.ytd-shorts-player-controls button:last-child',
        '#navigation-button-down',
        'ytd-shorts #navigation-button-down',
        'button.ytp-next-button'
    ],
    videoPlayer: [
        'video.html5-main-video',
        'ytd-shorts video',
        '.shorts-video-container video',
        'video.video-stream',
        'video'
    ]
};

// State
let settings = {};
let videoElement = null;
let videoEndedListener = null;
let isInitialized = false;

/**
 * Increment the skip count in storage
 * @returns {Promise<number|null>} New skip count value or null on error
 */
async function incrementSkipCount() {
    try {
        const result = await chrome.storage.sync.get({ skipCount: 0 });
        const newCount = result.skipCount + 1;
        await chrome.storage.sync.set({ skipCount: newCount });
        console.log('[LazyShorts] Skip count incremented to:', newCount);
        return newCount;
    } catch (error) {
        console.error('[LazyShorts] Failed to increment skip count:', error);
        return null;
    }
}

/**
 * Initialize the extension
 */
async function init() {
    console.log('[LazyShorts] Initializing on:', window.location.href);

    // Check if we're on a YouTube Shorts page
    if (!isYouTubeShorts()) {
        console.log('[LazyShorts] Not on YouTube Shorts page, exiting');
        return;
    }

    // Load settings
    await loadSettings();

    // Setup auto-skip if enabled
    await setupAutoSkip();

    // Listen for settings changes
    chrome.storage.onChanged.addListener(handleSettingsChange);

    // Listen for navigation changes (YouTube is an SPA)
    observeUrlChanges();

    isInitialized = true;
    console.log('[LazyShorts] Initialized successfully');
}

/**
 * Check if current URL is a YouTube Shorts page
 * @returns {boolean}
 */
function isYouTubeShorts() {
    return window.location.pathname.startsWith('/shorts/');
}

/**
 * Load settings from chrome.storage.sync
 */
async function loadSettings() {
    try {
        const defaults = {
            enabled: true,
            delaySeconds: 0,
            darkMode: 'auto'
        };
        settings = await chrome.storage.sync.get(defaults);
        console.log('[LazyShorts] Settings loaded:', settings);
    } catch (error) {
        console.error('[LazyShorts] Failed to load settings:', error);
        // Use defaults if storage fails
        settings = { enabled: true, delaySeconds: 0, darkMode: 'auto' };
    }
}

/**
 * Setup auto-skip functionality based on current settings
 */
async function setupAutoSkip() {
    // Remove existing listener if any
    removeVideoListener();

    if (!settings.enabled) {
        console.log('[LazyShorts] Auto-skip disabled');
        return;
    }

    // Find video element with improved retry logic
    waitForVideoElement((video) => {
        videoElement = video;

        // CRITICAL: Disable loop to prevent auto-replay
        try {
            if (videoElement.hasAttribute('loop')) {
                videoElement.removeAttribute('loop');
            }
            videoElement.loop = false;
            console.log('[LazyShorts] Video loop disabled');
        } catch (e) {
            console.warn('[LazyShorts] Could not disable loop:', e);
        }

        console.log('[LazyShorts] Video player found, attaching listener');

        // Create and attach event listener
        videoEndedListener = handleVideoEnd;
        videoElement.addEventListener('ended', videoEndedListener);

        console.log('[LazyShorts] Auto-skip enabled');
    });
}

/**
 * Wait for video element with retry logic
 * @param {Function} callback - Called when video is found
 * @param {number} attempts - Current attempt number
 * @param {number} maxAttempts - Maximum attempts before giving up
 */
function waitForVideoElement(callback, attempts = 0, maxAttempts = 50) {
    const video = findElement(SELECTORS.videoPlayer);

    if (video && video.readyState !== undefined) {
        // Video found and is an actual video element
        console.log(`[LazyShorts] Video found after ${attempts + 1} attempt(s)`);
        callback(video);
    } else if (attempts < maxAttempts) {
        // Retry after 100ms
        setTimeout(() => {
            waitForVideoElement(callback, attempts + 1, maxAttempts);
        }, 100);
    } else {
        console.error('[LazyShorts] Video element not found after', maxAttempts, 'attempts (5 seconds)');
        console.error('[LazyShorts] Please report this issue with your browser and YouTube version');
    }
}

/**
 * Handle video ended event
 */
function handleVideoEnd() {
    console.log('[LazyShorts] Video ended, preparing to skip...');

    // Find next button
    const nextButton = findElement(SELECTORS.nextButton);

    if (!nextButton) {
        console.warn('[LazyShorts] Next button not found - trying keyboard navigation');

        // Apply delay if configured, then try keyboard
        const delay = settings.delaySeconds * 1000;
        setTimeout(() => {
            tryKeyboardNavigation();
        }, delay);
        return;
    }

    console.log('[LazyShorts] Next button found');

    // Apply delay if configured
    const delay = settings.delaySeconds * 1000;

    if (delay > 0) {
        console.log(`[LazyShorts] Waiting ${settings.delaySeconds} seconds before skipping...`);
        setTimeout(() => {
            clickNextButton(nextButton);
        }, delay);
    } else {
        clickNextButton(nextButton);
    }
}

/**
 * Click the next button
 * @param {HTMLElement} button 
 */
function clickNextButton(button) {
    try {
        // Disable video loop before clicking
        if (videoElement) {
            videoElement.loop = false;
        }

        button.click();
        console.log('[LazyShorts] Clicked "Next" button');

        // Increment skip counter
        incrementSkipCount();

        // Verify navigation occurred after short delay
        setTimeout(() => {
            console.log('[LazyShorts] Current URL after click:', window.location.href);
        }, 500);
    } catch (error) {
        console.error('[LazyShorts] Failed to click "Next" button:', error);
        console.log('[LazyShorts] Attempting keyboard navigation fallback...');
        tryKeyboardNavigation();
    }
}

/**
 * Attempt to navigate using keyboard event (fallback method)
 */
function tryKeyboardNavigation() {
    try {
        // Disable video loop first
        if (videoElement) {
            videoElement.loop = false;
        }

        // Dispatch Arrow Down keydown event
        const keyEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
            view: window
        });

        document.dispatchEvent(keyEvent);
        console.log('[LazyShorts] Arrow Down key event dispatched');

        // Increment skip counter
        incrementSkipCount();

        // Verify navigation
        setTimeout(() => {
            console.log('[LazyShorts] URL after keyboard event:', window.location.href);
        }, 500);
    } catch (error) {
        console.error('[LazyShorts] Keyboard navigation also failed:', error);
    }
}

/**
 * Find element using fallback selectors
 * @param {string[]} selectorArray - Array of selectors to try
 * @returns {HTMLElement|null}
 */
function findElement(selectorArray) {
    for (const selector of selectorArray) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`[LazyShorts] Element found with selector: ${selector}`);
                return element;
            }
        } catch (error) {
            console.warn(`[LazyShorts] Invalid selector: ${selector}`, error);
        }
    }
    return null;
}

/**
 * Remove video event listener
 */
function removeVideoListener() {
    if (videoElement && videoEndedListener) {
        videoElement.removeEventListener('ended', videoEndedListener);
        console.log('[LazyShorts] Video listener removed');
    }
    videoElement = null;
    videoEndedListener = null;
}

/**
 * Handle settings change events
 * @param {Object} changes 
 * @param {string} areaName 
 */
function handleSettingsChange(changes, areaName) {
    if (areaName !== 'sync') return;

    console.log('[LazyShorts] Settings changed:', changes);

    // Update local settings
    for (const [key, { newValue }] of Object.entries(changes)) {
        settings[key] = newValue;
    }

    // Re-setup auto-skip with new settings
    setupAutoSkip();
}

/**
 * Observe URL changes (YouTube is a Single Page Application)
 * Re-initialize when navigating to/from Shorts
 */
function observeUrlChanges() {
    let lastUrl = window.location.href;
    let urlChangeTimeout = null;

    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== lastUrl) {
            console.log('[LazyShorts] URL changed:', currentUrl);
            lastUrl = currentUrl;

            // Clear any pending re-initialization
            if (urlChangeTimeout) {
                clearTimeout(urlChangeTimeout);
            }

            // Debounce re-initialization to avoid multiple rapid calls
            urlChangeTimeout = setTimeout(() => {
                if (isYouTubeShorts()) {
                    console.log('[LazyShorts] Navigated to Shorts, re-initializing...');
                    setupAutoSkip();
                } else {
                    console.log('[LazyShorts] Left Shorts page, cleaning up...');
                    removeVideoListener();
                }
            }, 500); // Wait 500ms before re-initializing
        }
    });

    // Observe the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[LazyShorts] URL observer attached');
}

/**
 * Cleanup function (called when extension is disabled/unloaded)
 */
function cleanup() {
    removeVideoListener();
    chrome.storage.onChanged.removeListener(handleSettingsChange);
    console.log('[LazyShorts] Cleaned up');
}

// Initialize when script loads
init();

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);
