<p align="center">
  <img src="build/icon.png" width="96" alt="MusiClass icon" />
</p>

<h1 align="center">MusiClass</h1>

<p align="center">
  A small desktop library for finding sheet music in physical binders.
</p>

MusiClass records where each score is stored, including its binder and page. Search is immediate, organization is visual, and all data remains on the computer.

## Features

- Fast search by title, composer, instrument, or binder
- Physical binder and page location for every score
- Drag and drop ordering for binders and scores
- PDF and Word list import, with one score per non-empty line and duplicate filtering
- Optional PDF or Word attachments that open in the computer's default application
- Keyboard navigation and native context menus
- French and English interface with automatic locale detection
- Automatic updates from GitHub Releases
- Local storage with no account or required cloud service
- Custom desktop window for Windows and macOS

## Development

Requirements: Node.js 22 or later and npm.

```bash
npm install
npm run dev
```

Create a production web bundle with:

```bash
npm run build
```

## Desktop packages

```bash
npm run dist:win
npm run dist:mac
```

Windows packages must be built on Windows. macOS packages must be built on macOS.

### macOS signing

Public macOS releases are signed with a Developer ID Application certificate, use the hardened runtime, and are notarized by Apple. Configure these GitHub Actions secrets before running the release workflow:

- `MACOS_CERTIFICATE_BASE64`: Base64-encoded Developer ID Application `.p12` certificate
- `MACOS_CERTIFICATE_PASSWORD`: Password used when exporting the certificate
- `APPLE_API_KEY_BASE64`: Base64-encoded App Store Connect API `.p8` key
- `APPLE_API_KEY_ID`: App Store Connect API key ID
- `APPLE_API_ISSUER`: App Store Connect API issuer ID

When these secrets are available, the workflow verifies the code signature, Gatekeeper assessment, and stapled notarization ticket before uploading the DMG. Without them, it publishes an unsigned build and reports a warning; users must then explicitly allow that build through Gatekeeper.

GitHub Actions publishes both installers when a version tag is pushed:

```bash
git tag v0.2.1
git push origin v0.2.1
```

The release assets use stable names so the download website can always resolve the latest version:

```text
MusiClass.exe
MusiClass.dmg
```

The release also contains a macOS ZIP used internally by the updater. MusiClass checks GitHub Releases after launch and periodically while it is open. Update metadata and blockmaps are published beside each installer. The first upgrade from a build that predates version 0.2.0 must be installed manually.

## Data and privacy

The library and optional attachments are stored locally by Electron. MusiClass does not require an account, analytics, or a remote database.

## Related repository

The download website lives at [imlouak/web-musiclass](https://github.com/imlouak/web-musiclass).

## License

Copyright (c) 2026 Xutron. MusiClass is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE).
