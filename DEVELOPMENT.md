# Development Guide

Quick start guide for developers working on Convergent.

## Prerequisites

- **Node.js**: v18+ and npm
- **Obsidian**: v1.10.0+ (for testing)
- **Git**: For version control
- **Code editor**: VS Code recommended (TypeScript support)

## Initial Setup

```bash
# Clone repository
git clone https://github.com/bleshinsky/Convergent.git
cd Convergent

# Install dependencies
npm install

# Build the plugin
npm run build
```

## Development Workflow

### 1. Development Mode (Auto-rebuild)

```bash
npm run dev
```

This watches for file changes and automatically rebuilds. Keep this running while developing.

### 2. Testing in Obsidian

**Option A: Symlink (Recommended)**

```bash
# Create symlink to your test vault
# macOS/Linux:
ln -s "$(pwd)" "/path/to/test-vault/.obsidian/plugins/convergent"

# Windows (PowerShell as Admin):
New-Item -ItemType SymbolicLink -Path "C:\path\to\test-vault\.obsidian\plugins\convergent" -Target "C:\path\to\Convergent"
```

**Option B: Manual Copy**

1. Build the plugin: `npm run build`
2. Create folder: `test-vault/.obsidian/plugins/convergent/`
3. Copy these files:
   - `main.js`
   - `manifest.json`
   - `styles.css`

### 3. Reload Obsidian

After code changes:
1. **Cmd/Ctrl + R** to reload Obsidian
2. Or use **Hot Reload** plugin (community plugin)

## Project Structure

```
src/
├── main.ts              # Plugin entry point
├── settings.ts          # Settings interface
├── settings-tab.ts      # Settings UI
├── types/
│   └── index.ts         # TypeScript interfaces
├── commands/
│   └── issue-commands.ts # Issue-related commands
├── modals/
│   └── issue-modal.ts   # Issue creation modal
├── utils/
│   └── frontmatter.ts   # Frontmatter utilities
├── views/              # Custom views (Kanban, Timeline)
└── automation/         # Automation logic
```

## Development Commands

```bash
# Development mode (watch + rebuild)
npm run dev

# Production build
npm run build

# Type checking
npx tsc --noEmit

# Clean build
rm main.js main.js.map
npm run build
```

## Testing Your Changes

### Manual Testing Checklist

**Week 1 Day 5 - Create Issue**
- [ ] Press Cmd/Ctrl+I → modal opens
- [ ] Enter title → saves correctly
- [ ] Select status → appears in frontmatter
- [ ] Select priority → appears in frontmatter
- [ ] Add description → appears in file body
- [ ] File created in Issues/ folder
- [ ] File opens after creation
- [ ] Frontmatter is valid YAML

**Settings Panel**
- [ ] Open Settings → Convergent appears
- [ ] Change Issues folder → saves on change
- [ ] Change default status → persists
- [ ] Change default priority → persists

**Frontmatter Utilities**
- [ ] Create issue → frontmatter written correctly
- [ ] Query by type → returns correct files
- [ ] Update field → changes persist

## Debugging

### Console Logs

Open Obsidian DevTools:
- **macOS**: Cmd+Option+I
- **Windows/Linux**: Ctrl+Shift+I

Check console for:
```
Loading Convergent plugin
Convergent commands registered
Convergent event handlers registered
Convergent plugin loaded successfully
```

### Common Issues

**Plugin doesn't load**
- Check manifest.json is valid JSON
- Verify minAppVersion matches your Obsidian version
- Check console for error messages

**Commands don't appear**
- Verify plugin is enabled in Community Plugins
- Check command registration in main.ts
- Reload Obsidian (Cmd/Ctrl+R)

**TypeScript errors**
```bash
npx tsc --noEmit
```
Fix all errors before building.

**Build fails**
- Delete node_modules/ and reinstall: `npm install`
- Check esbuild.config.mjs syntax
- Verify all imports are correct

## Code Style

### TypeScript Guidelines

- **Strict mode**: Always use TypeScript strict mode
- **Prefer const**: Use `const` over `let` when possible
- **Types**: Avoid `any`, use proper types from `types/index.ts`
- **JSDoc**: Add comments for public methods
- **Async**: Use async/await, not promises directly

### File Naming

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase`

### Example

```typescript
import { App, Notice, TFile } from 'obsidian';
import { Issue, IssueStatus } from '../types';

export class IssueManager {
	constructor(private app: App) {}

	/**
	 * Create a new issue file
	 */
	async createIssue(title: string, status: IssueStatus): Promise<TFile> {
		// Implementation
	}
}
```

## Git Workflow

### Branching

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, test, commit
git add .
git commit -m "Add feature: description"

# Push to fork
git push origin feature/your-feature-name
```

### Commit Messages

Format: `<type>: <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```
feat: add issue creation modal
fix: frontmatter YAML escaping
docs: update development guide
refactor: extract issue utilities
```

## Week-by-Week Development

### Week 1 (Current)
- ✅ Day 1: Project setup
- ✅ Day 2: TypeScript types
- ✅ Day 3: Frontmatter utilities
- ✅ Day 4: Settings panel
- ✅ Day 5: Create issue command

### Week 2 (Next)
- Day 1: Quick switcher (Cmd+K)
- Day 2: Status changes
- Day 3: Priority changes
- Day 4: Custom properties
- Day 5: Batch operations

### Week 3
- Issue relationships (parent/child, blocking)

### Week 4
- Kanban view (BasesView)

See [Implementation Plan](./01_Projects/Linear-Obsidian-Plugin/04-Implementation-Plan.md) for full roadmap.

## Resources

### Obsidian API
- [Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [API Reference](https://docs.obsidian.md/Reference/TypeScript+API)
- [Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)

### Community
- [Discord](https://discord.gg/obsidianmd)
- [Forum](https://forum.obsidian.md/)
- [GitHub Discussions](https://github.com/bleshinsky/Convergent/discussions)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## Getting Help

1. **Check documentation**: README.md, this file, Planning docs
2. **Search issues**: [GitHub Issues](https://github.com/bleshinsky/Convergent/issues)
3. **Ask in discussions**: [GitHub Discussions](https://github.com/bleshinsky/Convergent/discussions)
4. **Join Discord**: Obsidian Plugin Development channel

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code of conduct
- Pull request process
- License agreement (GPL-3.0 + CLA)
- Recognition for contributors

Happy coding! 🚀
