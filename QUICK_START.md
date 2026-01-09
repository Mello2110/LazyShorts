# LazyShorts Extension - Quick Start Guide

## 🚀 Installation & Testing

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `LazyShorts` folder
5. Extension icon should appear in your toolbar ✅

### 2. Test Auto-Skip Functionality

1. Navigate to any YouTube Short: `https://www.youtube.com/shorts/[video-id]`
2. Let the video play to completion
3. Extension should automatically skip to next Short
4. Check browser console (F12) for `[LazyShorts]` logs

### 3. Test UI

**Popup**:
- Click extension icon → popup opens
- Toggle switch → enables/disables auto-skip
- Settings button → opens settings page
- Coffee button → opens Buy Me a Coffee page

**Settings Page**:
- Right-click extension icon → "Options"
- Adjust delay slider (0-5 seconds)
- Change theme (Light/Dark/Auto)
- Click "Reset to Defaults" → confirmation dialog

### 4. Verify Settings Persistence

1. Change settings (e.g., delay to 3s, theme to dark)
2. Close browser completely
3. Reopen browser
4. Check settings retained ✅

## ✅ All URLs Updated

- Buy Me a Coffee: `https://buymeacoffee.com/mellowsolutions`
- Mellow Solutions: `https://mello2110.github.io/LandingpageMellowSolutions/`

## 📋 Pre-Deployment Checklist

- [x] All code implemented
- [x] URLs updated with real links
- [x] Icons generated
- [x] Documentation complete
- [ ] Manual testing (see above)
- [ ] Chrome Web Store submission

## 🐛 Troubleshooting

**Auto-skip not working?**
- Check console for errors
- Verify you're on `/shorts/` URL
- Ensure toggle is enabled

**Settings not saving?**
- Check console for storage errors
- Verify chrome.storage permission

## 📞 Support

- **Website**: https://mello2110.github.io/LandingpageMellowSolutions/
- **Support**: https://buymeacoffee.com/mellowsolutions

---

**Ready to test!** 🎉
