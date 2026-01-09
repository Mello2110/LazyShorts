/**
 * DIAGNOSTIC VERSION - LazyShorts Content Script
 * This version includes extensive logging to diagnose issues
 * 
 * USAGE:
 * 1. Load this file temporarily in manifest.json
 * 2. Open YouTube Shorts with DevTools Console open
 * 3. Watch the logs as video plays
 * 4. Send ALL console output to developer
 */

console.log('[LazyShorts DEBUG] ========================================');
console.log('[LazyShorts DEBUG] Diagnostic version loaded');
console.log('[LazyShorts DEBUG] Current URL:', window.location.href);
console.log('[LazyShorts DEBUG] Current time:', new Date().toISOString());
console.log('[LazyShorts DEBUG] ========================================');

// Test 1: Can we find ANY video element?
setTimeout(() => {
    console.log('[LazyShorts DEBUG] === VIDEO ELEMENT SEARCH ===');

    const allVideos = document.querySelectorAll('video');
    console.log('[LazyShorts DEBUG] Total video elements found:', allVideos.length);

    allVideos.forEach((video, index) => {
        console.log(`[LazyShorts DEBUG] Video ${index}:`, {
            className: video.className,
            id: video.id,
            src: video.src,
            currentSrc: video.currentSrc,
            readyState: video.readyState,
            duration: video.duration,
            loop: video.loop,
            paused: video.paused
        });
    });

    // Test 2: Can we find the Next button?
    console.log('[LazyShorts DEBUG] === BUTTON SEARCH ===');

    const allButtons = document.querySelectorAll('button');
    console.log('[LazyShorts DEBUG] Total buttons found:', allButtons.length);

    const navigationButtons = Array.from(allButtons).filter(btn => {
        const label = btn.getAttribute('aria-label') || '';
        return label.toLowerCase().includes('next') ||
            label.toLowerCase().includes('nächste') ||
            label.includes('下一个');
    });

    console.log('[LazyShorts DEBUG] Navigation buttons:', navigationButtons.length);
    navigationButtons.forEach((btn, index) => {
        console.log(`[LazyShorts DEBUG] Nav button ${index}:`, {
            ariaLabel: btn.getAttribute('aria-label'),
            className: btn.className,
            id: btn.id,
            visible: btn.offsetParent !== null
        });
    });

    // Test 3: Try to attach event listener
    console.log('[LazyShorts DEBUG] === EVENT LISTENER TEST ===');

    const video = document.querySelector('video.html5-main-video') ||
        document.querySelector('ytd-shorts video') ||
        document.querySelector('video');

    if (video) {
        console.log('[LazyShorts DEBUG] Video found for event test');

        video.addEventListener('ended', () => {
            console.log('[LazyShorts DEBUG] !!!!! VIDEO ENDED EVENT FIRED !!!!!');
            console.log('[LazyShorts DEBUG] Current time:', video.currentTime);
            console.log('[LazyShorts DEBUG] Duration:', video.duration);
        });

        video.addEventListener('pause', () => {
            console.log('[LazyShorts DEBUG] Video paused');
        });

        video.addEventListener('play', () => {
            console.log('[LazyShorts DEBUG] Video playing');
        });

        video.addEventListener('timeupdate', () => {
            const remaining = video.duration - video.currentTime;
            if (remaining < 1 && remaining > 0) {
                console.log('[LazyShorts DEBUG] Video near end:', remaining.toFixed(2), 'seconds');
            }
        });

        console.log('[LazyShorts DEBUG] Event listeners attached successfully');
    } else {
        console.error('[LazyShorts DEBUG] NO VIDEO ELEMENT FOUND!');
    }

    // Test 4: Settings check
    console.log('[LazyShorts DEBUG] === SETTINGS CHECK ===');
    chrome.storage.sync.get(['enabled', 'delaySeconds'], (settings) => {
        console.log('[LazyShorts DEBUG] Settings:', settings);
        if (!settings.enabled) {
            console.error('[LazyShorts DEBUG] WARNING: Extension is DISABLED in settings!');
        }
    });

}, 2000); // Wait 2 seconds for YouTube to load

console.log('[LazyShorts DEBUG] Diagnostic script initialized');
console.log('[LazyShorts DEBUG] Please watch a Short to completion and observe logs');
