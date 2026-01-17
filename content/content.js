/**
 * LazyShorts Content Script
 * Automatically advances to the next YouTube Short or TikTok video when current one finishes
 * Supports both YouTube Shorts and TikTok
 */

// ============================================
// PLATFORM CONFIGURATION
// ============================================

const PLATFORM = {
    YOUTUBE: 'youtube',
    TIKTOK: 'tiktok',
    UNKNOWN: 'unknown'
};

// YouTube-specific selectors with fallbacks
const YOUTUBE_SELECTORS = {
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

// TikTok-specific selectors with multiple fallbacks (TikTok changes DOM frequently)
const TIKTOK_SELECTORS = {
    videoPlayer: [
        'div[data-e2e="browse-video"] video',
        'div[class*="DivVideoContainer"] video',
        'video[class*="video-player"]',
        'div[class*="VideoPlayer"] video',
        'div[class*="DivBrowserModeContainer"] video',
        'div[class*="DivVideoPlayerContainer"] video',
        'div[id*="xgwrapper"] video',
        'video'
    ],
    dislikeButton: [
        // "Not interested" functionality
        'button[data-e2e="video-not-interested"]',
        'span[data-e2e="browse-not-interested"]',
        'button[aria-label*="Not interested"]',
        'button[aria-label*="Nicht interessiert"]',
        'button[aria-label*="Kein Interesse"]',
        '[class*="ButtonNotInterested"]',
        '[class*="NotInterested"]',
        '[data-e2e="video-dislike"]',
        'span[data-e2e="undefined-icon"]' // Sometimes used for dislike
    ],
    nextButtonFallback: [
        'button[data-e2e="arrow-right"]',
        'button[data-e2e="arrow-down"]',
        '[class*="StyledArrowDown"]',
        '[class*="DivArrowRight"]'
    ]
};

// ============================================
// PLATFORM DETECTION
// ============================================

/**
 * Detect current platform
 * @returns {string} Platform identifier
 */
function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('youtube.com')) return PLATFORM.YOUTUBE;
    if (hostname.includes('tiktok.com')) return PLATFORM.TIKTOK;
    return PLATFORM.UNKNOWN;
}

/**
 * Get current platform name for logging
 * @returns {string} Platform name
 */
function getPlatformName() {
    const platform = detectPlatform();
    return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/**
 * Check if current page is a target video page
 * @returns {boolean}
 */
function isTargetPage() {
    const platform = detectPlatform();
    switch (platform) {
        case PLATFORM.YOUTUBE:
            return window.location.pathname.startsWith('/shorts/');
        case PLATFORM.TIKTOK:
            // TikTok videos can appear on various pages (For You, Following, user profiles)
            // We check for video presence in setupAutoSkip instead
            return true;
        default:
            return false;
    }
}

/**
 * Get selectors for current platform
 * @returns {Object} Platform-specific selectors
 */
function getSelectors() {
    const platform = detectPlatform();
    switch (platform) {
        case PLATFORM.YOUTUBE:
            return YOUTUBE_SELECTORS;
        case PLATFORM.TIKTOK:
            return TIKTOK_SELECTORS;
        default:
            console.warn('[LazyShorts] Unknown platform, using empty selectors');
            return {};
    }
}

// ============================================
// STATE MANAGEMENT
// ============================================

let settings = {};
let videoElement = null;
let videoEndedListener = null;
let loopPreventionListener = null;
let videoAttributeObserver = null;
let isInitialized = false;
let skipAlreadyTriggered = false;
let dislikeListenerAttached = false;
let currentPlatform = PLATFORM.UNKNOWN;
let tikTokEventDelegationAttached = false;

// ============================================
// CORE FUNCTIONALITY
// ============================================

/**
 * Increment the skip count in storage
 * @returns {Promise<number|null>} New skip count value or null on error
 */
async function incrementSkipCount() {
    try {
        const result = await chrome.storage.sync.get({ skipCount: 0 });
        const newCount = result.skipCount + 1;
        await chrome.storage.sync.set({ skipCount: newCount });
        console.log(`[LazyShorts] [${getPlatformName()}] Skip count incremented to:`, newCount);
        return newCount;
    } catch (error) {
        console.error(`[LazyShorts] [${getPlatformName()}] Failed to increment skip count:`, error);
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
    currentPlatform = detectPlatform();
    console.log(`[LazyShorts] Initializing on ${getPlatformName()}:`, window.location.href);

    // Check if we're on a supported platform
    if (currentPlatform === PLATFORM.UNKNOWN) {
        console.log('[LazyShorts] Not on a supported platform, exiting');
        return;
    }

    // Check if we're on a target page
    if (!isTargetPage()) {
        console.log('[LazyShorts] Not on a target page, exiting');
        return;
    }

    // Load settings
    await loadSettings();

    // Setup auto-skip if enabled
    await setupAutoSkip();

    // Setup skip on dislike (platform-specific)
    initializeSkipOnDislike();

    // Listen for settings changes
    chrome.storage.onChanged.addListener(handleSettingsChange);

    // Listen for navigation changes (both platforms are SPAs)
    observeUrlChanges();

    isInitialized = true;
    console.log(`[LazyShorts] [${getPlatformName()}] Initialized successfully`);
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
        console.log(`[LazyShorts] [${getPlatformName()}] Settings loaded:`, settings);
    } catch (error) {
        console.error('[LazyShorts] Failed to load settings:', error);
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
        console.log(`[LazyShorts] [${getPlatformName()}] Auto-skip disabled`);
        return;
    }

    const selectors = getSelectors();

    // Find video element with improved retry logic
    waitForVideoElement(selectors.videoPlayer, (video) => {
        videoElement = video;

        // CRITICAL: Disable loop to prevent auto-replay
        disableVideoLoop();

        // CRITICAL: Set up CONTINUOUS loop prevention
        setupContinuousLoopPrevention();

        console.log(`[LazyShorts] [${getPlatformName()}] Video player found, attaching listener`);

        // Create and attach event listener
        videoEndedListener = handleVideoEnd;
        videoElement.addEventListener('ended', videoEndedListener);

        console.log(`[LazyShorts] [${getPlatformName()}] Auto-skip enabled`);
    });
}

/**
 * Wait for video element with retry logic
 * @param {string[]} selectorArray - Selectors to try
 * @param {Function} callback - Called when video is found
 * @param {number} attempts - Current attempt number
 * @param {number} maxAttempts - Maximum attempts before giving up
 */
function waitForVideoElement(selectorArray, callback, attempts = 0, maxAttempts = 50) {
    const video = findElement(selectorArray);

    if (video && video.readyState !== undefined) {
        console.log(`[LazyShorts] [${getPlatformName()}] Video found after ${attempts + 1} attempt(s)`);
        callback(video);
    } else if (attempts < maxAttempts) {
        setTimeout(() => {
            waitForVideoElement(selectorArray, callback, attempts + 1, maxAttempts);
        }, 100);
    } else {
        console.error(`[LazyShorts] [${getPlatformName()}] Video element not found after ${maxAttempts} attempts (5 seconds)`);
        console.error('[LazyShorts] Please report this issue with your browser version');
    }
}

/**
 * Handle video ended event
 */
function handleVideoEnd() {
    console.log(`[LazyShorts] [${getPlatformName()}] Video ended, preparing to skip...`);

    // Check if skip was already triggered (e.g., by dislike)
    if (skipAlreadyTriggered) {
        console.log(`[LazyShorts] [${getPlatformName()}] Skip already triggered, ignoring video end`);
        return;
    }

    // Apply delay if configured
    const delay = settings.delaySeconds * 1000;

    if (delay > 0) {
        console.log(`[LazyShorts] [${getPlatformName()}] Waiting ${settings.delaySeconds} seconds before skipping...`);
        setTimeout(() => {
            skipToNextVideo('video-end');
        }, delay);
    } else {
        skipToNextVideo('video-end');
    }
}

// ============================================
// PLATFORM-SPECIFIC NAVIGATION
// ============================================

/**
 * Skip to next video - platform-agnostic router
 * @param {string} source - What triggered the skip ('video-end' | 'dislike')
 */
function skipToNextVideo(source = 'video-end') {
    console.log(`[LazyShorts] [${getPlatformName()}] Skipping video (source: ${source})`);

    // Mark skip as triggered to prevent double-skip
    skipAlreadyTriggered = true;

    const platform = detectPlatform();
    switch (platform) {
        case PLATFORM.YOUTUBE:
            skipYouTubeShort();
            break;
        case PLATFORM.TIKTOK:
            skipTikTokVideo();
            break;
        default:
            console.error('[LazyShorts] Unknown platform, cannot skip');
    }
}

/**
 * Skip to next YouTube Short
 */
function skipYouTubeShort() {
    // Disable video loop before navigating
    if (videoElement) {
        videoElement.loop = false;
    }

    // Try button click first
    const nextButton = findElement(YOUTUBE_SELECTORS.nextButton);

    if (nextButton) {
        try {
            nextButton.click();
            console.log('[LazyShorts] [YouTube] Clicked "Next" button');
            incrementSkipCount();

            // Verify navigation occurred
            setTimeout(() => {
                console.log('[LazyShorts] [YouTube] Current URL after click:', window.location.href);
            }, 500);

            return;
        } catch (error) {
            console.error('[LazyShorts] [YouTube] Failed to click "Next" button:', error);
        }
    }

    // Fallback: keyboard navigation
    console.warn('[LazyShorts] [YouTube] Next button not found, trying keyboard navigation');
    tryKeyboardNavigation();
}

/**
 * Skip to next TikTok video
 * Uses keyboard navigation (ArrowDown) as primary method
 */
function skipTikTokVideo() {
    console.log('[LazyShorts] [TikTok] Attempting to skip to next video');

    // Disable video loop before navigating
    if (videoElement) {
        videoElement.loop = false;
    }

    // Try navigation button first (if available)
    const nextButton = findElement(TIKTOK_SELECTORS.nextButtonFallback);
    if (nextButton) {
        try {
            nextButton.click();
            console.log('[LazyShorts] [TikTok] Clicked navigation button');
            incrementSkipCount();
            return;
        } catch (error) {
            console.warn('[LazyShorts] [TikTok] Button click failed, trying keyboard:', error);
        }
    }

    // Primary: TikTok uses keyboard navigation (ArrowDown)
    try {
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
        console.log('[LazyShorts] [TikTok] ArrowDown key event dispatched');

        incrementSkipCount();

        // Verify navigation
        setTimeout(() => {
            console.log('[LazyShorts] [TikTok] URL after keyboard event:', window.location.href);
        }, 500);
    } catch (error) {
        console.error('[LazyShorts] [TikTok] Navigation failed:', error);
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
        console.log(`[LazyShorts] [${getPlatformName()}] Arrow Down key event dispatched`);

        incrementSkipCount();

        // Verify navigation
        setTimeout(() => {
            console.log(`[LazyShorts] [${getPlatformName()}] URL after keyboard event:`, window.location.href);
        }, 500);
    } catch (error) {
        console.error(`[LazyShorts] [${getPlatformName()}] Keyboard navigation failed:`, error);
    }
}

// ============================================
// DISLIKE/NOT-INTERESTED HANDLING
// ============================================

/**
 * Initialize skip on dislike feature based on platform
 */
function initializeSkipOnDislike() {
    const platform = detectPlatform();

    switch (platform) {
        case PLATFORM.YOUTUBE:
            initializeYouTubeDislike();
            break;
        case PLATFORM.TIKTOK:
            initializeTikTokNotInterested();
            break;
    }
}

/**
 * Initialize YouTube dislike button detection
 */
function initializeYouTubeDislike() {
    const maxAttempts = 50;
    let attempts = 0;

    const interval = setInterval(() => {
        attempts++;

        const { likeButton, dislikeButton } = findYouTubeLikeDislikeButtons();

        if (likeButton && dislikeButton) {
            clearInterval(interval);
            attachYouTubeDislikeListener(likeButton, dislikeButton);
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('[LazyShorts] [YouTube] Like/dislike buttons not found after', maxAttempts, 'attempts');
        }
    }, 100);
}

/**
 * Find YouTube like and dislike buttons with validation
 * @returns {{likeButton: HTMLElement|null, dislikeButton: HTMLElement|null}}
 */
function findYouTubeLikeDislikeButtons() {
    const likeButton = findElement(YOUTUBE_SELECTORS.likeButton);
    const dislikeButton = findElement(YOUTUBE_SELECTORS.dislikeButton);

    console.log('[LazyShorts] [YouTube] Button search results:', {
        likeFound: !!likeButton,
        dislikeFound: !!dislikeButton,
        likeLabel: likeButton?.getAttribute('aria-label'),
        dislikeLabel: dislikeButton?.getAttribute('aria-label')
    });

    // Validate that we found both and they are different elements
    if (likeButton && dislikeButton && likeButton !== dislikeButton) {
        return { likeButton, dislikeButton };
    }

    // Additional validation: check aria-labels
    if (likeButton && dislikeButton) {
        const likeLabel = likeButton.getAttribute('aria-label')?.toLowerCase() || '';
        const dislikeLabel = dislikeButton.getAttribute('aria-label')?.toLowerCase() || '';

        const isLikeButton = likeLabel.includes('like') || likeLabel.includes('liken');
        const isDislikeButton = dislikeLabel.includes('dislike') || dislikeLabel.includes('mag ich nicht');

        if (isLikeButton && isDislikeButton) {
            return { likeButton, dislikeButton };
        }
    }

    return { likeButton: null, dislikeButton: null };
}

/**
 * Attach click listener to YouTube dislike button
 */
function attachYouTubeDislikeListener(likeButton, dislikeButton) {
    if (likeButton === dislikeButton) {
        console.error('[LazyShorts] [YouTube] CRITICAL: Like and dislike are same element!');
        return;
    }

    console.log('[LazyShorts] [YouTube] Like/dislike buttons found:', {
        like: likeButton.getAttribute('aria-label'),
        dislike: dislikeButton.getAttribute('aria-label')
    });

    // Remove existing listeners to prevent duplicates
    dislikeButton.removeEventListener('click', handleYouTubeDislikeClick, true);
    likeButton.removeEventListener('click', handleYouTubeLikeClick, true);

    // Attach listeners
    dislikeButton.addEventListener('click', handleYouTubeDislikeClick, { capture: true });
    likeButton.addEventListener('click', handleYouTubeLikeClick, { capture: true });

    dislikeListenerAttached = true;
    console.log('[LazyShorts] [YouTube] Dislike listener attached successfully');
}

/**
 * Handle YouTube dislike button click
 * @param {Event} event
 */
async function handleYouTubeDislikeClick(event) {
    console.log('[LazyShorts] [YouTube] Dislike button clicked');

    const skipOnDislike = await getSkipOnDislikeSetting();
    if (!skipOnDislike) {
        console.log('[LazyShorts] [YouTube] Skip-on-dislike disabled in settings');
        return;
    }

    if (skipAlreadyTriggered) {
        console.log('[LazyShorts] [YouTube] Skip already triggered');
        return;
    }

    // Check aria-pressed to determine if this is a dislike or un-dislike action
    const button = event.target.closest('button');
    const isNowDisliked = button?.getAttribute('aria-pressed') === 'true';

    console.log('[LazyShorts] [YouTube] Button aria-pressed state:', isNowDisliked);

    if (!isNowDisliked) {
        console.log('[LazyShorts] [YouTube] User is un-disliking, not skipping');
        return;
    }

    console.log('[LazyShorts] [YouTube] Triggering skip due to dislike');
    setTimeout(() => {
        skipToNextVideo('dislike');
    }, 300);
}

/**
 * Handle YouTube like button click (verification - should NEVER skip)
 */
function handleYouTubeLikeClick(event) {
    console.log('[LazyShorts] [YouTube] Like button clicked - NO SKIP (intended)');
}

/**
 * Initialize TikTok "Not Interested" button detection
 * Uses event delegation since buttons are dynamically loaded
 */
function initializeTikTokNotInterested() {
    if (tikTokEventDelegationAttached) {
        console.log('[LazyShorts] [TikTok] Event delegation already attached');
        return;
    }

    // Use event delegation for dynamically loaded buttons
    document.addEventListener('click', handleTikTokClick, { capture: true });
    tikTokEventDelegationAttached = true;

    console.log('[LazyShorts] [TikTok] Event delegation for Not Interested attached');
}

/**
 * Handle clicks on TikTok page
 * @param {Event} event
 */
async function handleTikTokClick(event) {
    // Build a combined selector from all dislike/not-interested selectors
    const selectors = TIKTOK_SELECTORS.dislikeButton.join(',');

    try {
        const target = event.target.closest(selectors);
        if (target) {
            console.log('[LazyShorts] [TikTok] Not Interested/Dislike clicked');
            await handleTikTokNotInterested();
        }
    } catch (error) {
        // Ignore selector errors (some selectors may be invalid)
    }
}

/**
 * Handle TikTok "Not Interested" action
 */
async function handleTikTokNotInterested() {
    const skipOnDislike = await getSkipOnDislikeSetting();

    if (!skipOnDislike) {
        console.log('[LazyShorts] [TikTok] Skip-on-dislike disabled in settings');
        return;
    }

    if (skipAlreadyTriggered) {
        console.log('[LazyShorts] [TikTok] Skip already triggered');
        return;
    }

    console.log('[LazyShorts] [TikTok] Triggering skip due to Not Interested');

    // TikTok typically auto-advances, but we ensure it and increment counter
    setTimeout(() => {
        skipToNextVideo('dislike');
    }, 300);
}

// ============================================
// HELPERS & UTILITIES
// ============================================

/**
 * Find element using fallback selectors
 * @param {string[]} selectorArray - Array of selectors to try
 * @returns {HTMLElement|null}
 */
function findElement(selectorArray) {
    if (!selectorArray || !Array.isArray(selectorArray)) {
        return null;
    }

    for (const selector of selectorArray) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`[LazyShorts] [${getPlatformName()}] Element found with selector: ${selector}`);
                return element;
            }
        } catch (error) {
            // Silently ignore invalid selectors
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
            console.log(`[LazyShorts] [${getPlatformName()}] Removed loop attribute`);
        }
        if (videoElement.loop === true) {
            videoElement.loop = false;
            console.log(`[LazyShorts] [${getPlatformName()}] Set loop property to false`);
        }
    } catch (e) {
        console.warn(`[LazyShorts] [${getPlatformName()}] Could not disable loop:`, e);
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

    // Method 1: Check on every timeupdate
    loopPreventionListener = () => {
        if (videoElement && videoElement.loop === true) {
            console.log(`[LazyShorts] [${getPlatformName()}] Loop was re-enabled, disabling again`);
            videoElement.loop = false;
            videoElement.removeAttribute('loop');
        }
    };
    videoElement.addEventListener('timeupdate', loopPreventionListener);
    videoElement.addEventListener('seeking', loopPreventionListener);
    videoElement.addEventListener('seeked', loopPreventionListener);

    // Method 2: MutationObserver for attribute changes
    try {
        videoAttributeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'loop') {
                    console.log(`[LazyShorts] [${getPlatformName()}] Loop attribute changed, removing it`);
                    videoElement.removeAttribute('loop');
                    videoElement.loop = false;
                }
            }
        });

        videoAttributeObserver.observe(videoElement, {
            attributes: true,
            attributeFilter: ['loop']
        });

        console.log(`[LazyShorts] [${getPlatformName()}] Continuous loop prevention enabled`);
    } catch (e) {
        console.warn(`[LazyShorts] [${getPlatformName()}] MutationObserver for loop failed:`, e);
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
    removeContinuousLoopPrevention();

    if (videoElement && videoEndedListener) {
        videoElement.removeEventListener('ended', videoEndedListener);
        console.log(`[LazyShorts] [${getPlatformName()}] Video listener removed`);
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

    console.log(`[LazyShorts] [${getPlatformName()}] Settings changed:`, changes);

    for (const [key, { newValue }] of Object.entries(changes)) {
        settings[key] = newValue;
    }

    setupAutoSkip();
}

/**
 * Reset skip flag and re-initialize for new video
 */
function resetForNewVideo() {
    skipAlreadyTriggered = false;
    dislikeListenerAttached = false;
    console.log(`[LazyShorts] [${getPlatformName()}] Reset for new video`);
}

/**
 * Observe URL changes (Both YouTube and TikTok are SPAs)
 * Re-initialize when navigating between videos
 */
function observeUrlChanges() {
    let lastUrl = window.location.href;
    let urlChangeTimeout = null;

    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== lastUrl) {
            console.log(`[LazyShorts] [${getPlatformName()}] URL changed:`, currentUrl);
            lastUrl = currentUrl;

            if (urlChangeTimeout) {
                clearTimeout(urlChangeTimeout);
            }

            urlChangeTimeout = setTimeout(() => {
                if (isTargetPage()) {
                    console.log(`[LazyShorts] [${getPlatformName()}] Navigated to new video, re-initializing...`);
                    resetForNewVideo();
                    setupAutoSkip();
                    initializeSkipOnDislike();
                } else {
                    console.log(`[LazyShorts] [${getPlatformName()}] Left target page, cleaning up...`);
                    removeVideoListener();
                }
            }, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log(`[LazyShorts] [${getPlatformName()}] URL observer attached`);
}

/**
 * Cleanup function
 */
function cleanup() {
    removeVideoListener();
    chrome.storage.onChanged.removeListener(handleSettingsChange);

    if (tikTokEventDelegationAttached) {
        document.removeEventListener('click', handleTikTokClick, { capture: true });
        tikTokEventDelegationAttached = false;
    }

    console.log(`[LazyShorts] [${getPlatformName()}] Cleaned up`);
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize when script loads
init();

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);
