# Convergent — Claude Code Context

## Project Overview

**Convergent** is an Obsidian community plugin providing Linear-style project management for solo developers. It stores all data as Markdown files with YAML frontmatter in the user's vault, making everything Dataview-compatible and human-readable.

**Repository:** https://github.com/bleshinsky/Convergent
**Current version:** 1.0.0
**License:** GPL-3.0

---

## Architecture

### Data Model

All data is stored as Markdown files with YAML frontmatter.

**Issue** (`src/types/Issue.ts`)
- File location: `{issuesFolder}/ISSUE-{n}.md`
- Key fields: `type: issue`, `id: ISSUE-{n}`, `status`, `priority`, `project` (wikilink), `parent` (wikilink), `subIssues[]`, `blockedBy[]`, `blocks[]`, `related[]`
- Status values: `Backlog | Triage | Todo | In Progress | Done | Canceled`
- Priority values: `No Priority | Low | Medium | High | Urgent`
- Relationships stored as wikilinks: `"[[ISSUE-5]]"` or `"[[My Project]]"`

**Project** (`src/types/Project.ts`)
- File location: `{projectsFolder}/{sanitized-title}.md`
- Key fields: `type: project`, `id: PROJ-{n}`, `status`, `progress` (0-100), `total-issues`, `completed-issues`
- Status values: `Planning | In Progress | On Hold | Completed | Canceled`

**MSPSession** (`src/types/index.ts`)
- File location: `{sessionsFolder}/Session {date}.md`
- R³ Protocol: `route[]` (objectives), `recall` (context), `record` (end-of-session)

**Decision** and **Blocker** — also in `src/types/index.ts`

### Key Utilities

| File | Class | Purpose |
|------|-------|---------|
| `src/utils/frontmatter.ts` | `FrontmatterUtils` | Read/write/validate frontmatter via Obsidian API |
| `src/utils/relationships.ts` | `RelationshipUtils` | Wikilink parsing, cycle detection, bidirectional updates |
| `src/utils/fileOperations.ts` | `FileOperations` | Create/delete issue and project files |
| `src/utils/idGenerator.ts` | `IdGenerator` | Sequential ISSUE-n / PROJ-n ID generation |
| `src/utils/msp.ts` | `MSPUtils` | Session lifecycle, recall context building |
| `src/utils/contextExport.ts` | `ContextExport` | AI context generation (<1000 tokens) |
| `src/utils/viewManager.ts` | `ViewManager` | Save/load view configurations as JSON |

### Commands

All commands are registered via `this.plugin.addCommand(...)`.

| Hotkey | Command | File |
|--------|---------|------|
| `Ctrl+Shift+I` | Create issue | `commands/issue-commands.ts` |
| `Ctrl+Shift+O` | Quick switcher | `commands/switcher-commands.ts` |
| `Ctrl+Shift+S` | Change status | `commands/issue-commands.ts` |
| `Ctrl+Shift+P` | Change priority | `commands/issue-commands.ts` |
| `Ctrl+Shift+E` | Edit properties | `commands/issue-commands.ts` |
| `Ctrl+Shift+N` | Create project | `commands/ProjectCommands.ts` |
| `Ctrl+Shift+Y` | Set parent | `commands/relationship-commands.ts` |
| `Ctrl+Shift+U` | Add child | `commands/relationship-commands.ts` |
| *(no hotkey)* | Start/End session | `commands/MSPCommands.ts` |
| *(no hotkey)* | Log decision (ADR) | `commands/DecisionBlockerCommands.ts` |
| *(no hotkey)* | Log blocker | `commands/DecisionBlockerCommands.ts` |
| *(no hotkey)* | Export context | `commands/MSPCommands.ts` |

### Views

| View Type | Class | File |
|-----------|-------|------|
| `convergent-kanban-view` | `KanbanView` | `views/kanban-view.ts` |
| `convergent-table-view` | `TableView` | `views/table-view.ts` |
| `convergent-timeline-view` | `TimelineView` | `views/timeline-view.ts` |

### Automation

| Class | File | Trigger |
|-------|------|---------|
| `ProgressTracking` | `automation/ProgressTracking.ts` | `vault.on('modify')` debounced 500ms |
| `StatusAutomation` | `automation/StatusAutomation.ts` | `vault.on('modify')` debounced 300ms |
| `RecurringIssues` | `automation/RecurringIssues.ts` | `registerInterval()` every hour |

---

## Development Conventions

### TypeScript
- Strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- All Obsidian API calls through the plugin's `app` object
- No direct DOM manipulation outside Obsidian's API
- Use `TFile` for file references, wikilinks `[[Name]]` for stored relationships

### Frontmatter
- YAML keys use kebab-case for multi-word fields in the actual file (`total-issues`, `start-time`)
- TypeScript interfaces use camelCase (`totalIssues`, `startTime`)
- When updating frontmatter with kebab-case keys, use `app.fileManager.processFrontMatter()` directly

### Adding New Commands
1. Create handler class in `src/commands/YourCommands.ts`
2. Inject `App`, `ConvergentPlugin`, and any utilities needed
3. Implement `registerCommands()` method
4. Instantiate in `src/main.ts` `onload()`
5. Call `this.yourCommands.registerCommands()` in `registerCommands()`

### Adding New Modals
- Extend `Modal` from obsidian
- Use `Setting` components for form fields
- Always implement `onClose()` with `this.contentEl.empty()`
- Auto-focus first field with `setTimeout(() => input.focus(), 10)`

### Adding New Views
- Extend `ItemView` from obsidian
- Export a `VIEW_TYPE` constant
- Register in `main.ts` with `this.registerView()`
- Add activation method `activateXxxView()` and command

---

## Testing

**Run tests:** `npm test`
**Test location:** `tests/unit/`
**Obsidian mock:** `tests/__mocks__/obsidian.ts`

Tests cover: `idGenerator`, `frontmatter`, `recurringIssues`, `progressTracking`, `contextExport`

---

## Build

```bash
npm run build     # type-check + production build
npm run dev       # development build (watch mode)
npm test          # run unit tests
```

Output files: `main.js`, `styles.css` (copy these + `manifest.json` to `.obsidian/plugins/convergent/`)

---

## Settings

All settings are in `src/settings.ts` as `ConvergentSettings`. Key settings:
- `issuesFolder`, `projectsFolder`, `sessionsFolder`, `decisionsFolder`, `blockersFolder`
- `defaultStatus`, `defaultPriority`
- `enableStatusAutomation`, `enableProgressTracking`, `enableRecurringIssues`
- `enableMSP`, `autoStartSession`
- `enableMCP`, `mcpServerUrl`

---

## Known Constraints

1. No automated UI testing for Obsidian views (no headless Obsidian runtime)
2. Frontmatter updates via `processFrontMatter` always add `modified` timestamp
3. `getAllIssues()` / `getAllProjects()` iterate all markdown files — can be slow on very large vaults (>1000 files)
4. Wikilink matching is case-insensitive but exact on filename (no fuzzy)
