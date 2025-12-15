# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Relay Meter is a multilingual VSCode extension that monitors Claude Relay Service usage statistics and displays them in the VSCode status bar. The extension fetches usage data from a relay service API and provides real-time monitoring with color-coded visual feedback based on usage thresholds.

**Supported Languages:** Chinese (中文) and English, with full i18n support.

## Development Commands

### Build and Development
```bash
npm install              # Install dependencies
npm run compile          # Compile TypeScript + copy locale files to out/
                         # This command runs both tsc compilation and copy-locales script
                         # Locale files from src/locales/*.json are copied to out/locales/
npm run copy-locales     # Copy locale JSON files to out/locales/ (standalone)
npm run watch            # Watch mode for development (TypeScript only)
npm run lint             # Run ESLint on TypeScript files
npm run package          # Package extension as .vsix file
```

### Publishing
The extension is published as a `.vsix` file. After making changes:
1. Update version in `package.json`
2. Run `npm run compile` to build
3. Run `npm run package` to create the `.vsix`
4. The packaged file appears in `builds/` directory

### Debugging
To debug the extension in VSCode:
1. Open the project in VSCode
2. Press `F5` to launch a new Extension Development Host window
3. The extension will be loaded in the new window with debugging enabled
4. Set breakpoints in TypeScript files under `src/`
5. View debug output in the "Claude Relay Meter" output channel

## Architecture

### Core Components

**Extension Lifecycle ([src/extension.ts](src/extension.ts))**
- Entry point managing activation/deactivation
- Critical initialization order (see Important Implementation Details #1):
  1. First: `initializeLogging()` - Must be called before any log statements
  2. Second: `initializeI18n()` - Required before any translation calls
- Registers commands: `refreshStats`, `openSettings`, `selectLanguage`, `openWebDashboard`, `reloadClaudeConfig`, and `manualReloadConfig`
  - `openWebDashboard`: Opens the web dashboard in browser at `{apiUrl}/admin-next/api-stats?apiId={apiId}`
  - `reloadClaudeConfig`: Manually reloads configuration from `~/.claude/settings.json` and updates VSCode settings
  - `manualReloadConfig`: Triggered from tooltip button, prompts user to choose between new and current config
- Manages timer-based auto-refresh with window focus awareness
- Handles configuration changes (including language switching) and re-initialization
- Auto-initializes config from Claude Settings if VSCode settings are empty
- Configuration namespace: `relayMeter.*`

**API Service ([src/services/api.ts](src/services/api.ts))**
- Communicates with Claude Relay Service backend
- Endpoints:
  - User stats: `POST {apiUrl}/apiStats/api/user-stats` with body `{ "apiId": "..." }`
  - API Key to ID conversion: `POST {apiUrl}/apiStats/api/get-key-id` with body `{ "apiKey": "..." }`
- Implements retry logic with exponential backoff (3 retries, starting at 1s delay)
- Validates API URL format (must be valid HTTP/HTTPS) and API ID (must be UUID)
- Supports API Key authentication: if apiId is empty but apiKey exists, automatically fetches apiId via API
- 10-second timeout on all requests

**API Response Format**

The `/api/user-stats` endpoint returns comprehensive usage and limit information. See [src/interfaces/types.ts](src/interfaces/types.ts) for TypeScript interface definitions.

Example response:
```json
{
  "success": true,
  "data": {
    "id": "21add92a-cb42-122b4-a154-c1e11cde451f",
    "name": "100🔪",
    "description": "",
    "isActive": true,
    "createdAt": "2025-09-29T11:24:19.439Z",
    "expiresAt": "",
    "expirationMode": "fixed",
    "isActivated": true,
    "activationDays": 0,
    "activatedAt": "2025-09-29T11:24:19.439Z",
    "permissions": "all",
    "usage": {
      "total": {
        "tokens": 186438255,
        "inputTokens": 12641884,
        "outputTokens": 1475459,
        "cacheCreateTokens": 18789029,
        "cacheReadTokens": 153531883,
        "allTokens": 186438255,
        "requests": 4262,
        "cost": 160.34903145,
        "formattedCost": "$160.35"
      }
    },
    "limits": {
      "tokenLimit": 0,
      "concurrencyLimit": 0,
      "rateLimitWindow": 0,
      "rateLimitRequests": 0,
      "rateLimitCost": 0,
      "dailyCostLimit": 100,
      "totalCostLimit": 0,
      "weeklyOpusCostLimit": 500,
      "currentWindowRequests": 0,
      "currentWindowTokens": 0,
      "currentWindowCost": 0,
      "currentDailyCost": 0,
      "currentTotalCost": 160.34903145,
      "weeklyOpusCost": 0,
      "windowStartTime": null,
      "windowEndTime": null,
      "windowRemainingSeconds": null
    },
    "accounts": {
      "claudeAccountId": null,
      "geminiAccountId": null,
      "openaiAccountId": null,
      "details": null
    },
    "restrictions": {
      "enableModelRestriction": false,
      "restrictedModels": [],
      "enableClientRestriction": false,
      "allowedClients": []
    }
  }
}
```

**Key Fields:**
- `success`: Boolean indicating request success status
- `data.usage.total`: Comprehensive token and cost statistics
  - `tokens`: Total tokens (sum of all token types)
  - `inputTokens`: User input tokens
  - `outputTokens`: Model output tokens
  - `cacheCreateTokens`: Tokens used to create cache
  - `cacheReadTokens`: Tokens read from cache
  - `requests`: Total API requests count
  - `cost`: Actual cost in USD (unformatted)
  - `formattedCost`: Formatted cost string with currency symbol
- `data.limits`: Cost and rate limits with current usage
  - `dailyCostLimit`: Maximum daily spending (0 = unlimited)
  - `totalCostLimit`: Maximum total spending (0 = unlimited)
  - `weeklyOpusCostLimit`: Weekly spending limit for Opus model
  - `currentDailyCost`: Current day's spending
  - `currentTotalCost`: Total cumulative spending
  - `weeklyOpusCost`: Current week's Opus model spending
  - `rateLimitCost`: Rate limit window spending limit (0 = no window limit)
  - `currentWindowCost`: Current spending in the rate limit window
  - `windowRemainingSeconds`: Seconds until the rate limit window resets (null = no active window)
- `data.accounts`: Associated AI service account IDs
- `data.restrictions`: Model and client access control rules

**Status Bar Handler ([src/handlers/statusBar.ts](src/handlers/statusBar.ts))**
- Creates and updates status bar item (right side, priority 100)
- Main display formats:
  - Without rate limit window: `$(graph) $used/$limit percentage%`
  - With rate limit window: `$(graph) Daily:$X/$Y Z% | Window:$A/$B C%`
  - Rate limit window is detected when `currentWindowCost > 0 && rateLimitCost > 0`
- Generates rich Markdown tooltips showing:
  - Daily cost limit stats
  - Total cost limit stats
  - Rate limit stats (Opus model weekly cost + rate limit window)
  - Window reset time (displayed independently when `windowRemainingSeconds > 0`)
  - Total requests/tokens
- Supports multiple states: loading, error, config prompt, normal display

**Type Definitions**
- [src/interfaces/types.ts](src/interfaces/types.ts): API and configuration types
  - `RelayApiResponse`: Root API response structure
  - `RelayUserData`: User account data with usage, limits, permissions
  - `LimitsData`: All cost/rate limits (daily, total, weekly Opus, rate limit window)
  - `StatusBarConfig`: Extension configuration interface (includes apiId and apiKey)
  - `ApiKeyResponse`: Response interface for API Key to ID conversion
  - `CostStats`: Computed statistics for display (used, limit, percentage, formatted values)
- [src/interfaces/i18n.ts](src/interfaces/i18n.ts): Internationalization types
  - `LanguagePack`: Complete language pack interface structure

### Configuration Management System

**Config Manager ([src/utils/configManager.ts](src/utils/configManager.ts))**
- Manages configuration sources with simple VSCode settings-based approach
- **Core Functions**:
  - `hasConfig()`: Check if any configuration exists (apiUrl + apiKey/apiId)
  - `getVSCodeConfig()`: Get current config from VSCode settings
  - `updateVSCodeConfig()`: Update VSCode settings with new apiKey and apiUrl
  - `compareConfigs()`: Compare two configurations for changes (returns true if identical)
  - `maskApiKey()`: Mask API key for display (e.g., `cr_b7a7***b1eb`)
  - `isWatchEnabled()`: Check if Claude Settings file watching is enabled
  - `setWatchEnabled()`: Enable/disable file watching feature
- **Configuration Storage**: All settings are stored in VSCode workspace configuration under `relayMeter.*` namespace
- **Auto-initialization**: Extension automatically reads from `~/.claude/settings.json` and populates VSCode settings if they are empty on first activation

**Claude Settings Watcher ([src/utils/claudeSettingsWatcher.ts](src/utils/claudeSettingsWatcher.ts))**
- Continuously monitors `~/.claude/settings.json` for changes using `fs.watch()`
- **Debounce**: 300ms delay to avoid excessive triggers during file edits
- **Change Detection Logic**:
  1. When file changes, reads new configuration from Claude Settings
  2. Compares with current VSCode configuration
  3. If identical, silently ignores
  4. If different, immediately prompts user with comparison dialog
- **User Interaction**:
  - Shows current config vs new config with masked API keys
  - Three options: "Use New Config", "Keep Current Config", "Settings"
  - Non-modal dialog allows user to continue working
- **State Management**:
  - "Use New Config": Updates VSCode settings with new config, shows success notification, refreshes data
  - "Keep Current Config" or dismissing dialog: **Disables file watching** to prevent future interruptions
  - "Settings": Opens VSCode settings page for manual configuration
- **Lifecycle**:
  - Auto-starts when extension activates if `relayMeter.watchClaudeSettings` is enabled (default: true)
  - Auto-stops when user chooses "Keep Current Config" (disables the setting)
  - Can be re-enabled manually in settings
  - Properly cleaned up on extension deactivation
  - Handles file system errors gracefully with user-facing error messages

**Configuration Change Flow**:
```
~/.claude/settings.json changes
  ↓
File watcher detects change (debounced 300ms)
  ↓
Read new configuration
  ↓
Compare with current VSCode config
  ↓
Same? → Skip, no prompt
Different? → Prompt user immediately
  ↓
User chooses:
  - Use New Config → Update VSCode settings, refresh data
  - Keep Current / Close Dialog → Disable watching, stop bothering user
  - Settings → Open settings page
```

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
- `formatLargeNumber()`: Converts large numbers to K/M/B units (e.g., 4042 → "4K", 171659455 → "171.7M")
  - Used for displaying request counts and token numbers in tooltips
  - Numbers < 1000 display as-is, >= 1000 use appropriate unit suffix
  - Decimal precision: 2 decimals for values < 10, 1 decimal for values >= 10
- `formatRemainingTime()`: Converts seconds to human-readable time format with i18n support
  - Chinese: "1天2小时3分4秒" (no separator)
  - English: "1d 2h 3m 4s" (space separator)
  - Returns "已过期"/"Expired" for non-positive values
- `formatExpiryDate()`: Formats account expiration date with countdown
  - Parses ISO 8601 date strings (e.g., "2025-09-29T11:24:19.439Z")
  - Returns formatted date with remaining time: "2025/09/29 11:24:19 (120天 后过期)"
  - Returns "永久有效"/"Permanent" for empty/invalid dates
  - Shows "(已过期)"/"(Expired)" for past dates
- All formatting ensures clean display without unnecessary precision

**Color Helper ([src/utils/colorHelper.ts](src/utils/colorHelper.ts))**
- Maps usage percentage to colors based on configurable thresholds
- Default: <50% green, 50-80% yellow, >80% red/orange
- Reads from `relayMeter.colorThresholds` and `relayMeter.customColors`
- Can be disabled via `relayMeter.enableStatusBarColors`

**Internationalization ([src/utils/i18n.ts](src/utils/i18n.ts))**
- Manages multilingual support for the extension
- Loads language packs from `src/locales/*.json`
- Provides `t(key, params)` function for translations with parameter substitution
- Supports automatic fallback to Chinese if translation missing
- Monitors `relayMeter.language` setting changes for real-time language switching
- Callback system notifies other components when language changes

**Claude Settings Reader ([src/utils/claudeSettingsReader.ts](src/utils/claudeSettingsReader.ts))**
- Reads configuration from Claude Code's `~/.claude/settings.json` file
- Extracts `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_BASE_URL` from settings
- Automatically normalizes API URL by removing `/api` suffix (case-insensitive)
- Provides `readClaudeSettings()` function that returns `{ apiKey?, apiUrl? }`
- Cross-platform compatible (Windows/macOS/Linux) using `os.homedir()`
- Graceful error handling for missing files or invalid JSON

## Configuration Structure

All settings under `relayMeter.*` namespace:

**Required:**
- `apiUrl`: Base URL of relay service (e.g., `https://example.com`)
- `apiId` OR `apiKey`: Must provide one of these two options
  - `apiId`: UUID format API identifier (e.g., `12345678-1234-1234-1234-123456789abc`)
  - `apiKey`: API Key string (e.g., `cr_abcd1234efgh5678`)
  - **Priority**: When both `apiId` and `apiKey` exist, `apiId` takes precedence
  - **Auto-conversion**: If only `apiKey` is provided, it's automatically converted to `apiId` via API call

**Auto-Configuration from Claude Code Settings:**
- If `apiUrl` or `apiId`/`apiKey` are not manually configured, the extension automatically reads them from `~/.claude/settings.json` on first activation
- This file is used by Claude Code and contains `ANTHROPIC_AUTH_TOKEN` (maps to `apiKey`) and `ANTHROPIC_BASE_URL` (maps to `apiUrl`)
- The extension automatically removes the `/api` suffix from `ANTHROPIC_BASE_URL` if present (case-insensitive)
- **Configuration Storage**: All configuration is stored in VSCode workspace settings under `relayMeter.*` namespace
- **Change Detection**: Extension can monitor `~/.claude/settings.json` for changes (controlled by `watchClaudeSettings` setting)
  - When changes detected, compares with current VSCode settings
  - Only prompts if configuration is different
  - User can choose to use new config, keep current, or open settings
  - Choosing "Keep Current" automatically disables watching to prevent interruptions
- **File Watching Lifecycle**:
  - Starts automatically on activation if `relayMeter.watchClaudeSettings` is true (default)
  - Can be manually toggled via settings
  - Stops when user declines config update
  - Handles file system errors and missing files gracefully
- Example Claude Code settings.json:
  ```json
  {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "cr_b7a7f660529396e18d7a8805510dd3da9eaba1f8403d8c8a2803b123b889b1eb",
      "ANTHROPIC_BASE_URL": "https://hk1.pincc.ai/api"
    }
  }
  ```
- The extension will use: `apiKey = "cr_b7a7..."` and `apiUrl = "https://hk1.pincc.ai"` (note: `/api` removed)

**Optional:**
- `refreshInterval`: Update frequency in seconds (min: 10, default: 60)
- `enableStatusBarColors`: Color-coded status bar (default: true)
- `colorThresholds`: `{ low: number, medium: number }` (default: 50, 80)
- `customColors`: `{ low: string, medium: string, high: string }` (hex colors)
- `enableLogging`: Detailed logging (default: true)
- `showErrorNotifications`: Show error popups and auto-open output panel (default: true)
- `language`: Interface language - `"zh"` (Chinese, default) or `"en"` (English)
- `watchClaudeSettings`: Enable auto-detection of Claude Settings changes (default: true)

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

1. **Initialization Order**: Extension activation must follow a strict initialization sequence:
   - First: `initializeLogging()` - Must be called before any log statements
   - Second: `initializeI18n()` - Required before any translation calls
   - This order is critical and explicitly documented in the code with warnings

2. **Command Registration**: Commands are registered in `extension.ts` under the `claude-relay-meter.*` namespace. The settings command uses the publisher name in the search query.

3. **Status Bar Command**: Clicking the status bar executes `refreshStats` command by default, but switches to `openSettings` when config is invalid.

4. **Retry Strategy**: API requests use exponential backoff (1s → 2s → 4s) for up to 3 attempts before failing.

5. **Percentage Clamping**: All percentage calculations are clamped to 0-100 range to prevent display issues.

6. **Tooltip Links**: Tooltips use VSCode command URIs (`command:claude-relay-meter.openSettings`) for interactive actions.

7. **Status Bar Reload Button**: A separate reload button (`$(sync)` icon) is displayed next to the main status bar item. Clicking it triggers `reloadClaudeConfig` command to manually sync from Claude Settings.

8. **File Watching Error Handling**: The Claude Settings file watcher includes comprehensive error handling for missing files, permission issues, and runtime errors. All errors are shown to users with clear messages.

## File Organization

```
src/
├── extension.ts              # Main entry point
├── locales/                  # Language pack files
│   ├── zh.json              # Chinese translations
│   └── en.json              # English translations
├── services/
│   └── api.ts               # API communication
├── handlers/
│   └── statusBar.ts         # Status bar management
├── interfaces/
│   ├── types.ts             # Core TypeScript interfaces (including RuntimeConfig)
│   └── i18n.ts              # Internationalization interfaces
└── utils/
    ├── logger.ts            # Logging utilities
    ├── formatter.ts         # Number/text formatting
    ├── colorHelper.ts       # Color computation
    ├── i18n.ts              # Internationalization system
    ├── configManager.ts     # Configuration management (manual/runtime/skipped)
    ├── claudeSettingsWatcher.ts  # File watcher for ~/.claude/settings.json
    └── claudeSettingsReader.ts   # Claude Code settings reader
```

## Internationalization (i18n)

### Supported Languages

- **Chinese (中文)**: Default language, complete translations
- **English**: Full UI translation available

### Language Pack Structure

Language packs are JSON files in `src/locales/` with the following structure:
- `statusBar`: Status bar text (loading, errors, configuration prompts, daily/window labels)
- `commands`: Command names and messages
- `notifications`: User notification messages
- `tooltips`: Hover tooltip content (including rate limit and reset time labels)
- `errors`: Error messages
- `logs`: Development/debug log messages
- `api`: API-related messages
- `settings`: Configuration descriptions
- `time`: Time unit labels (days, hours, minutes, seconds, separator, expired)

### Adding New Languages

1. Create `src/locales/{code}.json` (e.g., `ja.json` for Japanese)
2. Copy structure from `zh.json` or `en.json`
3. Translate all strings
4. Update `supportedLanguages` array in `src/utils/i18n.ts`
5. Add to `language` enum in `package.json`

### Using Translations in Code

```typescript
import { t } from './utils/i18n';

// Simple translation
const message = t('statusBar.loading');

// Translation with parameters
const error = t('errors.apiError', { message: errorMsg });

// Nested keys
const tooltip = t('tooltips.dailyCostLimit');
```

### Translation Keys Best Practices

- Use dot notation for nested keys: `category.subcategory.key`
- Keep keys descriptive and semantic
- Always provide fallback to Chinese if translation missing
- Use parameters `{paramName}` for dynamic content

## Code Comments and Documentation

Code comments use Chinese. External documentation (README, CLAUDE.md) uses English. User-facing strings support both languages through the i18n system.
