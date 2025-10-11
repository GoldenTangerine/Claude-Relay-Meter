# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Relay Meter is a VSCode extension (中文项目) that monitors Claude Relay Service usage statistics and displays them in the VSCode status bar. The extension fetches usage data from a relay service API and provides real-time monitoring with color-coded visual feedback based on usage thresholds.

## Development Commands

### Build and Development
```bash
npm install              # Install dependencies
npm run compile          # Compile TypeScript to JavaScript
npm run watch            # Watch mode for development
npm run lint             # Run ESLint on TypeScript files
npm run package          # Package extension as .vsix file
```

### Publishing
The extension is published as a `.vsix` file. After making changes:
1. Update version in `package.json`
2. Run `npm run compile` to build
3. Run `npm run package` to create the `.vsix`
4. The packaged file appears in `builds/` directory

## Architecture

### Core Components

**Extension Lifecycle ([src/extension.ts](src/extension.ts))**
- Entry point managing activation/deactivation
- Registers commands: `refreshStats` and `openSettings`
- Manages timer-based auto-refresh with window focus awareness
- Handles configuration changes and re-initialization
- Configuration namespace: `relayMeter.*`

**API Service ([src/services/api.ts](src/services/api.ts))**
- Communicates with Claude Relay Service backend
- Endpoints:
  - User stats: `POST {apiUrl}/apiStats/api/user-stats` with body `{ "apiId": "..." }`
  - API Key to ID conversion: `POST {apiUrl}/api/get-key-id` with body `{ "apiKey": "..." }`
- Implements retry logic with exponential backoff (3 retries, starting at 1s delay)
- Validates API URL format (must be valid HTTP/HTTPS) and API ID (must be UUID)
- Supports API Key authentication: if apiId is empty but apiKey exists, automatically fetches apiId via API
- 10-second timeout on all requests

**Status Bar Handler ([src/handlers/statusBar.ts](src/handlers/statusBar.ts))**
- Creates and updates status bar item (right side, priority 100)
- Main display format: `$(graph) $used/$limit percentage%`
- Generates rich Markdown tooltips showing:
  - Daily cost limit stats
  - Total cost limit stats
  - Opus model weekly cost stats
  - Total requests/tokens
- Supports multiple states: loading, error, config prompt, normal display

**Type Definitions ([src/interfaces/types.ts](src/interfaces/types.ts))**
- `RelayApiResponse`: Root API response structure
- `RelayUserData`: User account data with usage, limits, permissions
- `LimitsData`: All cost/rate limits (daily, total, weekly Opus)
- `StatusBarConfig`: Extension configuration interface (includes apiId and apiKey)
- `ApiKeyResponse`: Response interface for API Key to ID conversion
- `CostStats`: Computed statistics for display

### Utilities

**Logger ([src/utils/logger.ts](src/utils/logger.ts))**
- Output channel: "Claude Relay Meter"
- Respects `relayMeter.enableLogging` setting (errors always logged)
- Auto-shows output panel on errors
- All log calls use format: `[Category] message`

**Formatter ([src/utils/formatter.ts](src/utils/formatter.ts))**
- `formatNumber()`: Up to 4 decimals, trailing zeros removed
- `formatPercentage()`: Up to 2 decimals, clamped to 0-100
- `formatCost()`: Adds `$` prefix
- All formatting ensures clean display without unnecessary precision

**Color Helper ([src/utils/colorHelper.ts](src/utils/colorHelper.ts))**
- Maps usage percentage to colors based on configurable thresholds
- Default: <50% green, 50-80% yellow, >80% red/orange
- Reads from `relayMeter.colorThresholds` and `relayMeter.customColors`
- Can be disabled via `relayMeter.enableStatusBarColors`

## Configuration Structure

All settings under `relayMeter.*` namespace:

**Required:**
- `apiUrl`: Base URL of relay service (e.g., `https://example.com`)
- `apiId` OR `apiKey`: Must provide one of these two options
  - `apiId`: UUID format API identifier (e.g., `12345678-1234-1234-1234-123456789abc`)
  - `apiKey`: API Key string (e.g., `cr_abcd1234efgh5678`)
  - **Priority**: When both `apiId` and `apiKey` exist, `apiId` takes precedence
  - **Auto-conversion**: If only `apiKey` is provided, it's automatically converted to `apiId` via API call

**Optional:**
- `refreshInterval`: Update frequency in seconds (min: 10, default: 60)
- `enableStatusBarColors`: Color-coded status bar (default: true)
- `colorThresholds`: `{ low: number, medium: number }` (default: 50, 80)
- `customColors`: `{ low: string, medium: string, high: string }` (hex colors)
- `enableLogging`: Detailed logging (default: true)

## Key Behaviors

### Auto-refresh Logic
- Timer-based refresh runs at configured interval
- Only updates when window has focus (tracked via `onDidChangeWindowState`)
- Timer restarts on configuration changes
- Manual refresh available via status bar click or command palette

### Error Handling
- API failures show error status in status bar with alert icon
- Displays user-facing error messages with "Retry" and "Open Settings" actions
- Invalid/missing config shows warning status with gear icon
- First-time users see friendly configuration prompt

### Window Focus Management
- Extension tracks window focus state
- Refreshes data when window regains focus
- Timer continues in background (doesn't pause on blur)

## Important Implementation Details

1. **Command Registration**: Commands are registered in `extension.ts` under the `claude-relay-meter.*` namespace. The settings command uses the publisher name in the search query.

2. **Status Bar Command**: Clicking the status bar executes `refreshStats` command by default, but switches to `openSettings` when config is invalid.

3. **Retry Strategy**: API requests use exponential backoff (1s → 2s → 4s) for up to 3 attempts before failing.

4. **Percentage Clamping**: All percentage calculations are clamped to 0-100 range to prevent display issues.

5. **Tooltip Links**: Tooltips use VSCode command URIs (`command:claude-relay-meter.openSettings`) for interactive actions.

6. **Publisher Placeholder**: The `package.json` contains `your-publisher-name` placeholder that should be updated before publishing.

## File Organization

```
src/
├── extension.ts              # Main entry point
├── services/
│   └── api.ts               # API communication
├── handlers/
│   └── statusBar.ts         # Status bar management
├── interfaces/
│   └── types.ts             # TypeScript interfaces
└── utils/
    ├── logger.ts            # Logging utilities
    ├── formatter.ts         # Number/text formatting
    └── colorHelper.ts       # Color computation
```

## Language and Documentation

This is primarily a Chinese-language project. All user-facing strings (status bar text, error messages, tooltips, settings descriptions) are in Chinese. Code comments and documentation use Chinese. Keep this consistency when adding features.
