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
    ],
    // NEW: Updated selectors for YouTube's new Web Component architecture
    likeButton: [
        'ytd-reel-video-renderer[is-active] like-button-view-model button',
        'like-button-view-model button',
        'ytd-reel-video-renderer[is-active] button[aria-label*="liken"]',
        'ytd-reel-video-renderer[is-active] button[aria-label*="Like"]',
        'button[aria-label*="liken"]',
        'button[aria-label*="Like this video"]',
        '#like-button button'
    ],
    dislikeButton: [
        'ytd-reel-video-renderer[is-active] dislike-button-view-model button',
        'dislike-button-view-model button',
        'ytd-reel-video-renderer[is-active] button[aria-label*="Mag ich nicht"]',
        'ytd-reel-video-renderer[is-active] button[aria-label*="Dislike"]',
        'button[aria-label*="Mag ich nicht"]',
        'button[aria-label*="Dislike this video"]',
        '#dislike-button button'
    ]
};


// State
let settings = {};
let videoElement = null;
let videoEndedListener = null;
let loopPreventionListener = null; // Listener to continuously prevent loop
let videoAttributeObserver = null; // MutationObserver to watch for loop attribute changes
let isInitialized = false;
let skipAlreadyTriggered = false; // Prevent double-skip (dislike + video end)
let dislikeListenerAttached = false; // Track if dislike listener is attached

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
 * Get the skip on dislike setting
 * @returns {Promise<boolean>}
 */
async function getSkipOnDislikeSetting() {
    try {
        const { skipOnDislike = true } = await chrome.storage.sync.get('skipOnDislike');
        return skipOnDislike;
    } catch (error) {
        console.error('[LazyShorts] Failed to get skipOnDislike setting:', error);
        return true;
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

    // Setup skip on dislike
    initializeSkipOnDislike();

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
            darkMode: 'auto',
            skipOnDislike: true
        };
        settings = await chrome.storage.sync.get(defaults);
        console.log('[LazyShorts] Settings loaded:', settings);
    } catch (error) {
        console.error('[LazyShorts] Failed to load settings:', error);
        // Use defaults if storage fails
        settings = { enabled: true, delaySeconds: 0, darkMode: 'auto', skipOnDislike: true };
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
        disableVideoLoop();

        // CRITICAL: Set up CONTINUOUS loop prevention
        // YouTube may re-enable loop dynamically (e.g., after seeking/fast-forward)
        setupContinuousLoopPrevention();

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

    // Check if skip was already triggered (e.g., by dislike)
    if (skipAlreadyTriggered) {
        console.log('[LazyShorts] Skip already triggered for this Short, ignoring video end');
        return;
    }

    // Find next button
    const nextButton = findElement(SELECTORS.nextButton);

    if (!nextButton) {
        console.warn('[LazyShorts] Next button not found - trying keyboard navigation');

        // Apply delay if configured, then try keyboard
        const delay = settings.delaySeconds * 1000;
        setTimeout(() => {
            skipToNextShort('video-end');
        }, delay);
        return;
    }

    console.log('[LazyShorts] Next button found');

    // Apply delay if configured
    const delay = settings.delaySeconds * 1000;

    if (delay > 0) {
        console.log(`[LazyShorts] Waiting ${settings.delaySeconds} seconds before skipping...`);
        setTimeout(() => {
            skipToNextShort('video-end');
        }, delay);
    } else {
        skipToNextShort('video-end');
    }
}

/**
 * Skip to the next Short
 * @param {string} source - What triggered the skip ('video-end' | 'dislike')
 */
function skipToNextShort(source = 'video-end') {
    console.log(`[LazyShorts] Skipping Short (source: ${source})`);

    // Mark skip as triggered to prevent double-skip
    skipAlreadyTriggered = true;

    // Try button click first
    const nextButton = findElement(SELECTORS.nextButton);

    if (nextButton) {
        try {
            // Disable video loop before clicking
            if (videoElement) {
                videoElement.loop = false;
            }

            nextButton.click();
            console.log('[LazyShorts] Clicked "Next" button');

            // Increment skip counter
            incrementSkipCount();

            // Verify navigation occurred after short delay
            setTimeout(() => {
                console.log('[LazyShorts] Current URL after click:', window.location.href);
            }, 500);

            return;
        } catch (error) {
            console.error('[LazyShorts] Failed to click "Next" button:', error);
        }
    }

    // Fallback: keyboard navigation
    tryKeyboardNavigation();
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

// ============================================
// SKIP ON DISLIKE FEATURE
// ============================================

/**
 * Find like and dislike buttons with validation
 * @returns {{likeButton: HTMLElement|null, dislikeButton: HTMLElement|null}}
 */
function findLikeDislikeButtons() {
    const likeButton = findElement(SELECTORS.likeButton);
    const dislikeButton = findElement(SELECTORS.dislikeButton);

    console.log('[LazyShorts] Button search results:', {
        likeFound: !!likeButton,
        dislikeFound: !!dislikeButton,
        likeLabel: likeButton?.getAttribute('aria-label'),
        dislikeLabel: dislikeButton?.getAttribute('aria-label')
    });

    // Validate that we found both and they are different elements
    if (likeButton && dislikeButton && likeButton !== dislikeButton) {
        return { likeButton, dislikeButton };
    }

    // Additional validation: check aria-labels to ensure correct identification
    if (likeButton && dislikeButton) {
        const likeLabel = likeButton.getAttribute('aria-label')?.toLowerCase() || '';
        const dislikeLabel = dislikeButton.getAttribute('aria-label')?.toLowerCase() || '';

        // Support both English and German labels
        // German: "liken" for like, "Mag ich nicht" for dislike
        // English: "like" for like, "dislike" for dislike
        const isLikeButton = likeLabel.includes('like') || likeLabel.includes('liken');
        const isDislikeButton = dislikeLabel.includes('dislike') || dislikeLabel.includes('mag ich nicht');

        if (isLikeButton && isDislikeButton) {
            return { likeButton, dislikeButton };
        }
    }

    console.warn('[LazyShorts] Could not reliably identify like/dislike buttons');
    return { likeButton: null, dislikeButton: null };
}

/**
 * Attach click listener to the dislike button
 */
function attachDislikeListener() {
    const { likeButton, dislikeButton } = findLikeDislikeButtons();

    // Validate buttons
    if (!likeButton || !dislikeButton) {
        console.warn('[LazyShorts] Skip-on-dislike: Buttons not found, feature disabled for this Short');
        return;
    }

    if (likeButton === dislikeButton) {
        console.error('[LazyShorts] CRITICAL: Like and dislike are same element! Feature disabled.');
        return;
    }

    console.log('[LazyShorts] Like/dislike buttons found:', {
        like: likeButton.getAttribute('aria-label'),
        dislike: dislikeButton.getAttribute('aria-label')
    });

    // Remove existing listeners to prevent duplicates
    dislikeButton.removeEventListener('click', handleDislikeClick, true);
    likeButton.removeEventListener('click', handleLikeClick, true);

    // Attach listener to DISLIKE button
    dislikeButton.addEventListener('click', handleDislikeClick, { capture: true });

    // Attach listener to LIKE button for verification (should never skip)
    likeButton.addEventListener('click', handleLikeClick, { capture: true });

    dislikeListenerAttached = true;
    console.log('[LazyShorts] Dislike listener attached successfully');
}

/**
 * Handle dislike button click
 * @param {Event} event
 */
async function handleDislikeClick(event) {
    console.log('[LazyShorts] Dislike button clicked');

    // Check if feature is enabled
    const skipOnDislike = await getSkipOnDislikeSetting();

    if (!skipOnDislike) {
        console.log('[LazyShorts] Skip-on-dislike disabled in settings');
        return;
    }

    // Check if we already skipped for this Short
    if (skipAlreadyTriggered) {
        console.log('[LazyShorts] Skip already triggered for this Short');
        return;
    }

    // Check aria-pressed to determine if this is a dislike or un-dislike action
    // IMPORTANT: YouTube updates aria-pressed BEFORE our click handler runs
    // So after clicking to dislike: aria-pressed becomes "true"
    // After clicking to un-dislike: aria-pressed becomes "false"
    const button = event.target.closest('button');
    const isNowDisliked = button?.getAttribute('aria-pressed') === 'true';

    console.log('[LazyShorts] Button aria-pressed state:', isNowDisliked);

    // Skip only when user has just DISLIKED (aria-pressed is now true)
    // Don't skip when user is UN-disliking (aria-pressed is now false)
    if (!isNowDisliked) {
        console.log('[LazyShorts] User is un-disliking (removing dislike), not skipping');
        return;
    }

    // Trigger skip after brief delay for dislike animation
    console.log('[LazyShorts] Triggering skip due to dislike');

    setTimeout(() => {
        skipToNextShort('dislike');
    }, 300);
}


/**
 * Handle like button click (verification - should NEVER skip)
 * @param {Event} event
 */
function handleLikeClick(event) {
    console.log('[LazyShorts] Like button clicked - NO SKIP (working as intended)');
    // This function intentionally does NOT call skipToNextShort
    // If skip behavior occurs after like, there's a bug in button identification
}

/**
 * Initialize skip on dislike feature
 * Wait for buttons to appear (YouTube loads them dynamically)
 */
function initializeSkipOnDislike() {
    const maxAttempts = 50;
    let attempts = 0;

    const interval = setInterval(() => {
        attempts++;

        const { likeButton, dislikeButton } = findLikeDislikeButtons();

        if (likeButton && dislikeButton) {
            clearInterval(interval);
            attachDislikeListener();
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('[LazyShorts] Like/dislike buttons not found after', maxAttempts, 'attempts');
        }
    }, 100);
}

/**
 * Reset skip flag and re-initialize for new Short
 */
function resetForNewShort() {
    skipAlreadyTriggered = false;
    dislikeListenerAttached = false;
    console.log('[LazyShorts] Reset for new Short');
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
 * Disable video loop attribute
 */
function disableVideoLoop() {
    if (!videoElement) return;

    try {
        if (videoElement.hasAttribute('loop')) {
            videoElement.removeAttribute('loop');
        }
        if (videoElement.loop === true) {
            videoElement.loop = false;
        }
    } catch (e) {
        console.warn('[LazyShorts] Could not disable loop:', e);
    }
}

/**
 * Setup continuous loop prevention
 * Uses both timeupdate event and MutationObserver to ensure loop stays disabled
 */
function setupContinuousLoopPrevention() {
    if (!videoElement) return;

    // Remove existing listeners if any
    removeContinuousLoopPrevention();

    // Method 1: Check on every timeupdate (covers seeking/fast-forward)
    loopPreventionListener = () => {
        if (videoElement && videoElement.loop === true) {
            console.log('[LazyShorts] Loop was re-enabled, disabling again');
            videoElement.loop = false;
            videoElement.removeAttribute('loop');
        }
    };
    videoElement.addEventListener('timeupdate', loopPreventionListener);

    // Also check on seeking events
    videoElement.addEventListener('seeking', loopPreventionListener);
    videoElement.addEventListener('seeked', loopPreventionListener);

    // Method 2: MutationObserver to catch attribute changes
    try {
        videoAttributeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'loop') {
                    console.log('[LazyShorts] Loop attribute changed, removing it');
                    videoElement.removeAttribute('loop');
                    videoElement.loop = false;
                }
            }
        });

        videoAttributeObserver.observe(videoElement, {
            attributes: true,
            attributeFilter: ['loop']
        });

        console.log('[LazyShorts] Continuous loop prevention enabled (timeupdate + MutationObserver)');
    } catch (e) {
        console.warn('[LazyShorts] MutationObserver for loop failed:', e);
    }
}

/**
 * Remove continuous loop prevention listeners
 */
function removeContinuousLoopPrevention() {
    if (videoElement && loopPreventionListener) {
        videoElement.removeEventListener('timeupdate', loopPreventionListener);
        videoElement.removeEventListener('seeking', loopPreventionListener);
        videoElement.removeEventListener('seeked', loopPreventionListener);
    }
    if (videoAttributeObserver) {
        videoAttributeObserver.disconnect();
        videoAttributeObserver = null;
    }
    loopPreventionListener = null;
}

/**
 * Remove video event listener
 */
function removeVideoListener() {
    // Remove loop prevention
    removeContinuousLoopPrevention();

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
                    console.log('[LazyShorts] Navigated to new Short, re-initializing...');
                    resetForNewShort();
                    setupAutoSkip();
                    initializeSkipOnDislike();
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

