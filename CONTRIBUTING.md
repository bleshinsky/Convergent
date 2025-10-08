# Contributing to Convergent

Thank you for your interest in contributing to Convergent! This document provides guidelines and information for contributors.

## Code of Conduct

Be kind, respectful, and constructive. We're building this for the Obsidian community.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/bleshinsky/Convergent/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Obsidian version and OS
   - Screenshots if applicable

### Suggesting Features

1. Check [Discussions](https://github.com/bleshinsky/Convergent/discussions) for similar ideas
2. Create a new discussion with:
   - Clear use case description
   - Why this feature would be valuable
   - How it should work
   - Alternative approaches considered

### Contributing Code

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed
4. **Test your changes**
   - Build the plugin: `npm run build`
   - Test in a test vault (not your main vault!)
   - Verify no console errors
5. **Commit your changes**
   ```bash
   git commit -m "Add feature: description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request**
   - Clear title and description
   - Reference any related issues
   - Include screenshots/videos if UI changes

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Obsidian (for testing)
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/Convergent.git
cd Convergent

# Install dependencies
npm install

# Build the plugin
npm run build

# Development mode (auto-rebuild on changes)
npm run dev
```

### Testing in Obsidian

1. Create a test vault (or use an existing one)
2. Create the plugins folder: `.obsidian/plugins/convergent/`
3. Copy these files to that folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. Reload Obsidian
5. Enable Convergent in Community Plugins settings

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public methods
- Avoid `any` type when possible

### File Organization

```
src/
├── main.ts              # Plugin entry point
├── settings.ts          # Settings interface
├── settings-tab.ts      # Settings UI
├── types/              # TypeScript interfaces
├── commands/           # Command implementations
├── views/              # Custom views (Kanban, Timeline)
├── modals/             # Modal dialogs
├── utils/              # Utility functions
└── automation/         # Automation logic
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase`

## License Agreement

By contributing to Convergent, you agree that:

1. Your contributions will be licensed under **GPL-3.0-or-later**
2. The project maintainer (Boris Leshinsky) retains the right to dual-license this code
3. You grant the maintainer a perpetual license to use your contributions in both:
   - The free, open-source Convergent plugin (GPL-3.0)
   - Future commercial offerings (if any)

This allows us to keep the core plugin free forever while potentially offering team features as a separate paid service in the future.

## What to Work On

### Good First Issues

Look for issues labeled `good-first-issue` - these are beginner-friendly tasks.

### Current Priorities (Week 1)

- TypeScript type improvements
- Frontmatter utility functions
- Documentation improvements
- Test vault examples

### Future Priorities

- Kanban view (Week 4)
- Timeline view (Week 11)
- Recurring tasks (Week 11)
- Mobile optimization (Week 12)

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/bleshinsky/Convergent/discussions)
- **Bugs**: [GitHub Issues](https://github.com/bleshinsky/Convergent/issues)
- **Development help**: Comment on relevant issue or discussion

## Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Added to GitHub contributors page

Thank you for helping make Convergent better! 🙏
