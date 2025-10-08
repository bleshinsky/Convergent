# Convergent

**Context-aware project management for Obsidian.**

Fast, keyboard-first task management with multiple views, session tracking, and AI context export. Built for solo developers who want their tasks integrated with their knowledge.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple)](https://obsidian.md)
![Status: In Development](https://img.shields.io/badge/Status-In%20Development-yellow)

---

## ✨ Features

- **⚡ Fast Issue Creation** - `Cmd/Ctrl+I` to create tasks in seconds
- **📊 Multiple Views** - Kanban boards, tables, and timeline roadmaps
- **🧠 Context Engineering** - Track sessions, decisions, and blockers
- **🔗 Knowledge Integration** - Tasks live alongside your notes
- **💾 Local-First** - 100% markdown, no cloud, no subscriptions
- **🤖 AI-Ready** - Export structured context for coding assistants

## Why Convergent?

Most project management tools live in separate apps, forcing constant context-switching. **Convergent lives in your vault**, connecting your tasks with your knowledge graph.

Perfect for solo developers who value:
- 🚀 **Speed over ceremony** - Keyboard shortcuts for everything
- 🏠 **Local data over cloud services** - Your vault, your data
- 🔗 **Integration over isolation** - Tasks + notes in one place
- 🎯 **Context over chaos** - AI-ready session tracking

## 🎯 Project Status

**Current Phase:** Foundation (Week 1-2)
- [x] Repository initialized
- [x] Project planning complete
- [ ] TypeScript setup
- [ ] Obsidian Bases integration
- [ ] Data models

**Target:** MVP release in Week 6 (Beta testing)

See [Implementation Plan](docs/04-Implementation-Plan.md) for complete roadmap.

## 📋 Roadmap

### Phase 1: Foundation (Weeks 1-2) - *In Progress*
- Plugin skeleton & TypeScript setup
- Data models (Issue, Project, Session)
- Obsidian Bases integration
- Basic file operations

### Phase 2: Core Features (Weeks 3-6)
- Issue management (CRUD)
- Kanban board with drag-drop
- Table view with filtering
- Project creation & linking
- **MVP Beta Release**

### Phase 3: Context Engineering (Weeks 7-10)
- Session tracking (Route-Recall-Record)
- Decision documentation
- Blocker logging
- AI context export
- Graph visualization (Juggl integration)

### Phase 4: Polish & Release (Weeks 11-12)
- Timeline/roadmap view
- Recurring tasks
- Bulk operations
- Documentation
- **Community Plugin Submission**

## 🏗️ Architecture

**Built on:**
- **Obsidian Bases** - Native database views
- **Frontmatter + Wikilinks** - Markdown-native data model
- **Dataview** - Powerful queries
- **Juggl** - Graph visualization (optional)

**Data Model:**
```yaml
# vault/Issues/ISSUE-123.md
---
type: issue
status: In Progress
priority: High
project: "[[Project Alpha]]"
blocked-by: ["[[ISSUE-120]]"]
labels: [bug, frontend]
session: "[[Session 2025-10-08]]"
progress: 65
---

## Description
[Markdown content with full formatting]
```

## 📚 Documentation

- [Discovery Analysis](docs/01-Discovery-Analysis.md) - Feature analysis & feasibility
- [Technical Architecture](docs/02-Technical-Architecture.md) - Plugin design & data models
- [Requirements Specification](docs/03-Software-Requirements-Specification.md) - Complete SRS
- [Implementation Plan](docs/04-Implementation-Plan.md) - 12-week development roadmap
- [Executive Summary](docs/00-Executive-Summary.md) - Project overview

## 🤝 Contributing

Convergent is in early development. Contributions are welcome!

### How to Contribute

1. **Beta Testing** - Sign up for Week 6 MVP testing (coming soon)
2. **Feature Requests** - Open an issue with your ideas
3. **Bug Reports** - Help us improve quality
4. **Code Contributions** - See [CONTRIBUTING.md](CONTRIBUTING.md)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/bleshinsky/Convergent.git
cd Convergent

# Install dependencies
npm install

# Build the plugin
npm run build

# Development mode (watch for changes)
npm run dev
```

By contributing, you agree that your contributions will be licensed under GPL-3.0 and that the project maintainer retains the right to use your contributions in future offerings while keeping the core plugin free and open source.

## 📦 Installation

**From Community Plugins** (Coming Soon - Week 12)
1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Convergent"
4. Click Install

**Manual Installation** (Current - For Developers)
1. Download latest release from [Releases](https://github.com/bleshinsky/Convergent/releases)
2. Extract to `.obsidian/plugins/convergent/`
3. Reload Obsidian
4. Enable Convergent in Community Plugins settings

## 🎮 Usage

### Quick Start

1. **Create your first issue:** `Cmd/Ctrl+I`
2. **Open Kanban board:** Command palette → "Convergent: Open Kanban"
3. **Start a session:** Command palette → "Convergent: Start Session"
4. **Export context:** Command palette → "Convergent: Export Context"

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+I` | Create issue |
| `Cmd/Ctrl+Shift+T` | Set status: Todo |
| `Cmd/Ctrl+Shift+P` | Set status: In Progress |
| `Cmd/Ctrl+Shift+D` | Set status: Done |

More shortcuts in [documentation](docs/shortcuts.md) (coming soon).

## 🔮 Future Plans

**Core Plugin (Always Free):**
- ✅ Solo developer features
- ✅ All views (Kanban, Table, Timeline)
- ✅ Session tracking & context export
- ✅ Unlimited issues/projects
- ✅ Local-first, no limits

**Team Features (Future - Separate Service):**
- Real-time collaboration
- Shared workspaces
- Team analytics
- SSO/SAML (enterprise)

The core Convergent plugin will always remain free and open source under GPL-3.0.

## 📄 License

GPL-3.0 - See [LICENSE](LICENSE) for details.

Copyright (c) 2025 Boris Leshinsky

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## 🙏 Acknowledgments

Built with inspiration from the amazing Obsidian plugin ecosystem:

- **Obsidian Team** - Incredible plugin API and Bases system
- **Juggl** (Emile van Krieken) - Graph visualization excellence
- **Dataview** - Powerful query engine
- **Obsidian Community** - Endless inspiration

## 💬 Community & Support

- **Issues:** [GitHub Issues](https://github.com/bleshinsky/Convergent/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bleshinsky/Convergent/discussions)
- **Obsidian Forum:** [Coming Soon]

---

**Status:** 🚧 In Development (Week 1)
**Next Milestone:** MVP Beta (Week 6)
**License:** GPL-3.0 (Free Forever)

Made with ❤️ for the Obsidian community
