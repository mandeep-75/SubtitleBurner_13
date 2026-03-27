# Agent Guidelines for SubtitleBurner

## Project Overview

This is a Tauri v2 desktop application with a React + Vite frontend and Rust backend. The app is a video subtitle editor with styling and export capabilities.

## Build Commands

**Do NOT run dev commands** (`npm run dev`, `npm run tauri dev`, `cargo run`) - these start blocking development servers. Use build/check commands to verify code instead.

### Frontend (React + Vite)
```bash
npm run dev          # Start development server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Tauri Backend
```bash
npm run tauri dev    # Start Tauri in development mode
npm run tauri build  # Build Tauri app (generates .app/.exe)
```

### Rust Commands (src-tauri/)
```bash
cargo check          # Check code without building
cargo build          # Build debug binary
cargo build --release # Build optimized binary
cargo test           # Run all tests
```

### Running a Single Test
No test framework is currently configured. To add tests, consider:
- Frontend: Vitest (`npm install -D vitest @vitejs/plugin-react`)
- Rust: Add `#[test]` functions above any function to test it, then run `cargo test function_name`

## Code Style Guidelines

### JavaScript/React

**File Naming:**
- PascalCase for components (e.g., `VideoPanel.jsx`, `ExportModal.jsx`)
- camelCase for hooks/utilities (e.g., `useVideo.js`, `useSubtitles.js`)

**Import Order:**
```javascript
// 1. React imports
import { useState, useCallback, useEffect } from 'react'

// 2. External libraries
import { open, save } from '@tauri-apps/plugin-dialog'

// 3. Internal components
import Header from './components/Header'

// 4. Custom hooks
import { useVideo } from './hooks/useVideo'

// 5. Styles
import './index.css'
```

**Formatting:** 2-space indentation, semicolons at end of statements, use single quotes for strings

**Naming Conventions:**
- `handle*` for event handlers (e.g., `handleImportVideo`)
- `use*` prefix for custom hooks (e.g., `useVideo`)
- `on*` for callback props (e.g., `onPlay`, `onSeek`)
- `is*` or `has*` for boolean state (e.g., `isPlaying`, `hasSubtitles`)

### Rust

**Formatting:** Run `cargo fmt` before commits, 4-space indentation

**Naming:**
- snake_case for variables/functions (e.g., `get_video_info`)
- PascalCase for types (e.g., `VideoInfo`, `SubtitleStyle`)
- SCREAMING_SNAKE_CASE for constants

**Error Handling:** Use `Result<T, String>` for Tauri commands, meaningful error messages with `map_err`

**Imports:** Use absolute paths (`crate::`, `super::`) for internal modules

### General

**Error Handling:**
- Rust: Log with `log::info!`/`log::error!`, return meaningful errors
- JavaScript: Use console.error for errors, try-catch for async operations

**Commits:** Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Architecture

### Frontend Structure
```
src/
├── components/      # React components (Header, Toolbar, VideoPanel, etc.)
├── hooks/          # Custom hooks (useVideo, useSubtitles, useStyling)
├── App.jsx          # Main app component
├── main.jsx         # Entry point
└── index.css        # Global styles
```

### Backend Structure
```
src-tauri/
├── src/
│   ├── lib.rs       # Tauri commands and types (main logic)
│   └── main.rs      # App entry point (calls lib::run())
├── Cargo.toml       # Rust dependencies
└── tauri.conf.json  # Tauri configuration
```

## Key Dependencies

**Frontend:** React 18, @tauri-apps/api (v2), @tauri-apps/plugin-*, Vite 6

**Backend:** Tauri 2, tokio, serde + serde_json, log + env_logger

## Common Tasks

**Adding a Tauri Command:**
1. Define function in `src-tauri/src/lib.rs` with `#[tauri::command]`
2. Use async for commands that need to await
3. Register in invoke_handler in the run() function
4. Call from frontend via `invoke('command_name', { args })`

**Adding a Frontend Component:**
1. Create file in `src/components/`
2. Follow import order and naming conventions
3. Add to parent component in App.jsx

**Adding a Plugin:**
1. Install JS package: `npm add @tauri-apps/plugin-X`
2. Add to Cargo.toml: `tauri-plugin-X = "2"`
3. Register in lib.rs: `.plugin(tauri_plugin_X::init())`

## Testing Guidelines

**Frontend:** Currently no test framework. Recommended: Vitest with React Testing Library

**Backend:**
- Use `#[test]` attribute above functions
- Run single test: `cargo test test_name`

## IDE Setup

- VS Code with Tauri extension and rust-analyzer
- Extensions: tauri-apps.tauri-vscode, rust-lang.rust-analyzer