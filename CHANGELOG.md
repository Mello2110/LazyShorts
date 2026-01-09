# Changelog

All notable changes to LazyShorts will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
