# Project Memory

## Current Situation
- **Phase**: Implementation (Sprint 1 - Core Services)
- **Status**: Starting implementation of PouchDB, FaceAPI, and Camera.
- **Goal**: Enable offline data storage and biometric capabilities.

## Technical Understanding
- **PouchDB**: Needs a singleton wrapper to handle database instances (local & remote).
- **FaceAPI**: Models must be loaded from `public/models`. `TinyFaceDetector` is prioritized for mobile.
- **Camera**: React component wrapping `navigator.mediaDevices.getUserMedia`.

## Recent Decisions
- Successfully initialized project with Vite + React + TS + Tailwind v4.
- Fixed PostCSS conflict by using `@tailwindcss/vite`.
- Removed unused `React` import to fix build.

## Known Pitfalls
- **FaceAPI Models**: Ensure model files are physically present in `public/models`.
- **Camera Permissions**: Browser requires HTTPS or localhost.
