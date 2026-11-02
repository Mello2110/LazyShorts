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

// Strict, verified YouTube selectors (NEVER match subscribe/unfollow/action buttons)
const YOUTUBE_SELECTORS = {
    nextButton: [
        '#navigation-button-down button',
        'ytd-shorts #navigation-button-down yt-button-shape button',
        'ytd-shorts #navigation-button-down button'
    ],
    videoPlayer: [
        'video.html5-main-video',
        'ytd-shorts video',
        '.shorts-video-container video',
        'video.video-stream',
        'video'
    ]
};

// Strict, verified TikTok selectors (NEVER match profile/follow buttons)
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
        'button[data-e2e="video-not-interested"]',
        'button[aria-label*="Not interested" i]',
        'button[aria-label*="Nicht interessiert" i]',
        'button[aria-label*="Kein Interesse" i]',
        'button[data-e2e="video-dislike"]'
    ],
    nextButtonFallback: [
        'button[data-e2e="arrow-down"]'
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
let videoTimeUpdateListener = null;
let videoAttributeObserver = null;
let isInitialized = false;
let skipAlreadyTriggered = false;
let skipCancelledByUser = false;
let currentPlatform = PLATFORM.UNKNOWN;
let youTubeEventDelegationAttached = false;
let tikTokEventDelegationAttached = false;
let urlCheckInterval = null;
let countdownOverlay = null;
let countdownTimeout = null;

// ============================================
// SETTINGS & STATUS HELPERS
// ============================================

/**
 * Check if LazyShorts is active on the current platform
 * @returns {boolean}
 */
function isPlatformEnabled() {
    if (!settings.enabled) return false;
    if (currentPlatform === PLATFORM.YOUTUBE && settings.enableYouTube === false) return false;
    if (currentPlatform === PLATFORM.TIKTOK && settings.enableTikTok === false) return false;
    return true;
}

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

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the extension
 */
async function init() {
    currentPlatform = detectPlatform();
    log.info(`Initializing on ${getPlatformName()}:`, window.location.href);

    if (currentPlatform === PLATFORM.UNKNOWN) {
        log.info('Not on a supported platform, exiting');
        return;
    }

    if (!isTargetPage()) {
        log.info('Not on a target page, exiting');
        return;
    }

    // Load settings
    await loadSettings();

    // Setup auto-skip if enabled
    await setupAutoSkip();

    // Setup skip on dislike / not interested
    initializeSkipOnDislike();

    // Listen for settings changes
    chrome.storage.onChanged.addListener(handleSettingsChange);

    // Listen for SPA navigation changes
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
            enableYouTube: true,
            enableTikTok: true,
            delaySeconds: 0,
            darkMode: 'auto',
            skipOnDislike: true
        };
        settings = await chrome.storage.sync.get(defaults);
        log.debug(`[${getPlatformName()}] Settings loaded:`, settings);
    } catch (error) {
        log.error('Failed to load settings:', error);
        settings = { enabled: true, enableYouTube: true, enableTikTok: true, delaySeconds: 0, darkMode: 'auto', skipOnDislike: true };
    }
}

// ============================================
// CORE AUTO-SKIP SYSTEM
// ============================================

/**
 * Setup auto-skip functionality based on current settings
 */
async function setupAutoSkip() {
    removeVideoListener();

    if (!isPlatformEnabled()) {
        log.info(`[${getPlatformName()}] Auto-skip disabled by master or platform toggle`);
        return;
    }

    const selectors = getSelectors();

    waitForVideoElement(selectors.videoPlayer, (video) => {
        videoElement = video;

        // Prevent YouTube/TikTok auto-loop
        disableVideoLoop();
        setupContinuousLoopPrevention();

        log.debug(`[${getPlatformName()}] Video player found, attaching listeners`);

        // Primary: HTML5 ended event
        videoEndedListener = handleVideoEnd;
        videoElement.addEventListener('ended', videoEndedListener);

        // Secondary fallback: timeupdate detection right before loop resets
        videoTimeUpdateListener = handleVideoTimeUpdate;
        videoElement.addEventListener('timeupdate', videoTimeUpdateListener);

        log.info(`[${getPlatformName()}] Auto-skip enabled with dual ended/timeupdate detection`);
    });
}

/**
 * Wait for video element with retry logic
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
        log.error(`[${getPlatformName()}] Video element not found after ${maxAttempts} attempts`);
    }
}

/**
 * Handle video timeupdate as a fallback when ended event is suppressed by YouTube's custom player
 */
function handleVideoTimeUpdate() {
    if (!videoElement || skipAlreadyTriggered || skipCancelledByUser) return;
    if (!isPlatformEnabled()) return;

    if (videoElement.duration && videoElement.duration > 0) {
        // Trigger if within 250ms of the video end and playback is progressing
        if (videoElement.currentTime >= videoElement.duration - 0.25 && !videoElement.paused) {
            log.info(`[${getPlatformName()}] Video end reached via timeupdate check (${videoElement.currentTime.toFixed(2)}s / ${videoElement.duration.toFixed(2)}s)`);
            handleVideoEnd();
        }
    }
}

/**
 * Handle video ended event
 */
function handleVideoEnd() {
    if (skipAlreadyTriggered || skipCancelledByUser) {
        log.debug(`[${getPlatformName()}] Skip already handled or cancelled, ignoring event`);
        return;
    }

    // Immediately mark skip as triggered so multiple timeupdate ticks during delay cannot re-fire
    skipAlreadyTriggered = true;

    log.info(`[${getPlatformName()}] Video ending, preparing to advance...`);

    const delay = (settings.delaySeconds || 0) * 1000;

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
// INTERACTIVE COUNTDOWN OVERLAY
// ============================================

/**
 * Show modern, interactive countdown overlay with cancel button
 * @param {number} seconds - Number of seconds to count down
 */
function showCountdownOverlay(seconds) {
    hideCountdownOverlay();

    countdownOverlay = document.createElement('div');
    countdownOverlay.id = 'lazyshorts-countdown';
    countdownOverlay.setAttribute('role', 'alert');
    countdownOverlay.setAttribute('aria-label', `Skipping in ${seconds} seconds. Click to cancel.`);

    countdownOverlay.style.cssText = `
        position: fixed;
        bottom: 84px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(18, 18, 18, 0.90);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        color: #ffffff;
        padding: 8px 16px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease, border-color 0.2s ease;
        animation: lazyshorts-fadeIn 0.2s ease-out;
    `;

    // Ensure CSS styles exist
    if (!document.getElementById('lazyshorts-styles')) {
        const style = document.createElement('style');
        style.id = 'lazyshorts-styles';
        style.textContent = `
            @keyframes lazyshorts-fadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.96); }
                to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            }
            #lazyshorts-countdown:hover {
                background: rgba(28, 28, 28, 0.96);
                border-color: rgba(255, 255, 255, 0.35);
                transform: translateX(-50%) scale(1.02);
            }
            .lazyshorts-cancel-btn {
                background: rgba(255, 255, 255, 0.12);
                border: none;
                color: #ffffff;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s ease;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .lazyshorts-cancel-btn:hover {
                background: rgba(220, 38, 38, 0.85);
            }
        `;
        document.head.appendChild(style);
    }

    let remaining = seconds;
    updateCountdownContent(remaining);

    // Cancel skip on click anywhere on overlay
    countdownOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelSkipCountdown();
    });

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

    countdownOverlay._interval = countdownInterval;
}

/**
 * Update countdown overlay text and icon
 */
function updateCountdownContent(seconds) {
    if (!countdownOverlay) return;

    countdownOverlay.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Next Short in <strong>${seconds}s</strong></span>
        <button type="button" class="lazyshorts-cancel-btn" title="Cancel skip">
            Cancel ✕
        </button>
    `;
}

/**
 * Cancel the active countdown and prevent automatic skip for this video
 */
function cancelSkipCountdown() {
    log.info(`[${getPlatformName()}] Auto-skip cancelled by user`);
    skipCancelledByUser = true;
    skipAlreadyTriggered = true;

    if (countdownTimeout) {
        clearTimeout(countdownTimeout);
        countdownTimeout = null;
    }

    if (countdownOverlay) {
        if (countdownOverlay._interval) {
            clearInterval(countdownOverlay._interval);
        }
        countdownOverlay.innerHTML = `
            <span style="color: #34c759; font-weight: 600;">✓ Auto-skip paused</span>
        `;
        setTimeout(() => {
            hideCountdownOverlay();
        }, 1200);
    }
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
// NAVIGATION (PLATFORM SPECIFIC & BULLETPROOF)
// ============================================

/**
 * Skip to next video router
 * @param {string} source - Trigger source ('video-end' | 'dislike' | 'manual-popup')
 */
function skipToNextVideo(source = 'video-end') {
    log.info(`[${getPlatformName()}] Skipping video (source: ${source})`);

    skipAlreadyTriggered = true;
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
 * Uses verified navigation-button-down button, next reel scrollIntoView, or ArrowDown.
 * Never touches subscribe/unfollow/profile buttons!
 */
function skipYouTubeShort() {
    if (videoElement) {
        videoElement.loop = false;
    }

    // Blur active element to prevent keyboard/click events hitting focused buttons
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }

    // 1. First choice: Dedicated YouTube desktop down navigation button
    const nextButton = findElement(YOUTUBE_SELECTORS.nextButton);
    if (nextButton) {
        try {
            nextButton.click();
            log.info('[YouTube] Clicked verified #navigation-button-down button');
            incrementSkipCount();
            return;
        } catch (error) {
            log.warn('[YouTube] Button click failed, falling back:', error);
        }
    }

    // 2. Second choice: Smooth scroll active reel's next sibling into view
    const currentReel = document.querySelector('ytd-reel-video-renderer[is-active]');
    if (currentReel) {
        const nextReel = currentReel.nextElementSibling;
        if (nextReel && nextReel.tagName.toLowerCase() === 'ytd-reel-video-renderer') {
            try {
                nextReel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                log.info('[YouTube] Scrolled to next reel container via scrollIntoView');
                incrementSkipCount();
                return;
            } catch (error) {
                log.warn('[YouTube] scrollIntoView failed:', error);
            }
        }
    }

    // 3. Third choice: Dispatch native ArrowDown keyboard event
    tryKeyboardNavigation();
}

/**
 * Skip to next TikTok video
 * Uses verified data-e2e="arrow-down" button or ArrowDown keydown event.
 * Never touches profile or follow dropdowns!
 */
function skipTikTokVideo() {
    log.info('[TikTok] Attempting to skip to next video');

    if (videoElement) {
        videoElement.loop = false;
    }

    // Blur active element
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }

    // 1. Try verified TikTok desktop arrow-down button
    const nextButton = findElement(TIKTOK_SELECTORS.nextButtonFallback);
    if (nextButton) {
        try {
            nextButton.click();
            log.info('[TikTok] Clicked verified data-e2e="arrow-down" button');
            incrementSkipCount();
            return;
        } catch (error) {
            log.warn('[TikTok] Button click failed, trying keyboard:', error);
        }
    }

    // 2. Primary: TikTok feed keyboard navigation (ArrowDown)
    tryKeyboardNavigation();
}

/**
 * Dispatch ArrowDown keydown event as reliable fallback
 */
function tryKeyboardNavigation() {
    try {
        if (videoElement) {
            videoElement.loop = false;
        }

        // Blur active element so key is not intercepted by a focused button
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        const keyEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
            view: window
        });

        document.body.dispatchEvent(keyEvent);
        document.dispatchEvent(keyEvent);
        window.dispatchEvent(keyEvent);

        log.info(`[${getPlatformName()}] ArrowDown dispatched`);
        incrementSkipCount();
    } catch (error) {
        log.error(`[${getPlatformName()}] Keyboard navigation failed:`, error);
    }
}

// ============================================
// DISLIKE & "NOT INTERESTED" DETECTION
// ============================================

/**
 * Initialize skip on dislike / not interested
 * Uses safe event delegation for both YouTube and TikTok
 */
function initializeSkipOnDislike() {
    const platform = detectPlatform();

    switch (platform) {
        case PLATFORM.YOUTUBE:
            initializeYouTubeNegativeFeedback();
            break;
        case PLATFORM.TIKTOK:
            initializeTikTokNotInterested();
            break;
    }
}

/**
 * YouTube Negative Feedback: Event Delegation
 */
function initializeYouTubeNegativeFeedback() {
    if (youTubeEventDelegationAttached) return;

    document.addEventListener('click', handleYouTubeClick, true);
    youTubeEventDelegationAttached = true;
    log.info('[YouTube] Event delegation for Dislike & "Not Interested" attached');
}

/**
 * Handle clicks on YouTube Shorts page
 */
async function handleYouTubeClick(event) {
    const skipOnDislike = await getSkipOnDislikeSetting();
    if (!skipOnDislike) return;
    if (skipAlreadyTriggered) return;

    // 1. Direct Dislike Button (Legacy / Third-party extensions like Return YouTube Dislike)
    const dislikeButton = event.target.closest(
        'dislike-button-view-model button, #dislike-button button, button[aria-label*="Dislike" i], button[aria-label*="Mag ich nicht" i], button[aria-label*="No me gusta" i]'
    );
    if (dislikeButton) {
        const label = dislikeButton.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('like') && !label.includes('dislike')) return;

        const ariaPressed = dislikeButton.getAttribute('aria-pressed');
        if (ariaPressed === 'false') {
            log.debug('[YouTube] User is un-disliking, not skipping');
            return;
        }

        log.info('[YouTube] Dislike button clicked');
        triggerNegativeFeedbackSkip('dislike-button');
        return;
    }

    // 2. Menu Item: Only inside an open YouTube popup menu
    const menuPopup = event.target.closest('ytd-menu-popup-renderer, tp-yt-iron-dropdown');
    if (menuPopup) {
        const menuItem = event.target.closest(
            'ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-navigation-item-renderer, [role="menuitem"]'
        );
        if (menuItem) {
            const text = (menuItem.textContent || '').toLowerCase().trim();
            const matchesNegative =
                text.includes('not interested') ||
                text.includes('kein interesse') ||
                text.includes("don't recommend channel") ||
                text.includes('keine videos von diesem kanal') ||
                text.includes('no me interesa') ||
                text.includes('pas intéressé');

            if (matchesNegative) {
                log.info('[YouTube] "Not interested" / negative feedback option clicked in menu:', text);
                triggerNegativeFeedbackSkip('menu-not-interested');
                return;
            }
        }
    }
}

/**
 * TikTok "Not Interested" Event Delegation
 */
function initializeTikTokNotInterested() {
    if (tikTokEventDelegationAttached) return;

    document.addEventListener('click', handleTikTokClick, true);
    tikTokEventDelegationAttached = true;
    log.info('[TikTok] Event delegation for Not Interested attached');
}

/**
 * Handle clicks on TikTok page
 */
async function handleTikTokClick(event) {
    const skipOnDislike = await getSkipOnDislikeSetting();
    if (!skipOnDislike) return;
    if (skipAlreadyTriggered) return;

    const selectors = TIKTOK_SELECTORS.dislikeButton.join(',');
    try {
        const target = event.target.closest(selectors);
        if (target) {
            log.info('[TikTok] Not Interested/Dislike clicked');
            triggerNegativeFeedbackSkip('tiktok-not-interested');
        }
    } catch (e) {
        // Ignore selector errors
    }
}

/**
 * Trigger skip after negative feedback with slight delay for animation
 */
function triggerNegativeFeedbackSkip(sourceTag) {
    if (skipAlreadyTriggered) return;
    log.info(`[${getPlatformName()}] Triggering skip due to negative feedback (${sourceTag})`);
    setTimeout(() => {
        skipToNextVideo('dislike');
    }, 300);
}

// ============================================
// HELPERS & LOOP PREVENTION
// ============================================

/**
 * Find element using fallback selectors
 */
function findElement(selectorArray) {
    if (!selectorArray || !Array.isArray(selectorArray)) return null;

    for (const selector of selectorArray) {
        try {
            const element = document.querySelector(selector);
            if (element) return element;
        } catch (error) {
            // Ignore syntax errors in legacy selectors
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
        log.warn(`[${getPlatformName()}] Could not disable loop:`, e);
    }
}

/**
 * Continuous loop prevention via MutationObserver
 */
function setupContinuousLoopPrevention() {
    if (!videoElement) return;

    removeContinuousLoopPrevention();

    try {
        videoAttributeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'loop') {
                    videoElement.removeAttribute('loop');
                    videoElement.loop = false;
                }
            }
        });

        videoAttributeObserver.observe(videoElement, {
            attributes: true,
            attributeFilter: ['loop']
        });
    } catch (e) {
        log.warn(`[${getPlatformName()}] MutationObserver for loop failed:`, e);
    }
}

/**
 * Remove loop observer
 */
function removeContinuousLoopPrevention() {
    if (videoAttributeObserver) {
        videoAttributeObserver.disconnect();
        videoAttributeObserver = null;
    }
}

/**
 * Remove video event listeners
 */
function removeVideoListener() {
    removeContinuousLoopPrevention();

    if (videoElement) {
        if (videoEndedListener) {
            videoElement.removeEventListener('ended', videoEndedListener);
        }
        if (videoTimeUpdateListener) {
            videoElement.removeEventListener('timeupdate', videoTimeUpdateListener);
        }
    }
    videoElement = null;
    videoEndedListener = null;
    videoTimeUpdateListener = null;
}

/**
 * Handle settings change events
 */
function handleSettingsChange(changes, areaName) {
    if (areaName !== 'sync') return;

    for (const [key, { newValue }] of Object.entries(changes)) {
        settings[key] = newValue;
    }

    setupAutoSkip();
}

/**
 * Reset skip flags and clean up for new video
 */
function resetForNewVideo() {
    skipAlreadyTriggered = false;
    skipCancelledByUser = false;
    hideCountdownOverlay();
    log.debug(`[${getPlatformName()}] Reset for new video`);
}

/**
 * Observe URL changes (SPAs)
 */
function observeUrlChanges() {
    let lastUrl = window.location.href;

    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
    }

    urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== lastUrl) {
            log.info(`[${getPlatformName()}] URL changed:`, currentUrl);
            lastUrl = currentUrl;

            if (isTargetPage()) {
                resetForNewVideo();
                setupAutoSkip();
                initializeSkipOnDislike();
            } else {
                removeVideoListener();
                hideCountdownOverlay();
            }
        }
    }, 400);
}

/**
 * Cleanup on page leave
 */
function cleanup() {
    removeVideoListener();
    hideCountdownOverlay();
    chrome.storage.onChanged.removeListener(handleSettingsChange);

    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
        urlCheckInterval = null;
    }

    if (youTubeEventDelegationAttached) {
        document.removeEventListener('click', handleYouTubeClick, true);
        youTubeEventDelegationAttached = false;
    }

    if (tikTokEventDelegationAttached) {
        document.removeEventListener('click', handleTikTokClick, true);
        tikTokEventDelegationAttached = false;
    }

    log.info(`[${getPlatformName()}] Cleaned up`);
}

// ============================================
// RUNTIME MESSAGE HANDLER (Popup / Service Worker)
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LAZY_SHORTS_PING') {
        sendResponse({ active: true });
        return true;
    }

    if (message.type === 'GET_STATUS') {
        sendResponse({
            active: isPlatformEnabled(),
            platform: currentPlatform,
            isTargetPage: isTargetPage(),
            videoFound: !!videoElement,
            skipAlreadyTriggered: skipAlreadyTriggered,
            skipCancelledByUser: skipCancelledByUser
        });
        return true;
    }

    if (message.type === 'SKIP_NOW') {
        log.info(`[${getPlatformName()}] Manual skip requested via popup`);
        skipToNextVideo('manual-popup');
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'CANCEL_SKIP') {
        cancelSkipCountdown();
        sendResponse({ success: true });
        return true;
    }
});

// ============================================
// BOOTSTRAP
// ============================================

init();

window.addEventListener('beforeunload', () => {
    cleanup();
    window.__lazyShorts_initialized = false;
});

} // End of duplicate injection guard
