# LazyShorts Architecture

## Overview

LazyShorts is a Chrome/Opera browser extension built on **Manifest V3** that automatically advances to the next YouTube Short after the current one finishes playing. The architecture follows a modular, event-driven design with clear separation of concerns.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Popup UI   │         │  Settings UI  │                    │
│  │ (popup.html) │         │(settings.html)│                    │
│  └──────┬───────┘         └───────┬──────┘                    │
│         │                         │                             │
│         │ Read/Write Settings     │                             │
│         ├─────────────────────────┤                             │
│         │                         │                             │
│         ▼                         ▼                             │
│  ┌─────────────────────────────────────────┐                   │
│  │     chrome.storage.sync API             │                   │
│  │  { enabled, delaySeconds, darkMode }    │                   │
│  └──────────────┬──────────────────────────┘                   │
│                 │                                               │
│                 │ Storage Change Events                         │
│                 │                                               │
│                 ▼                                               │
│  ┌─────────────────────────────────────────┐                   │
│  │       Content Script                    │                   │
│  │       (content.js)                      │                   │
│  │                                          │                   │
│  │  • Detect YouTube Shorts URL            │                   │
│  │  • Find video player element            │                   │
│  │  • Listen for 'ended' event             │                   │
│  │  • Find "Next" button                   │                   │
│  │  • Apply delay & click                  │                   │
│  └──────────────┬──────────────────────────┘                   │
│                 │                                               │
│                 │ Injected into                                 │
│                 │                                               │
│                 ▼                                               │
│  ┌─────────────────────────────────────────┐                   │
│  │      YouTube Shorts Page                │                   │
│  │      (www.youtube.com/shorts/*)         │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │     Service Worker                      │                   │
│  │  (background/service-worker.js)         │                   │
│  │                                          │                   │
│  │  • Handle install/update events         │                   │
│  │  • Set default settings                 │                   │
│  │  • Log storage changes (debug)          │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### 1. Manifest (`manifest.json`)

**Purpose**: Extension configuration and permissions

**Key Responsibilities**:
- Define extension metadata (name, version, description)
- Declare permissions (`storage`, `activeTab`)
- Specify host permissions (YouTube.com)
- Configure content script injection points
- Register service worker
- Define popup and settings pages

**Permissions Justification**:
- `storage`: Store user preferences (enabled/disabled, delay, theme)
- `activeTab`: Allow popup to query current tab state
- `*://*.youtube.com/*`: Inject content script only on YouTube

---

### 2. Service Worker (`background/service-worker.js`)

**Purpose**: Background event handling (limited execution time)

**Key Responsibilities**:
- Initialize default settings on first install
- Handle extension updates (future: migration logic)
- Log storage changes for debugging
- Message passing coordination (if needed in future)

**Lifecycle**:
- Wakes up on events (install, update, message)
- Goes dormant after ~30 seconds of inactivity
- Does NOT maintain persistent state (use chrome.storage)

**Event Handlers**:
- `chrome.runtime.onInstalled`: Set defaults on install/update
- `chrome.storage.onChanged`: Log settings changes
- `chrome.runtime.onMessage`: Handle messages (future expansion)

---

### 3. Content Script (`content/content.js`)

**Purpose**: YouTube Shorts auto-skip logic

**Key Responsibilities**:
- Detect when user is on YouTube Shorts page
- Retrieve settings from chrome.storage.sync
- Find video player element (with fallback selectors)
- Attach event listener to video 'ended' event (when enabled)
- Find "Next" button (with fallback selectors)
- Apply user-configured delay
- Click "Next" button to advance to next Short
- Handle errors gracefully (log, don't crash)
- React to settings changes in real-time

**Execution Context**:
- Runs in isolated JavaScript context (injected into YouTube page)
- Has access to YouTube's DOM but NOT YouTube's JavaScript context
- Can access chrome extension APIs (storage, runtime)
- Runs at `document_idle` (after DOM loaded)

**Key Functions**:

```javascript
// Setup auto-skip functionality
async function setupAutoSkip() {
  const settings = await getSettings();
  if (settings.enabled) {
    attachVideoListener();
  } else {
    removeVideoListener();
  }
}

// Handle video end event
function handleVideoEnd() {
  const nextButton = findElement(SELECTORS.nextButton);
  if (nextButton) {
    setTimeout(() => {
      nextButton.click();
    }, settings.delaySeconds * 1000);
  } else {
    console.warn('[LazyShorts] Next button not found');
  }
}

// Find element with fallback selectors
function findElement(selectorArray) {
  for (const selector of selectorArray) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}
```

**Selector Fallback Strategy**:
YouTube may change their DOM structure without notice. To mitigate:
- Maintain array of 3-4 fallback selectors per element
- Try selectors in order of specificity
- Log warning (not error) if element not found
- Gracefully degrade (don't break extension)

---

### 4. Popup UI (`popup/popup.html`, `popup.css`, `popup.js`)

**Purpose**: Quick toggle for auto-skip feature

**Key Responsibilities**:
- Display current auto-skip status (enabled/disabled)
- Toggle auto-skip on/off
- Navigate to settings page
- Open Buy Me a Coffee link
- Display branding ("by Mellow Solutions")

**UI Components**:
- **Toggle switch**: Enable/disable auto-skip
- **Settings button**: Open settings page in new tab
- **Coffee button**: Support developer (Buy Me a Coffee link)
- **Footer**: Branding

**Interactions**:
```javascript
// Load current settings
const settings = await chrome.storage.sync.get(['enabled']);
document.getElementById('enableToggle').checked = settings.enabled;

// Toggle auto-skip
document.getElementById('enableToggle').addEventListener('change', async (e) => {
  await chrome.storage.sync.set({ enabled: e.target.checked });
});

// Open settings
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'settings/settings.html' });
});

// Open Buy Me a Coffee
document.getElementById('coffeeBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://buymeacoffee.com/[YOUR_USERNAME]' });
});
```

---

### 5. Settings Page (`settings/settings.html`, `settings.css`, `settings.js`)

**Purpose**: Full settings configuration

**Key Responsibilities**:
- Enable/disable auto-skip (same as popup)
- Configure delay (0-5 seconds)
- Select dark mode preference (Light / Dark / Auto)
- Reset to defaults
- Apply settings in real-time
- Visual feedback for save operations

**Settings Schema**:
```javascript
{
  enabled: boolean,       // Auto-skip on/off
  delaySeconds: number,   // 0-5 seconds delay before skip
  darkMode: string        // 'light' | 'dark' | 'auto'
}
```

**Validation**:
- `delaySeconds`: Must be number between 0-5
- `darkMode`: Must be one of: 'light', 'dark', 'auto'
- `enabled`: Must be boolean

---

### 6. Settings Utility (`utils/settings.js`)

**Purpose**: Reusable settings persistence module

**Key Functions**:

```javascript
// Get all settings (with defaults fallback)
export async function getSettings() {
  try {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return data;
  } catch (error) {
    console.error('Settings retrieval failed:', error);
    return DEFAULT_SETTINGS;
  }
}

// Update single setting
export async function updateSetting(key, value) {
  validateSetting(key, value);
  await chrome.storage.sync.set({ [key]: value });
}

// Reset to defaults
export async function resetSettings() {
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
}

// Validate setting value
function validateSetting(key, value) {
  if (key === 'delaySeconds') {
    if (typeof value !== 'number' || value < 0 || value > 5) {
      throw new Error('Delay must be between 0-5 seconds');
    }
  }
  // Additional validations...
}
```

**Error Handling**:
- Storage quota exceeded → Alert user
- Invalid values → Throw validation error
- Network failure → Use cached defaults

---

## Data Flow

### Auto-Skip Flow

```
1. User opens YouTube Short
   ↓
2. Content script injected (document_idle)
   ↓
3. Get settings from chrome.storage.sync
   ↓
4. If enabled: Attach 'ended' event listener to video
   ↓
5. User watches Short → Video ends
   ↓
6. 'ended' event fires
   ↓
7. Find "Next" button (with fallback selectors)
   ↓
8. Apply delay (if configured)
   ↓
9. Click "Next" button
   ↓
10. New Short loads → Repeat from step 3
```

### Settings Update Flow

```
1. User changes setting in popup/settings page
   ↓
2. JavaScript updates chrome.storage.sync
   ↓
3. chrome.storage.onChanged event fires
   ↓
4. Content script receives change event
   ↓
5. Content script re-initializes with new settings
   ↓
6. New behavior takes effect immediately
```

---

## Message Passing

Currently, LazyShorts uses **storage-based communication** (no direct message passing). All state is synchronized via `chrome.storage.sync.onChanged`.

**Future expansion**: If coordination between components is needed, use:

```javascript
// From popup/settings → content script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshSettings' });
});

// In content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshSettings') {
    setupAutoSkip();
    sendResponse({ success: true });
  }
});
```

---

## Storage Patterns

### chrome.storage.sync

**Advantages**:
- Syncs across user's devices (if signed into Chrome)
- Persists across browser sessions
- Quota: 100KB total, 8KB per item

**Usage**:
```javascript
// Read
const data = await chrome.storage.sync.get(['enabled', 'delaySeconds']);

// Write
await chrome.storage.sync.set({ enabled: true });

// Listen for changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.enabled) {
    console.log('Enabled changed:', changes.enabled.newValue);
  }
});
```

**Best Practices**:
- Always provide defaults: `chrome.storage.sync.get(DEFAULT_SETTINGS)`
- Validate before saving
- Handle quota exceeded errors
- Use typed values (don't store strings for booleans)

---

## Security Considerations

### Content Security Policy (CSP)

Manifest V3 enforces strict CSP by default:
- No inline scripts (`<script>` tags in HTML)
- No `eval()` or `new Function()`
- No remote script loading

**Compliance**:
- All scripts loaded via `<script src="..."></script>`
- No inline event handlers (`onclick="..."`)
- Use `addEventListener` for events

### Permissions Minimization

**Principle of Least Privilege**:
- Only request necessary permissions
- Use `host_permissions` instead of broad `permissions`
- Limit content script injection to specific URLs

**Current Permissions**:
- ✅ `storage`: Required for settings
- ✅ `activeTab`: Required for popup interaction
- ✅ `*://*.youtube.com/*`: Only YouTube (no other sites)

---

## Performance Considerations

### Memory Usage

**Target**: < 50MB total

**Strategies**:
- Remove event listeners when disabled
- No persistent timers/intervals
- Minimal DOM caching
- Clean up on navigation

### CPU Usage

**Target**: < 5% during auto-skip operation

**Strategies**:
- Debounce settings changes
- Use `requestIdleCallback` for non-critical tasks
- Avoid expensive DOM queries (cache selectors)
- Event delegation for multiple elements

### Network Impact

LazyShorts makes **zero network requests** (fully offline after install).

---

## Error Handling Strategy

### Graceful Degradation

If YouTube DOM changes:
1. Try primary selector
2. Try fallback selectors
3. Log warning (not error)
4. Don't crash extension
5. Continue monitoring for next video

### User-Facing Errors

**Popup/Settings**:
- Storage quota exceeded → Alert user
- Invalid input → Visual feedback (red border)
- Network failure → Use cached values

**Content Script**:
- Element not found → Console warning (dev tools)
- No user-facing error messages (YouTube page shouldn't break)

---

## Future Enhancements

Potential features for v2.0:

1. **Custom delay per Short**: Remember delay for specific channels
2. **Keyboard shortcuts**: Skip on demand (e.g., Ctrl+Shift+N)
3. **Analytics**: Track skipped videos (local only, no telemetry)
4. **Skip first N seconds**: Auto-skip intro ads
5. **Whitelist/Blacklist**: Don't auto-skip certain channels

Architecture is modular enough to support these additions without major refactoring.

---

**Last Updated**: January 2026  
**Architecture Version**: 1.0  
**Maintained by**: Mellow Solutions
