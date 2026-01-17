# Privacy Policy Update - LazyShorts v1.3.0

## Version Update
- Previous: v1.2.0
- New: v1.3.0

## New Permission Added

### host_permissions
**ADDED**: `*://*.tiktok.com/*`

**Reason**: The extension now supports TikTok in addition to YouTube Shorts. This permission allows the content script to run on TikTok pages to provide the same auto-skip functionality.

## Current Permissions Summary (v1.3.0)

| Permission | Purpose |
|------------|---------|
| `storage` | Store user settings (enabled/disabled, delay, theme, skip counter, skipOnDislike) |
| `*://*.youtube.com/*` | Run auto-skip script on YouTube Shorts pages |
| `*://*.tiktok.com/*` | **NEW** - Run auto-skip script on TikTok pages |

## Data Collection
No changes - the extension still does NOT collect any user data.

## Key Points for Privacy Policy

1. **New Platform Support**: Extension now works on TikTok (tiktok.com) in addition to YouTube Shorts
2. **Same Functionality**: The same features (auto-skip on video end, skip on dislike/not-interested) apply to both platforms
3. **Same Settings**: User preferences are shared across both platforms
4. **No Additional Data**: No new data types are collected or stored
5. **Skip Counter**: The existing skip counter now tracks skips from both YouTube and TikTok (combined total)

## Suggested Privacy Policy Text Updates

### Permissions Section
Replace:
> `*://*.youtube.com/*` - Access YouTube Shorts pages for auto-skip functionality

With:
> `*://*.youtube.com/*` - Access YouTube Shorts pages for auto-skip functionality
> `*://*.tiktok.com/*` - Access TikTok pages for auto-skip functionality

### Description Section
Replace any mention of "YouTube Shorts" only with "YouTube Shorts and TikTok" where appropriate.
