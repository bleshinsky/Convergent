# Changelog

All notable changes to Convergent are documented in this file.

## [1.0.0] — 2026-02-28

### Added

**Project Management**
- Project creation modal and commands (`Ctrl+Shift+N`)
- Project selector in issue creation modal — link issues to projects via wikilinks
- `Open linked project` command to jump from an issue to its project file

**Automation**
- **Progress tracking** — automatically recalculates project `progress`, `total-issues`, and `completed-issues` when issue statuses change (debounced 500ms)
- **Status automation** — automatically marks parent issues Done when all children are Done (with loop detection to prevent cascading cycles)
- **Recurring issues** — create recurring issues from templates (daily/weekly/biweekly/monthly cadences), checked hourly in the background

**MSP Session Tracking (R³ Protocol)**
- `Start session` command — opens Route modal for capturing session objectives, optionally linked to a project; shows Recall context from previous session
- `End session` command — Record phase with progress notes and duration calculation
- Status bar indicator: shows "🔴 Session active" while a session is running
- Session files created automatically in configured Sessions folder

**Decisions & Blockers**
- `Log decision (ADR)` command — captures Architecture Decision Records with title, status, rationale, alternatives, and consequences
- `Log blocker` command — captures blockers with title, impact level, description, and workaround
- Files created in configured Decisions/Blockers folders

**Context Export**
- `Export context to clipboard (MSP)` command — generates AI-optimized project context targeting <1000 tokens
- Includes active session objectives, In Progress issues (priority-sorted), active blockers, recent completions, and Memory-flagged items
- `Toggle memory flag` command — mark an issue as a persistent context item always included in exports

**Timeline View**
- Gantt-style timeline view showing issues with due dates as horizontal bars
- Three zoom levels: Week (2 weeks), Month (2 months), Quarter (3 months)
- Navigation controls and "Today" button
- Color coding: overdue (red), due soon (yellow), priority badges
- Auto-refresh on file changes

**Saved Views**
- `ViewManager` utility for saving and loading filter/sort/grouping presets as JSON
- Export and import view configurations for backup/sharing

**Test Infrastructure**
- 48 unit tests across 5 test suites (Jest + ts-jest)
- Obsidian API mock for testing utilities without Obsidian runtime
- CI via GitHub Actions (build + test on every push)

**CI/CD**
- `.github/workflows/build.yml` — type-check, test, and build on every push
- `.github/workflows/release.yml` — automated releases on version tag push

**Developer Experience**
- `CLAUDE.md` — project context file for AI-assisted development sessions
- `versions.json` — plugin version compatibility mapping

### Changed

- Status values updated: `'In Review'` → `'Triage'` (in issue creation modal and settings)
- Priority values updated: `'No Priority'` added as the first/default priority option
- Default priority changed from `'Medium'` to `'No Priority'`
- Settings expanded: automation toggles (status automation, progress tracking, recurring issues)
- Status bar now shows session state instead of static "Convergent ready"
- Timeline ribbon icon added alongside Kanban and Table icons

### Fixed

- Issue creation modal had stale `'In Review'` status option (now correctly `'Triage'`)
- Issue creation modal was missing `'No Priority'` in the priority dropdown

---

## [0.1.0] — 2025-10-13

### Added

**Foundation (Week 1)**
- Plugin skeleton with TypeScript strict mode and esbuild
- Core type system: Issue, Project, Session, Decision, Blocker
- Frontmatter utilities: read, write, validate, type-check
- Settings panel with folder configuration, defaults, MSP/MCP toggles
- Create Issue command (`Ctrl+Shift+I`) with modal

**Core Issue Management (Week 2)**
- Quick Switcher (`Ctrl+Shift+O`) with fuzzy search, status/priority filters, recent issues
- Status change command (`Ctrl+Shift+S`)
- Priority change command (`Ctrl+Shift+P`)
- Properties editor (`Ctrl+Shift+E`) for labels, due date, and estimate
- Multi-select mode with batch status/priority/delete operations

**Relationship System (Week 3)**
- 5 relationship types: parent, child, blocks, blocked-by, related
- Wikilink-based relationship storage
- Recursive cycle detection for parent chains
- Bidirectional link updates (automatic)
- Relationship modal with fuzzy search
- Relationship indicators in Quick Switcher and Properties modal

**Kanban Board (Week 4)**
- Full Kanban view with 6 columns (Backlog → Canceled)
- HTML5 drag-and-drop with automatic status updates
- Rich cards: priority icons, relationship indicators, labels, due-date warnings
- Filtering (search, priority, show/hide canceled)
- Keyboard shortcuts (`Cmd+F`, `Cmd+R`, `Cmd+Shift+C`)
- Auto-refresh on file changes (500ms debounced)

**Table View (Week 5)**
- Full sortable/filterable table with 8 configurable columns
- Multi-level sorting (up to 3 levels with Shift+Click)
- Advanced filtering (11 operators, 8 properties, AND/OR logic)
- Debounced search with recursive text highlighting
- Pagination (25/50/100/All)
- CSV and JSON export
- Mobile responsive (3 breakpoints) + ARIA accessibility

**Data Layer (Week 6)**
- New type system: `Issue.ts`, `Project.ts` with wikilink-based relationships
- Sequential ID generation (`ISSUE-n`, `PROJ-n`)
- File operations utility for creating/deleting entities
- Enhanced frontmatter validation
