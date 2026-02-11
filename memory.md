# Project Memory

## Current Situation
- **Phase**: Implementation (Sprint 1)
- **Status**: Initializing Project Scaffolding.
- **Goal**: Set up Vite + React + TypeScript + PouchDB + FaceAPI.

## Technical Understanding
- **Architecture**: Validated offline-first stack (PouchDB/CouchDB).
- **Frontend**: React (Vite) + Tailwind CSS.
- **AI**: face-api.js (Tiny Face Detector for mobile).

## Recent Decisions
- Refactored PRD into modular files (`docs/`).
- Proceeding with standard Vite + React + TS template.
- Using PouchDB for local-first data persistence.

## Known Pitfalls
- **FaceAPI Models**: Need to be loaded from `public/models` folder.
- **PouchDB Sync**: Verify CORS on CouchDB (future step).
- **Mobile Camera**: Ensure HTTPS locally or use localhost for testing camera permissions.
