/**
 * LazyShorts Content Script
 * Automatically advances to the next YouTube Short or TikTok video when current one finishes
 * Supports both YouTube Shorts and TikTok
 */

// ============================================
// DUPLICATE INJECTION GUARD
// ============================================
// Prevent double-initialization when both manifest-based and
// programmatic (service worker) injection trigger on the same page.
if (window.__lazyShorts_initialized) {
    console.log('[LazyShorts] Content script already active, skipping re-initialization');
} else {
    window.__lazyShorts_initialized = true;

// ============================================
// DEBUG LOGGING SYSTEM
// ============================================

const LOG_LEVEL = {
    OFF: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
};

// Set to LOG_LEVEL.WARN for production, LOG_LEVEL.DEBUG for development
const CURRENT_LOG_LEVEL = LOG_LEVEL.WARN;

const log = {
    debug: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVEL.DEBUG && console.log('[LazyShorts]', ...args),
    info: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVEL.INFO && console.log('[LazyShorts]', ...args),
    warn: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVEL.WARN && console.warn('[LazyShorts]', ...args),
    error: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVEL.ERROR && console.error('[LazyShorts]', ...args)
};

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
            log.warn('Unknown platform, using empty selectors');
            return {};
    }
}

// ============================================
// STATE MANAGEMENT
// ============================================

let settings = {};
let videoElement = null;
let videoEndedListener = null;
let videoAttributeObserver = null;
let isInitialized = false;
let skipAlreadyTriggered = false;
let dislikeListenerAttached = false;
let currentPlatform = PLATFORM.UNKNOWN;
let tikTokEventDelegationAttached = false;
let urlCheckInterval = null;
let countdownOverlay = null;
let countdownTimeout = null;

// Store references for proper cleanup
let currentDislikeHandler = null;
let currentLikeHandler = null;
let currentDislikeButton = null;
let currentLikeButton = null;

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
        log.debug(`[${getPlatformName()}] Skip count incremented to:`, newCount);
        return newCount;
    } catch (error) {
        log.error(`[${getPlatformName()}] Failed to increment skip count:`, error);
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
        log.error('Failed to get skipOnDislike setting:', error);
        return true;
    }
}

/**
 * Initialize the extension
 */
async function init() {
    currentPlatform = detectPlatform();
    log.info(`Initializing on ${getPlatformName()}:`, window.location.href);

    // Check if we're on a supported platform
    if (currentPlatform === PLATFORM.UNKNOWN) {
        log.info('Not on a supported platform, exiting');
        return;
    }

    // Check if we're on a target page
    if (!isTargetPage()) {
        log.info('Not on a target page, exiting');
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
    log.info(`[${getPlatformName()}] Initialized successfully`);
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
        log.debug(`[${getPlatformName()}] Settings loaded:`, settings);
    } catch (error) {
        log.error('Failed to load settings:', error);
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
        log.info(`[${getPlatformName()}] Auto-skip disabled`);
        return;
    }

    const selectors = getSelectors();

    // Find video element with improved retry logic
    waitForVideoElement(selectors.videoPlayer, (video) => {
        videoElement = video;

        // CRITICAL: Disable loop to prevent auto-replay
        disableVideoLoop();

        // CRITICAL: Set up CONTINUOUS loop prevention (MutationObserver only)
        setupContinuousLoopPrevention();

        log.debug(`[${getPlatformName()}] Video player found, attaching listener`);

        // Create and attach event listener
        videoEndedListener = handleVideoEnd;
        videoElement.addEventListener('ended', videoEndedListener);

        log.info(`[${getPlatformName()}] Auto-skip enabled`);
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
        log.debug(`[${getPlatformName()}] Video found after ${attempts + 1} attempt(s)`);
        callback(video);
    } else if (attempts < maxAttempts) {
        setTimeout(() => {
            waitForVideoElement(selectorArray, callback, attempts + 1, maxAttempts);
        }, 100);
    } else {
        log.error(`[${getPlatformName()}] Video element not found after ${maxAttempts} attempts (5 seconds)`);
    }
}

/**
 * Handle video ended event
 */
function handleVideoEnd() {
    log.info(`[${getPlatformName()}] Video ended, preparing to skip...`);

    // Check if skip was already triggered (e.g., by dislike)
    if (skipAlreadyTriggered) {
        log.debug(`[${getPlatformName()}] Skip already triggered, ignoring video end`);
        return;
    }

    // Apply delay if configured
    const delay = settings.delaySeconds * 1000;

    if (delay > 0) {
        log.info(`[${getPlatformName()}] Waiting ${settings.delaySeconds} seconds before skipping...`);
        showCountdownOverlay(settings.delaySeconds);
        countdownTimeout = setTimeout(() => {
            hideCountdownOverlay();
            skipToNextVideo('video-end');
        }, delay);
    } else {
        skipToNextVideo('video-end');
    }
}

// ============================================
// COUNTDOWN OVERLAY
// ============================================

/**
 * Create and show a countdown overlay on the video
 * @param {number} seconds - Number of seconds to count down
 */
function showCountdownOverlay(seconds) {
    hideCountdownOverlay(); // Remove existing if any

    countdownOverlay = document.createElement('div');
    countdownOverlay.id = 'lazyshorts-countdown';
    countdownOverlay.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        color: #fff;
        padding: 10px 20px;
        border-radius: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 99999;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: lazyshorts-fadeIn 0.2s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Add keyframes animation
    if (!document.getElementById('lazyshorts-styles')) {
        const style = document.createElement('style');
        style.id = 'lazyshorts-styles';
        style.textContent = `
            @keyframes lazyshorts-fadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes lazyshorts-fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes lazyshorts-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }

    let remaining = seconds;
    updateCountdownContent(remaining);
    document.body.appendChild(countdownOverlay);

    const countdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            hideCountdownOverlay();
        } else {
            updateCountdownContent(remaining);
        }
    }, 1000);

    // Store interval for cleanup
    countdownOverlay._interval = countdownInterval;
}

/**
 * Update countdown overlay content
 * @param {number} seconds - Seconds remaining
 */
function updateCountdownContent(seconds) {
    if (!countdownOverlay) return;

    countdownOverlay.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: lazyshorts-pulse 1s ease-in-out infinite;">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Skipping in <strong>${seconds}</strong>s</span>
    `;
}

/**
 * Hide and remove the countdown overlay
 */
function hideCountdownOverlay() {
    if (countdownOverlay) {
        if (countdownOverlay._interval) {
            clearInterval(countdownOverlay._interval);
        }
        countdownOverlay.remove();
        countdownOverlay = null;
    }
    if (countdownTimeout) {
        clearTimeout(countdownTimeout);
        countdownTimeout = null;
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
    log.info(`[${getPlatformName()}] Skipping video (source: ${source})`);

    // Mark skip as triggered to prevent double-skip
    skipAlreadyTriggered = true;

    // Hide countdown if still showing
    hideCountdownOverlay();

    const platform = detectPlatform();
    switch (platform) {
        case PLATFORM.YOUTUBE:
            skipYouTubeShort();
            break;
        case PLATFORM.TIKTOK:
            skipTikTokVideo();
            break;
        default:
            log.error('Unknown platform, cannot skip');
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
            log.info('[YouTube] Clicked "Next" button');
            incrementSkipCount();
            return;
        } catch (error) {
            log.error('[YouTube] Failed to click "Next" button:', error);
        }
    }

    // Fallback: keyboard navigation
    log.warn('[YouTube] Next button not found, trying keyboard navigation');
    tryKeyboardNavigation();
}

/**
 * Skip to next TikTok video
 * Uses keyboard navigation (ArrowDown) as primary method
 */
function skipTikTokVideo() {
    log.info('[TikTok] Attempting to skip to next video');

    // Disable video loop before navigating
    if (videoElement) {
        videoElement.loop = false;
    }

    // Try navigation button first (if available)
    const nextButton = findElement(TIKTOK_SELECTORS.nextButtonFallback);
    if (nextButton) {
        try {
            nextButton.click();
            log.info('[TikTok] Clicked navigation button');
            incrementSkipCount();
            return;
        } catch (error) {
            log.warn('[TikTok] Button click failed, trying keyboard:', error);
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
        log.info('[TikTok] ArrowDown key event dispatched');
        incrementSkipCount();
    } catch (error) {
        log.error('[TikTok] Navigation failed:', error);
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
        log.info(`[${getPlatformName()}] Arrow Down key event dispatched`);
        incrementSkipCount();
    } catch (error) {
        log.error(`[${getPlatformName()}] Keyboard navigation failed:`, error);
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
            log.warn('[YouTube] Like/dislike buttons not found after', maxAttempts, 'attempts');
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

    log.debug('[YouTube] Button search results:', {
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
 * Properly cleans up old listeners before attaching new ones
 */
function attachYouTubeDislikeListener(likeButton, dislikeButton) {
    if (likeButton === dislikeButton) {
        log.error('[YouTube] CRITICAL: Like and dislike are same element!');
        return;
    }

    log.debug('[YouTube] Like/dislike buttons found:', {
        like: likeButton.getAttribute('aria-label'),
        dislike: dislikeButton.getAttribute('aria-label')
    });

    // Properly clean up old listeners (using stored references)
    cleanupDislikeListeners();

    // Create new handler references
    currentDislikeHandler = handleYouTubeDislikeClick;
    currentLikeHandler = handleYouTubeLikeClick;
    currentDislikeButton = dislikeButton;
    currentLikeButton = likeButton;

    // Attach listeners with consistent capture flag
    dislikeButton.addEventListener('click', currentDislikeHandler, true);
    likeButton.addEventListener('click', currentLikeHandler, true);

    dislikeListenerAttached = true;
    log.info('[YouTube] Dislike listener attached successfully');
}

/**
 * Clean up dislike/like button listeners properly
 */
function cleanupDislikeListeners() {
    if (currentDislikeButton && currentDislikeHandler) {
        currentDislikeButton.removeEventListener('click', currentDislikeHandler, true);
    }
    if (currentLikeButton && currentLikeHandler) {
        currentLikeButton.removeEventListener('click', currentLikeHandler, true);
    }
    currentDislikeHandler = null;
    currentLikeHandler = null;
    currentDislikeButton = null;
    currentLikeButton = null;
    dislikeListenerAttached = false;
}

/**
 * Handle YouTube dislike button click
 * @param {Event} event
 */
async function handleYouTubeDislikeClick(event) {
    log.info('[YouTube] Dislike button clicked');

    const skipOnDislike = await getSkipOnDislikeSetting();
    if (!skipOnDislike) {
        log.debug('[YouTube] Skip-on-dislike disabled in settings');
        return;
    }

    if (skipAlreadyTriggered) {
        log.debug('[YouTube] Skip already triggered');
        return;
    }

    // Check aria-pressed to determine if this is a dislike or un-dislike action
    const button = event.target.closest('button');
    const isNowDisliked = button?.getAttribute('aria-pressed') === 'true';

    log.debug('[YouTube] Button aria-pressed state:', isNowDisliked);

    if (!isNowDisliked) {
        log.debug('[YouTube] User is un-disliking, not skipping');
        return;
    }

    log.info('[YouTube] Triggering skip due to dislike');
    setTimeout(() => {
        skipToNextVideo('dislike');
    }, 300);
}

/**
 * Handle YouTube like button click (verification - should NEVER skip)
 */
function handleYouTubeLikeClick(event) {
    log.debug('[YouTube] Like button clicked - NO SKIP (intended)');
}

/**
 * Initialize TikTok "Not Interested" button detection
 * Uses event delegation since buttons are dynamically loaded
 */
function initializeTikTokNotInterested() {
    if (tikTokEventDelegationAttached) {
        log.debug('[TikTok] Event delegation already attached');
        return;
    }

    // Use event delegation for dynamically loaded buttons
    document.addEventListener('click', handleTikTokClick, true);
    tikTokEventDelegationAttached = true;

    log.info('[TikTok] Event delegation for Not Interested attached');
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
            log.info('[TikTok] Not Interested/Dislike clicked');
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
        log.debug('[TikTok] Skip-on-dislike disabled in settings');
        return;
    }

    if (skipAlreadyTriggered) {
        log.debug('[TikTok] Skip already triggered');
        return;
    }

    log.info('[TikTok] Triggering skip due to Not Interested');

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
                log.debug(`[${getPlatformName()}] Element found with selector: ${selector}`);
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
            log.debug(`[${getPlatformName()}] Removed loop attribute`);
        }
        if (videoElement.loop === true) {
            videoElement.loop = false;
            log.debug(`[${getPlatformName()}] Set loop property to false`);
        }
    } catch (e) {
        log.warn(`[${getPlatformName()}] Could not disable loop:`, e);
    }
}

/**
 * Setup continuous loop prevention
 * Uses MutationObserver ONLY (instead of timeupdate which fires 4-66x/sec)
 */
function setupContinuousLoopPrevention() {
    if (!videoElement) return;

    // Remove existing observer if any
    removeContinuousLoopPrevention();

    // MutationObserver for attribute changes — efficient and precise
    try {
        videoAttributeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'loop') {
                    log.debug(`[${getPlatformName()}] Loop attribute changed, removing it`);
                    videoElement.removeAttribute('loop');
                    videoElement.loop = false;
                }
            }
        });

        videoAttributeObserver.observe(videoElement, {
            attributes: true,
            attributeFilter: ['loop']
        });

        log.debug(`[${getPlatformName()}] Continuous loop prevention enabled (MutationObserver)`);
    } catch (e) {
        log.warn(`[${getPlatformName()}] MutationObserver for loop failed:`, e);
    }
}

/**
 * Remove continuous loop prevention observer
 */
function removeContinuousLoopPrevention() {
    if (videoAttributeObserver) {
        videoAttributeObserver.disconnect();
        videoAttributeObserver = null;
    }
}

/**
 * Remove video event listener
 */
function removeVideoListener() {
    removeContinuousLoopPrevention();

    if (videoElement && videoEndedListener) {
        videoElement.removeEventListener('ended', videoEndedListener);
        log.debug(`[${getPlatformName()}] Video listener removed`);
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

    log.debug(`[${getPlatformName()}] Settings changed:`, changes);

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
    hideCountdownOverlay();
    cleanupDislikeListeners();
    log.debug(`[${getPlatformName()}] Reset for new video`);
}

/**
 * Observe URL changes (Both YouTube and TikTok are SPAs)
 * Re-initialize when navigating between videos
 * Uses setInterval instead of MutationObserver for much better performance
 */
function observeUrlChanges() {
    let lastUrl = window.location.href;

    // Clean up existing interval if any
    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
    }

    urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== lastUrl) {
            log.info(`[${getPlatformName()}] URL changed:`, currentUrl);
            lastUrl = currentUrl;

            if (isTargetPage()) {
                log.info(`[${getPlatformName()}] Navigated to new video, re-initializing...`);
                resetForNewVideo();
                setupAutoSkip();
                initializeSkipOnDislike();
            } else {
                log.info(`[${getPlatformName()}] Left target page, cleaning up...`);
                removeVideoListener();
                cleanupDislikeListeners();
            }
        }
    }, 500);

    log.info(`[${getPlatformName()}] URL observer attached (interval-based)`);
}

/**
 * Cleanup function
 */
function cleanup() {
    removeVideoListener();
    cleanupDislikeListeners();
    hideCountdownOverlay();
    chrome.storage.onChanged.removeListener(handleSettingsChange);

    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
        urlCheckInterval = null;
    }

    if (tikTokEventDelegationAttached) {
        document.removeEventListener('click', handleTikTokClick, true);
        tikTokEventDelegationAttached = false;
    }

    log.info(`[${getPlatformName()}] Cleaned up`);
}

// ============================================
// MESSAGE HANDLER (for service worker ping)
// ============================================

/**
 * Respond to ping messages from the service worker
 * Used to check if the content script is already active before re-injecting
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LAZY_SHORTS_PING') {
        sendResponse({ active: true });
        return true; // async response
    }
});

// ============================================
// INITIALIZATION
// ============================================

// Initialize when script loads
init();

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    cleanup();
    window.__lazyShorts_initialized = false;
});

} // End of duplicate injection guard
