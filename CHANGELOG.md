# Changelog

All notable changes to LazyShorts will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-03-08

### Added
- 🎯 **SPA Navigation Fix**: Extension now works immediately when navigating from YouTube homepage to Shorts — no refresh needed
- ⏳ **Skip Countdown Overlay**: Visual "Skipping in 3…2…1…" overlay on the video when delay is configured
- 🎚️ **Delay Slider in Popup**: Quick access to delay setting (0-5s) directly in the popup
- 🔔 **Toast Notifications**: Visual feedback in popup when toggling settings
- 📝 **Debug Log System**: Configurable log levels (OFF/ERROR/WARN/INFO/DEBUG) for cleaner production logs

### Fixed
- 🐛 **Light Mode**: Popup and settings page now properly support light theme (was hardcoded dark)
- 🐛 **Memory Leak**: Event listeners on like/dislike buttons are now properly cleaned up during SPA navigation
- 🐛 **Performance**: Replaced heavy MutationObserver (subtree on body) with lightweight setInterval for URL change detection
- 🐛 **Loop Prevention**: Simplified from 3 event listeners (timeupdate/seeking/seeked) to MutationObserver only
- 🐛 **Version Display**: Settings page now dynamically loads version from manifest (was hardcoded "1.2.1")
- 🐛 **Inconsistent Defaults**: Service worker now includes all settings fields (skipOnDislike, skipCount)

### Changed
- Settings subtitle now mentions TikTok support
- Removed unused `utils/settings.js` module (dead code)
- Added `scripting` and `webNavigation` permissions for programmatic content script injection
- Service worker now detects SPA navigations via `webNavigation.onHistoryStateUpdated`
- Content script includes duplicate injection guard (`window.__lazyShorts_initialized`)

## [1.3.0] - 2026-01-17

### Added
- 🎵 **TikTok Support**: Extension now works on TikTok in addition to YouTube Shorts
- Platform detection system for seamless multi-platform experience
- TikTok "Not Interested" button detection (skip-on-dislike equivalent)
- Multiple fallback selectors for TikTok's dynamic DOM structure

### Changed
- Refactored content script with modular platform-specific code
- Unified skip counter works across both YouTube and TikTok
- All settings apply to both platforms

### Technical Details
- Added `PLATFORM` constant and `detectPlatform()` function
- Separated selectors into `YOUTUBE_SELECTORS` and `TIKTOK_SELECTORS` objects
- Implemented `skipYouTubeShort()` and `skipTikTokVideo()` platform-specific functions
- TikTok uses ArrowDown keyboard navigation as primary skip method
- Event delegation for TikTok button detection (handles dynamic content)
- Enhanced logging with platform prefix: `[LazyShorts] [Platform]`

## [1.2.0] - 2026-01-11

### Added
- 👎 **Skip on Dislike**: Automatically skip to next Short when you click the dislike button
- New setting toggle in popup and settings page (enabled by default)
- Only triggers on initial dislike action, not when removing a dislike (un-disliking)
- Works independently of the main auto-skip feature

### Technical Details
- Added `skipOnDislike` to storage schema (default: true)
- Implemented like/dislike button detection with multiple fallback selectors
- Added `skipAlreadyTriggered` flag to prevent double-skipping (dislike + video end)
- Added `skipToNextShort(source)` function for unified skip handling with source tracking
- Buttons are re-detected on SPA navigation for new Shorts

## [1.1.0] - 2026-01-09

### Added
- 📊 **Skip Counter**: Track total Shorts automatically skipped
- Counter display in extension popup (compact view)
- Counter display in settings page with detailed statistics
- Reset counter functionality with confirmation dialog
- Locale-aware number formatting (e.g., "1,234" in US locale)
- Cross-device sync for counter via `chrome.storage.sync`

### Technical Details
- Added `skipCount` to storage schema (default: 0)
- Implemented counter increment in content script after auto-skip
- Added counter display and formatting logic to popup and settings

## [1.0.1] - 2026-01-09

### Fixed
- **CRITICAL**: Fixed auto-skip not working on subsequent Shorts after first skip
- **CRITICAL**: Added missing URL patterns for non-www and mobile YouTube URLs (`youtube.com/shorts/*`, `m.youtube.com/shorts/*`)
- **CRITICAL**: Implemented missing `tryKeyboardNavigation()` fallback function
- Fixed SPA navigation timing issues with 500ms debounce on URL observer
- Disabled video loop attribute to prevent auto-replay

### Changed
- Updated extension icon to new logo design
- Improved video element detection with better retry logic (50 attempts over 5 seconds)
- Enhanced event listener management with proper cleanup before re-attachment
- Added extensive console logging for better debugging

### Technical Details
- Content script now properly handles YouTube's Single Page Application navigation
- Event listeners are cleared before re-initialization to prevent double-firing
- Button selector now includes German aria-labels ("Nächste")
- Keyboard navigation (Arrow Down) automatically triggers if button click fails

## [1.0.0] - 2026-01-09

### Added
- ✨ **Auto-skip functionality**: Automatically advance to next YouTube Short when current one finishes
- ⚙️ **Settings page**: Full configuration interface with delay controls and theme selector
- 🎨 **Popup interface**: Quick toggle for enabling/disabling auto-skip
- ⏱️ **Configurable delay**: Set delay between 0-5 seconds before skipping
- 🌓 **Dark mode support**: Light, dark, and auto (system preference) themes
- 🔒 **Privacy-first design**: No data collection, fully offline operation
- ♿ **Accessibility features**: Full keyboard navigation, screen reader support, WCAG 2.1 AA compliance
- 📱 **Responsive design**: Works on all screen sizes
- 🛡️ **Manifest V3**: Built with latest Chrome extension standard
- 🔄 **Real-time sync**: Settings sync across devices (if signed into Chrome)
- 🎯 **Fallback selectors**: Robust YouTube DOM detection with multiple fallback strategies
- 🧩 **Modular architecture**: Clean separation of concerns for maintainability

### Technical Details
- Content script injection only on YouTube Shorts pages (`/shorts/*`)
- Service worker for background event handling
- CSS custom properties for consistent theming
- BEM naming convention for maintainable styles
- Chrome storage sync API for cross-device settings

---

**Full Changelog**: https://github.com/mellowsolutions/LazyShorts/releases
