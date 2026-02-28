# Convergent

**Linear-style project management for Obsidian — built for solo developers.**

Fast, keyboard-first task management with Kanban boards, timeline views, session tracking, and AI context export. Your tasks live inside your vault alongside your notes — no cloud, no subscriptions.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple)](https://obsidian.md)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![Tests](https://img.shields.io/badge/tests-48%20passing-brightgreen)

---

## Features

### Issue Management
- **Create issues** with `Ctrl+Shift+I` — title, status, priority, project, description
- **6 status values:** Backlog → Triage → Todo → In Progress → Done → Canceled
- **5 priority levels:** No Priority, Low, Medium, High, Urgent
- **Quick Switcher** (`Ctrl+Shift+O`) — fuzzy search with status/priority filters
- **Batch operations** — multi-select + bulk status/priority/delete
- **Properties editor** (`Ctrl+Shift+E`) — labels, due date, estimate

### Relationship System
- **5 relationship types:** parent, child, blocks, blocked-by, related
- **Wikilink-based storage** — fully compatible with Obsidian's graph and Dataview
- **Cycle detection** — prevents circular parent chains
- **Bidirectional updates** — link one side, both sides update automatically

### Project Management
- **Create projects** with `Ctrl+Shift+N`
- **Issue → Project linking** via wikilinks in the issue creation modal
- **Progress auto-calculation** — project progress updates automatically as issues change

### Views
| View | How to Open | Description |
|------|------------|-------------|
| **Kanban Board** | Ribbon icon or command | 6 columns, drag-and-drop status changes |
| **Table View** | Ribbon icon or command | Sortable/filterable table, CSV/JSON export |
| **Timeline** | Ribbon icon or command | Gantt-style view by due date, 3 zoom levels |

### MSP Session Tracking (R³ Protocol)
The Minimum Sustainable Pace (MSP) system helps you maintain context across coding sessions:

- **Route** — Start a session with your objectives for the day
- **Recall** — See last session's objectives, recently completed work, and active blockers
- **Record** — End the session with progress notes and duration tracking

Commands: `Start session (MSP)` → `End session (MSP)`

### Decisions & Blockers
- **Log decision (ADR)** — Architecture Decision Records with rationale, alternatives, consequences
- **Log blocker** — Blockers with impact level, description, workaround

### AI Context Export
- **Export context to clipboard** — generates structured context targeting <1000 tokens
- Includes: active session objectives, In Progress issues (priority-sorted), active blockers, recent completions
- **Memory flag** — mark key issues to always include them in context exports

### Automation
- **Progress tracking** — project progress recalculates automatically (debounced 500ms)
- **Status automation** — parent issues auto-complete when all children are Done
- **Recurring issues** — create issues on daily/weekly/biweekly/monthly cadences

---

## Installation

### From GitHub Releases (Recommended)
1. Download `convergent-1.0.0.zip` from [Releases](https://github.com/bleshinsky/Convergent/releases)
2. Extract to your vault's `.obsidian/plugins/convergent/` folder
3. Reload Obsidian (or restart)
4. Enable **Convergent** in Settings → Community Plugins

### From Community Plugins
Search for **Convergent** in Obsidian's Community Plugins browser (pending review).

### Manual Build
```bash
git clone https://github.com/bleshinsky/Convergent.git
cd Convergent
npm install
npm run build
# Copy main.js, styles.css, manifest.json to your vault's plugins folder
```

---

## Quick Start

1. **Install and enable** the plugin
2. Press `Ctrl+Shift+I` to create your first issue
3. Press `Ctrl+Shift+O` to search and navigate issues
4. Click the dashboard icon in the ribbon to open the Kanban board
5. Use the command palette to start an MSP session when you begin work

---

## Commands Reference

| Command | Hotkey | Description |
|---------|--------|-------------|
| Create issue | `Ctrl+Shift+I` | Open issue creation modal |
| Quick switcher | `Ctrl+Shift+O` | Fuzzy-search all issues |
| Change status | `Ctrl+Shift+S` | Change status of current issue |
| Change priority | `Ctrl+Shift+P` | Change priority of current issue |
| Edit properties | `Ctrl+Shift+E` | Edit labels, due date, estimate |
| Create project | `Ctrl+Shift+N` | Open project creation modal |
| Set parent issue | `Ctrl+Shift+Y` | Link a parent issue |
| Add child issue | `Ctrl+Shift+U` | Link a child issue |
| Open Kanban board | — | Open the Kanban view |
| Open issue table | — | Open the Table view |
| Open timeline | — | Open the Timeline view |
| Start session (MSP) | — | Begin an MSP work session |
| End session (MSP) | — | Close the current session |
| Export context | — | Copy AI context to clipboard |
| Log decision (ADR) | — | Log an architecture decision |
| Log blocker | — | Log a blocking issue |
| Toggle memory flag | — | Mark issue for context export |
| Recalculate all project progress | — | Force-refresh all project stats |

---

## Configuration

Open Settings → Convergent to configure:

**Folder Locations** — where to store Issues, Projects, Sessions, Decisions, Blockers files

**Issue Defaults** — default status and priority for new issues

**Automation**
- Status automation (auto-complete parents)
- Progress tracking (auto-update project %)
- Recurring issues (hourly background check)

**MSP** — Enable session tracking, auto-start sessions on Obsidian launch

**MCP Integration** — Optional HTTP push to a Model Context Protocol server

---

## Data Model

All data is stored as Markdown with YAML frontmatter — fully human-readable and compatible with Dataview, Obsidian Graph, and Bases.

**Issue example:**
```yaml
---
type: issue
id: ISSUE-42
title: Build the authentication flow
status: In Progress
priority: High
project: "[[Project Alpha]]"
parent: "[[ISSUE-40]]"
sub-issues:
  - "[[ISSUE-43]]"
  - "[[ISSUE-44]]"
blocks:
  - "[[ISSUE-50]]"
labels:
  - backend
  - auth
due: 2025-03-01
estimate: 4
created: 2025-01-15T09:00:00.000Z
modified: 2025-02-01T14:30:00.000Z
---

## Description

Implement JWT-based authentication...
```

**Project example:**
```yaml
---
type: project
id: PROJ-3
title: Project Alpha
status: In Progress
lead: me
created: 2025-01-01
target: 2025-06-01
progress: 35
total-issues: 20
completed-issues: 7
---
```

---

## Development

```bash
npm install        # install dependencies
npm run build      # type-check + production build
npm run dev        # watch mode (development)
npm test           # run unit tests (48 tests)
npm run test:coverage  # run tests with coverage report
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development conventions.

---

## Contributing

Bug reports and feature requests welcome via [GitHub Issues](https://github.com/bleshinsky/Convergent/issues).

For code contributions, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

GPL-3.0 — See [LICENSE](LICENSE) for details.

Copyright (c) 2025–2026 Boris Leshinsky

The core Convergent plugin is and will always remain free and open source.
