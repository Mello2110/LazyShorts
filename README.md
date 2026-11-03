---
id: "lazyshorts"
title: "LazyShorts"
tagline: "Hands-free auto-advance and intelligent skipping for YouTube Shorts and TikTok."
category: "extension"
status: "production"
featured: false
badge: "Manifest V3"
problemStatement: "Short-form video platforms like YouTube Shorts and TikTok loop videos indefinitely by default, forcing users into continuous manual interaction to proceed. Additionally, navigating past unwanted content or skipping after negative feedback requires repetitive clicks or keyboard inputs. This disrupts hands-free viewing, multitasking, and causes unnecessary interaction fatigue."
technicalSolution: "LazyShorts employs an event-driven Manifest V3 architecture featuring a content script with a dual video-end detection engine and loop-freeze protection. It tracks single-page application (SPA) navigations via chrome.webNavigation and executes safe, multi-tiered DOM scrolling with automatic focus blurring. User interactions such as disliking or selecting 'Not interested' are captured instantly via event delegation to auto-advance playback."
techStack:
  - "JavaScript (ES2022+)"
  - "Chrome Extension Manifest V3"
  - "Chrome Web APIs"
  - "HTML5 Video API"
  - "CSS3 Design System"
architectureHighlights:
  - "Dual-Trigger Video End Engine with Loop-Freeze Protection"
  - "Declarative SPA History State Routing via Background Service Worker"
  - "Safe Multi-Tiered DOM Navigation with Focus Blurring Safeguards"
  - "Zero-Telemetry Architecture with 100% Client-Side Privacy"
links:
  chromeWebStore: "https://chromewebstore.google.com/detail/lazyshorts/hjmljblglniihpkakmmckapbllfjhmbi?authuser=0&hl=de"
  demoUrl: ""
  githubUrl: "https://github.com/Mello2110/LazyShorts"
sandbox:
  enabled: false
  type: "none"
  embedUrl: ""
  notes: "Browser extensions execute in a privileged browser runtime and cannot run inside an iframe sandbox."
stats:
  version: "v1.5.1"
---

# LazyShorts

[![Status](https://img.shields.io/badge/Status-Active-emerald?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](#)
[![Version](https://img.shields.io/badge/Version-v1.5.1-orange?style=flat-square)](#)
[![Manifest](https://img.shields.io/badge/Manifest-V3-purple?style=flat-square)](#)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Available-blue?style=flat-square&logo=googlechrome)](https://chromewebstore.google.com/detail/lazyshorts/hjmljblglniihpkakmmckapbllfjhmbi?authuser=0&hl=de)

> Hands-free auto-advance and intelligent skipping for YouTube Shorts and TikTok.

<!-- QUICK ACCESS / CALL TO ACTION -->
<p align="left">
  <a href="https://chromewebstore.google.com/detail/lazyshorts/hjmljblglniihpkakmmckapbllfjhmbi?authuser=0&hl=de"><b>🛒 Chrome Web Store</b></a> &nbsp;|&nbsp;
  <a href="https://github.com/Mello2110/LazyShorts"><b>📦 GitHub Repository</b></a> &nbsp;|&nbsp;
  <a href="https://github.com/Mello2110"><b>🌐 Mellow Solutions Hub</b></a>
</p>

---

## 📌 Problem & Motivation

Modern short-form video streaming services—predominantly **YouTube Shorts** and **TikTok**—are architected to continuously loop media files indefinitely until the user manually triggers a scroll or swipe gesture. While this loop mechanism benefits platform engagement algorithms, it introduces significant friction in real-world consumption:

1. **Passive & Hands-Free Viewing:** Users exercising, cooking, working, or multitasking cannot easily swipe or press keys every 15–60 seconds.
2. **Negative Feedback Overhead:** Expressing negative user preference (clicking "Dislike", "Not interested", or "Don't recommend channel") still requires an additional manual swipe down to bypass the rejected content.
3. **Accessibility Friction:** Continuous repetitive manual inputs create physical strain for users with motor limitations or accessibility needs.

LazyShorts was designed to eliminate these barriers by automating transitions seamlessly while granting full control through configurable delay buffers and interactive cancel mechanisms.

---

## ⚡ The Solution

LazyShorts operates as an unintrusive, high-performance browser extension built on **Google Chrome's Manifest V3**. Rather than relying on fragile DOM interval polling or heavyweight tree observers, it introduces:

- **Dual-Engine Video Completion Tracking:** Synchronizes standard HTML5 video `ended` event listeners with a high-precision `timeupdate` threshold guard to detect loop boundaries before native platform players restart playback.
- **Event-Delegated Negative Feedback Interception:** Directly hooks into YouTube's action menus (`Not interested`, `Don't recommend channel`) and TikTok's dislike mechanisms without degrading DOM performance.
- **Resilient Multi-Tiered Navigation Pipeline:** Executes programmatic viewport progression via validated container selectors, smooth `scrollIntoView` triggers, and fallback synthetic keyboard dispatching (`ArrowDown`), complete with active element blurring to avoid trapped focus.

---

## 🚀 Key Features

- 🔄 **Autonomous Video Progression:** Seamlessly scrolls to the subsequent Short or TikTok video as soon as the active media finishes.
- 🎯 **Smart Negative Feedback Skipping:** Instantly skips to the next video when clicking Dislike or choosing "Not interested" / "Don't recommend channel" on YouTube and TikTok.
- ⏱️ **Configurable Delay Buffer (0–5s):** Set instant auto-advance (0s) or a customizable delay with quick-preset chips (0s, 1s, 2s, 3s, 5s) directly inside the popup.
- ⏳ **Interactive Countdown Overlay:** Visual countdown HUD with a click-to-cancel pill allowing viewers to pause or abort an impending skip at any moment.
- 🟢 **Live Tab Status Indicator:** Instant real-time status pill in the popup header displaying active detection on YouTube Shorts, TikTok, or standby status.
- ⏩ **Quick Skip Action Button:** Trigger an immediate advance to the next video directly from the extension popup.
- 📊 **Local Skip Analytics:** Built-in counter tracking total skipped clips across sessions without sending a single byte over the wire.
- 🎨 **Modern Adaptive UI:** Full dark, light, and system-preference theme support following YouTube's design tokens and modern CSS variables.
- 🔒 **Zero Telemetry & 100% Privacy:** No external network requests, no trackers, no analytics. All settings persist solely via `chrome.storage.sync`.

---

## 🛠️ Architecture & Tech Stack

### Languages & Frameworks
- **Runtime:** Chrome Extensions Platform (Manifest V3)
- **Scripting:** Pure ECMAScript 2022+ (Modules, Async/Await, Optional Chaining, Event Delegation)
- **Styling:** CSS3 Custom Properties (Design tokens, Flexbox, Grid, High-Contrast accessibility)
- **APIs:** `chrome.storage.sync`, `chrome.scripting`, `chrome.webNavigation`

### Core Architecture

```
LazyShorts/
├── manifest.json              # Manifest V3 specification & permissions
├── background/
│   └── service-worker.js      # SPA lifecycle watcher & dynamic tab script injection
├── content/
│   └── content.js             # Dual video detection engine, navigation pipeline & UI HUD
├── popup/
│   ├── popup.html             # Compact toolbar popup controller
│   ├── popup.css              # Theme-responsive design tokens & interactive chips
│   └── popup.js               # Reactive UI controller & chrome.storage state bridge
├── settings/
│   ├── settings.html          # Detailed options page
│   ├── settings.css           # Full-page responsive settings layout
│   └── settings.js            # Configuration management & metric reset logic
├── styles/
│   └── design-system.css      # Shared CSS variables & typography tokens
└── icons/                     # Optimized extension iconography (16px, 32px, 48px, 128px)
```

- **Background Service Worker (`service-worker.js`):** Monitors single-page application (SPA) client-side history updates via `chrome.webNavigation.onHistoryStateUpdated`. Ensures the content script is consistently active during seamless URL transitions without page refreshes.
- **Content Script (`content.js`):** Implements a defensive singleton pattern (`window.__lazyShorts_initialized`) to eliminate memory leaks and duplicate execution. Video element state transitions and DOM mutations are isolated to target video containers.
- **Safety Navigation Guard:** Explicitly removes ambiguous button selectors to prevent accidental activation of creator "Unfollow" or "Unsubscribe" confirmation modals.

---

## 📦 Installation & Usage

### From Chrome Web Store (Recommended)

1. Open the [LazyShorts Chrome Web Store Page](https://chromewebstore.google.com/detail/lazyshorts/hjmljblglniihpkakmmckapbllfjhmbi?authuser=0&hl=de).
2. Click **"Add to Chrome"** (Hinzufügen) and confirm permissions.
3. Pin the **LazyShorts** icon to your toolbar for immediate access to quick toggles and delay settings.

### Developer Mode (Local Installation)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Mello2110/LazyShorts.git
   cd LazyShorts
   ```
2. Open Google Chrome or any Chromium-based browser (Brave, Edge, Opera, Vivaldi).
3. Navigate to `chrome://extensions/` in the address bar.
4. Enable **"Developer mode"** via the toggle switch in the upper-right corner.
5. Click **"Load unpacked"** and select the root directory (`LazyShorts/`).
6. Pin **LazyShorts** to your browser toolbar for instant access.

### Usage Workflow

1. Navigate to [youtube.com/shorts](https://www.youtube.com/shorts) or [tiktok.com](https://www.tiktok.com).
2. The extension activates automatically (indicated by the green status pill in the popup).
3. Sit back and watch—videos advance automatically when finished or upon negative feedback.
4. Customize delays, themes, or toggle features anytime via the popup or options page.

---

## 📄 License & Disclaimer

Part of the **Mellow Solutions** portfolio. Provided under the [MIT License](LICENSE) as-is for non-commercial and personal utility.
YouTube and TikTok are trademarks of their respective owners; this project is an independent open-source utility and is not affiliated with Google LLC or ByteDance Ltd.
