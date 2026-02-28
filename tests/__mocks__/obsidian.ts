/**
 * Mock Obsidian API for Jest unit tests.
 * Only the parts used by utilities are mocked here.
 */

export class TFile {
	path: string;
	basename: string;
	name: string;
	extension: string;
	stat: { mtime: number; ctime: number; size: number };
	parent: TFolder | null;

	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1];
		this.basename = this.name.replace(/\.md$/, '');
		this.extension = 'md';
		this.stat = { mtime: Date.now(), ctime: Date.now(), size: 100 };
		this.parent = null;
	}
}

export class TFolder {
	path: string;
	name: string;
	children: (TFile | TFolder)[];
	parent: TFolder | null;

	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1];
		this.children = [];
		this.parent = null;
	}
}

export class Notice {
	constructor(public message: string, public timeout?: number) {}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement('div');
	}

	open() {}
	close() {}
	onOpen() {}
	onClose() {}
}

export class Plugin {
	app: App;
	constructor(app: App, manifest: any) {
		this.app = app;
	}
	loadData() { return Promise.resolve({}); }
	saveData(data: any) { return Promise.resolve(); }
	addCommand(command: any) {}
	addRibbonIcon(icon: string, title: string, cb: () => void) { return document.createElement('div'); }
	addStatusBarItem() { return document.createElement('div'); }
	addSettingTab(tab: any) {}
	registerView(type: string, cb: any) {}
	registerEvent(event: any) {}
	registerInterval(id: number) {}
}

export class ItemView {
	app: App;
	leaf: any;
	containerEl: HTMLElement;

	constructor(leaf: any) {
		this.leaf = leaf;
		this.app = leaf?.app || {};
		this.containerEl = document.createElement('div');
	}

	getViewType() { return ''; }
	getDisplayText() { return ''; }
	getIcon() { return ''; }
	registerEvent(event: any) {}
	onOpen() { return Promise.resolve(); }
	onClose() { return Promise.resolve(); }
}

export class SuggestModal<T> {
	app: App;
	constructor(app: App) {
		this.app = app;
	}
	setPlaceholder(placeholder: string) { return this; }
	getSuggestions(query: string): T[] { return []; }
	renderSuggestion(item: T, el: HTMLElement) {}
	onChooseSuggestion(item: T, evt: MouseEvent) {}
	open() {}
	close() {}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement('div');
	}

	display() {}
}

export class Setting {
	constructor(container: HTMLElement) {}
	setName(name: string) { return this; }
	setDesc(desc: string) { return this; }
	addText(cb: (text: any) => any) { return this; }
	addTextArea(cb: (text: any) => any) { return this; }
	addDropdown(cb: (dropdown: any) => any) { return this; }
	addToggle(cb: (toggle: any) => any) { return this; }
	addButton(cb: (btn: any) => any) { return this; }
}

export function normalizePath(path: string) {
	return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export class App {
	vault: MockVault;
	metadataCache: MockMetadataCache;
	workspace: MockWorkspace;
	fileManager: MockFileManager;

	constructor() {
		this.vault = new MockVault();
		this.metadataCache = new MockMetadataCache();
		this.workspace = new MockWorkspace();
		this.fileManager = new MockFileManager();
	}
}

export class MockVault {
	private files: Map<string, { file: TFile; content: string; frontmatter: Record<string, unknown> }> = new Map();

	create(path: string, content: string) {
		const file = new TFile(path);
		this.files.set(path, { file, content, frontmatter: {} });
		return Promise.resolve(file);
	}

	modify(file: TFile, content: string) {
		const entry = this.files.get(file.path);
		if (entry) entry.content = content;
		return Promise.resolve();
	}

	read(file: TFile) {
		return Promise.resolve(this.files.get(file.path)?.content || '');
	}

	getAbstractFileByPath(path: string) {
		return this.files.get(path)?.file || null;
	}

	getFiles(): TFile[] {
		return Array.from(this.files.values()).map(e => e.file);
	}

	getMarkdownFiles(): TFile[] {
		return this.getFiles().filter(f => f.extension === 'md');
	}

	createFolder(path: string) {
		return Promise.resolve();
	}

	trash(file: TFile, system: boolean) {
		this.files.delete(file.path);
		return Promise.resolve();
	}

	on(event: string, cb: (...args: any[]) => any) {
		return { event, cb };
	}

	// Test helper: add a file with frontmatter
	_addFile(path: string, frontmatter: Record<string, unknown>, content = '') {
		const file = new TFile(path);
		this.files.set(path, { file, content, frontmatter });
		return file;
	}

	_getFrontmatter(path: string) {
		return this.files.get(path)?.frontmatter || null;
	}
}

export class MockMetadataCache {
	private cache: Map<string, { frontmatter: Record<string, unknown> }> = new Map();

	getFileCache(file: TFile) {
		return this.cache.get(file.path) || null;
	}

	// Test helper
	_setFrontmatter(file: TFile, frontmatter: Record<string, unknown>) {
		this.cache.set(file.path, { frontmatter });
	}

	on(event: string, cb: (...args: any[]) => any) {
		return { event, cb };
	}
}

export class MockWorkspace {
	getActiveFile() { return null; }
	getLeavesOfType(type: string) { return []; }
	getRightLeaf(create: boolean) { return null; }
	revealLeaf(leaf: any) {}
	getLeaf() {
		return {
			openFile: (file: TFile) => Promise.resolve(),
			setViewState: (state: any) => Promise.resolve()
		};
	}
	on(event: string, cb: (...args: any[]) => any) {
		return { event, cb };
	}
}

export class MockFileManager {
	processFrontMatter(file: TFile, cb: (fm: Record<string, unknown>) => void) {
		const fm: Record<string, unknown> = {};
		cb(fm);
		return Promise.resolve();
	}
}
