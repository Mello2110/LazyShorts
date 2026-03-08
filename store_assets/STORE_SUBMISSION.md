# LazyShorts - Chrome Web Store Submission

## Store Listing Details

### Name
LazyShorts - Auto-Skip YouTube Shorts and TikTok

### Short Description (132 chars max)
Automatically skip to the next YouTube Short or TikTok video when the current one ends or when you dislike a video.

### Detailed Description
LazyShorts enhances your YouTube Shorts and TikTok viewing experience by automatically advancing to the next Short when the current one finishes playing.

✨ FEATURES:

🚀 Auto-Skip: Seamlessly advance to the next YouTube Short or TikTok video when the current one ends
👎 Skip on Dislike: Instantly skip to the next Short when you click dislike
⏱️ Configurable Delay: Set a delay (0-5 seconds) before skipping — accessible from popup or settings
⏳ Skip Countdown: Visual "Skipping in 3…2…1…" countdown when delay is active
📊 Skip Counter: Track how many Shorts have been automatically skipped
🔔 Toast Notifications: Visual feedback when changing settings
🌓 Dark Mode: Supports light, dark, and system preference themes
⚡ Lightweight: Minimal performance impact
⚙️ Easy Toggle: Quickly enable/disable from the popup

🔒 PRIVACY FIRST:
- No data collection whatsoever
- 100% offline functionality
- No analytics or tracking
- Your viewing habits stay private

💡 HOW IT WORKS:
1. Install the extension
2. Navigate to YouTube Shorts or TikTok
3. Videos will auto-advance when they finish
4. Click dislike to instantly skip
5. Customize settings via the popup

Perfect for binge-watching Shorts without lifting a finger!

🆕 WHAT'S NEW IN v1.4.0:
- Works immediately on SPA navigation (no refresh needed!)
- Visual countdown overlay when delay is active
- Delay slider right in the popup
- Toast notifications for settings changes
- Light mode fixes for popup and settings
- Performance improvements

---

### Category
Entertainment

### Language
English (also supports German interface)

### Privacy Policy URL
https://mello2110.github.io/lazyshorts-privacy-policy/

---

## Files for Upload

| File | Location | Purpose |
|------|----------|---------|
| Extension ZIP | `LazyShorts_v1.4.0.zip` | Main upload file |
| Promo Tile (Small) | `store_assets/promo_small_440x280.png` | Small promotional tile |
| Promo Tile (Marquee) | `store_assets/promo_marquee_1400x560.png` | Large banner tile |
| Screenshot 1 | `store_assets/screenshot_1_popup.png` | Main popup view |
| Screenshot 2 | `store_assets/screenshot_2_settings.png` | Settings page view |
| Screenshot 3 | `store_assets/screenshot_3_stats.png` | Statistics view |
| Icon 128px | `icons/icon128.png` | Store icon |

---

## Upload Checklist

- [ ] Log into Chrome Web Store Developer Console
- [ ] Create new item or update existing
- [ ] Upload `LazyShorts_v1.4.0.zip`
- [ ] Fill in store listing details (above)
- [ ] Upload promo tile (440x280)
- [ ] Upload at least 1 screenshot (1280x800)
- [ ] Set category to "Entertainment"
- [ ] Add privacy policy URL
- [ ] Submit for review

---

## Notes
- Extension uses Manifest V3
- No external requests/network calls
- All permissions are justified:
  - `storage`: Save user preferences
  - `scripting`: Programmatically inject content script on SPA navigation
  - `webNavigation`: Detect YouTube/TikTok SPA page transitions
  - Host permission `*://*.youtube.com/*`: Run on YouTube
  - Host permission `*://*.tiktok.com/*`: Run on TikTok
