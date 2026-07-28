# KomeFlow – Live Comment Overlay

KomeFlow displays YouTube live chat and chat replay comments directly over the video. Comments can flow from right to left or remain fixed on screen.

> KomeFlow is independently developed and is not affiliated with, endorsed by, or sponsored by Google LLC or YouTube.

## Features

- Flowing, left-fixed, and center-fixed comment modes
- Adjustable comment count, font size, speed, display area, outline, and opacity
- Optional DVR time-shift synchronization for comments collected while a live stream is open
- Local-only settings and DVR buffer
- Japanese, English, Korean, Simplified Chinese, and Traditional Chinese interfaces
- YouTube single-page navigation and fullscreen-compatible overlay

## Privacy

KomeFlow does not operate a developer server and does not sell or transmit user data to the developer or third parties.

The optional DVR feature stores video IDs, chat text, message IDs, Super Chat status, playback positions, and reception timestamps in extension-scoped IndexedDB. It is disabled by default and requires explicit consent. The buffer is capped at 50,000 records; records older than six hours are removed when the buffer is next accessed. Users can disable DVR and delete the buffer from the popup.

See [PRIVACY.md](PRIVACY.md) for the complete policy.

## Local installation

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository directory.
5. Reload an existing YouTube tab after reloading the extension.

## Build the release package

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package.ps1
```

The Chrome Web Store ZIP is written to `release/`. Store listing graphics are in `store-assets/`.

## Supported pages

- `https://www.youtube.com/watch*`
- `https://www.youtube.com/live/*`
- YouTube live chat and chat replay frames used by those pages

## Support

Report bugs and request features through the repository’s [GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues).

## License

Copyright © 2026 ojoko. All rights reserved. Copying, modification, redistribution, resale, and creation of derivative works are prohibited without prior written permission. See [LICENSE](LICENSE).
