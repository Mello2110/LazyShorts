# LazyShorts

**Automatically advance to the next YouTube Short or TikTok video when the current one finishes playing.**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-MIT-green)](#)
[![Version](https://img.shields.io/badge/version-1.4.0-orange)](#)

---

## ✨ Features

- 🚀 **Automatic Skipping**: Seamlessly advance to the next YouTube Short or TikTok video after the current one ends
- 🎵 **Multi-Platform**: Works on both YouTube Shorts and TikTok
- 👎 **Skip on Dislike**: Automatically skip when you click dislike (YouTube) or "Not Interested" (TikTok)
- ⏱️ **Configurable Delay**: Set a delay (0-5 seconds) before skipping — accessible from popup or settings
- ⏳ **Skip Countdown**: Visual countdown overlay on the video when delay is active
- 📊 **Skip Counter**: Track how many Shorts have been automatically skipped
- 🔔 **Toast Notifications**: Visual feedback when changing settings in the popup
- 🎨 **Clean UI**: Minimalist design inspired by YouTube's aesthetic
- 🌓 **Dark Mode**: Supports light, dark, and auto (system preference) themes
- ⚡ **Lightweight**: Minimal performance impact (<5% CPU, <50MB memory)
- ⚙️ **Easy Toggle**: Quickly enable/disable from the extension popup
- 🔒 **Privacy First**: No data collection, 100% offline after install
- ♿ **Accessible**: Full keyboard navigation and screen reader support

---

## 📦 Installation

### From Chrome Web Store (Recommended)

> **Note**: Extension is pending Chrome Web Store approval. Link will be added once approved.

1. Visit the [Chrome Web Store](#) (link coming soon)
2. Click **"Add to Chrome"**
3. Confirm by clicking **"Add extension"**
4. Pin the extension to your toolbar for easy access

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `LazyShorts` folder
6. The extension icon should appear in your toolbar

---

## 🎯 Usage

### Quick Start

1. **Navigate to YouTube Shorts or TikTok**: Visit [youtube.com/shorts](https://www.youtube.com/shorts) or [tiktok.com](https://www.tiktok.com)
2. **Auto-skip works automatically**: When a video finishes, the extension will advance to the next one
3. **Adjust settings**: Click the extension icon to enable/disable or configure delay

### Popup Controls

- **Toggle Switch**: Enable or disable auto-skip functionality
- **Skip on Dislike Toggle**: Auto-skip when you dislike a video
- **Delay Slider**: Quickly adjust the skip delay (0-5 seconds)
- **Theme Toggle**: Switch between light and dark mode
- **Settings Button**: Open the full settings page
- **Support Button**: Buy the developer a coffee ☕

### Settings Page

Access the settings page by clicking the settings icon in the popup, or right-click the extension icon and select "Options".

**Available Settings**:

- **Enable Auto-Skip**: Turn the extension on or off
- **Skip on Dislike**: Skip to next Short when you dislike a video
- **Delay**: Set how many seconds to wait before skipping (0-5 seconds)
- **Theme**: Choose Light, Dark, or Auto (follows system preference)
- **Statistics**: View your total skip count and reset it if desired
- **Reset**: Restore all settings to defaults

---

## 🔧 How It Works

LazyShorts uses a **content script** that runs only on YouTube Shorts pages:

1. Detects when you're watching a Short (YouTube) or video (TikTok)
2. Monitors the video for the 'ended' event
3. Uses platform-specific navigation (button click or keyboard)
4. Applies your configured delay
5. Advances to the next video

The extension respects your settings in real-time—no page reload needed!

---

## 🛡️ Privacy Policy

**LazyShorts does NOT**:
- Collect any user data
- Track your browsing history
- Make network requests
- Store personal information

**What we store** (locally on your device):
- Your settings (enabled/disabled, delay, theme preference)

All data is stored using Chrome's `chrome.storage.sync` API, which may sync across your devices if you're signed into Chrome.

**Full Privacy Policy**: [https://mello2110.github.io/lazyshorts-privacy-policy/](https://mello2110.github.io/lazyshorts-privacy-policy/)

---

## ⚙️ Permissions Explained

LazyShorts requests minimal permissions:

| Permission | Why We Need It |
|------------|----------------|
| `storage` | Save your settings (enable/disable, delay, theme) |
| `scripting` | Programmatically inject content script during SPA navigation |
| `webNavigation` | Detect YouTube/TikTok SPA page transitions |
| `*://*.youtube.com/*` | Run the auto-skip script on YouTube Shorts pages |
| `*://*.tiktok.com/*` | Run the auto-skip script on TikTok pages |

We follow the **principle of least privilege**—only requesting what's absolutely necessary.

---

## 🐛 Troubleshooting

### Auto-skip isn't working

1. **Check if enabled**: Click the extension icon and verify the toggle is ON
2. **Verify you're on Shorts**: The extension only works on `youtube.com/shorts/*` URLs
3. **YouTube DOM changes**: YouTube may have updated their UI. Check for extension updates or [report an issue](#-support)
4. **Console errors**: Open DevTools (F12), check the Console tab for `[LazyShorts]` messages

### Settings aren't saving

1. **Check storage quota**: Open DevTools Console and run:
   ```javascript
   chrome.storage.sync.getBytesInUse().then(console.log)
   ```
   If near 100KB, clear old data
2. **Try resetting**: Click "Reset to Defaults" in settings

### Extension icon missing

- Right-click the toolbar area and select "Pin LazyShorts"

---

## 🤝 Support

If you encounter issues or have feature requests:

1. **Report a Bug**: Open an issue on [GitHub](https://github.com/Mello2110/LazyShorts/issues)
2. **Website**: [Mellow Solutions](https://mello2110.github.io/LandingpageMellowSolutions/)
3. **Buy Me a Coffee**: Support development ☕ [buymeacoffee.com/mellowsolutions](https://buymeacoffee.com/mellowsolutions)

---

## 🛠️ For Developers

### Project Structure

```
LazyShorts/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background event handling & SPA injection
├── content/
│   └── content.js             # Auto-skip logic (YouTube & TikTok)
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.css              # Popup styles
│   └── popup.js               # Popup interactions
├── settings/
│   ├── settings.html          # Settings page UI
│   ├── settings.css           # Settings styles
│   └── settings.js            # Settings interactions
├── styles/
│   └── design-system.css      # Shared CSS variables
├── icons/                     # Extension icons
└── docs/                      # Documentation
```

### Tech Stack

- **Manifest Version**: V3
- **JavaScript**: ES2022+ (async/await, optional chaining)
- **CSS**: Modern CSS (Grid, Flexbox, Custom Properties)
- **Storage**: chrome.storage.sync API

### Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/Mello2110/LazyShorts.git
   cd LazyShorts
   ```

2. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → Select project folder

3. Make changes and reload:
   - After editing files, click the reload icon in `chrome://extensions/`

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](#) for details.

---

## 🙏 Credits

**Developed by**: [Mellow Solutions](https://mello2110.github.io/LandingpageMellowSolutions/)

**Inspired by**: The need for a seamless YouTube Shorts browsing experience

**Special Thanks**: To all users who provide feedback and bug reports!

---

## 📊 Version History

### v1.4.0 (March 2026)
- 🎯 **SPA Navigation Fix**: Works immediately when navigating from YouTube homepage to Shorts
- ⏳ **Skip Countdown Overlay**: Visual "Skipping in 3…2…1…" when delay is active
- 🎚️ **Delay Slider in Popup**: Quick access to delay setting directly in popup
- 🔔 **Toast Notifications**: Visual feedback when changing settings
- 🐛 Fixed light mode in popup and settings page
- 🐛 Fixed memory leak in event listener cleanup
- ⚡ Performance: Replaced heavy MutationObserver with lightweight URL polling
- ⚡ Added debug log level system for cleaner production logs

### v1.3.0 (January 2026)
- 🎵 **TikTok Support**: Extension now works on TikTok in addition to YouTube Shorts
- Platform detection for seamless multi-platform experience
- TikTok "Not Interested" button triggers skip
- Refactored content script with modular platform-specific code

### v1.2.0 (January 2026)
- 👎 **Skip on Dislike**: Automatically skip to next Short when you dislike a video
- New toggle in popup and settings page
- Only triggers on initial dislike (not when un-disliking)
- Works alongside existing auto-skip feature

### v1.1.0 (January 2026)
- 📊 **Skip Counter**: Track total Shorts automatically skipped
- Counter display in popup and settings page
- Reset counter functionality with confirmation
- Locale-aware number formatting

### v1.0.1 (January 2026)
- 🛠️ Fixed auto-skip not working on subsequent Shorts
- 🌐 Added support for non-www and mobile YouTube URLs
- ⌨️ Implemented keyboard navigation fallback

### v1.0.0 (January 2026)
- ✨ Initial release
- 🚀 Auto-skip functionality
- ⚙️ Configurable delay (0-5 seconds)
- 🌓 Dark mode support
- ♿ Full accessibility (WCAG 2.1 AA)

---

## 🔮 Roadmap

Potential features for future versions:

- [ ] Custom keyboard shortcuts
- [ ] Per-channel settings (whitelist/blacklist)
- [ ] Skip intro animations
- [x] ~~TikTok support~~ ✅ Added in v1.3.0
- [x] ~~Skip countdown overlay~~ ✅ Added in v1.4.0
- [ ] Opera-specific optimizations

---

**Enjoy LazyShorts? Leave a ⭐ on [GitHub](#) and a review on the [Chrome Web Store](#)!**

---

*Made with ❤️ by Mellow Solutions*
